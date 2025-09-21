import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto, CounterOfferDto, RespondToOfferDto, NegotiationMessageDto } from './dto/create-offer.dto';

@Injectable()
export class OfferService {
  constructor(private prisma: PrismaService) {}

  async createOffer(retailerId: string, createOfferDto: CreateOfferDto) {
    // Verify the listing exists and is available
    const listing = await this.prisma.cropListing.findUnique({
      where: { id: createOfferDto.listingId }
    });

    if (!listing) {
      throw new NotFoundException('Crop listing not found');
    }

    if (listing.status !== 'OPEN') {
      throw new BadRequestException('This listing is no longer available for offers');
    }

    if (listing.farmerId === retailerId) {
      throw new BadRequestException('You cannot make an offer on your own listing');
    }

    // Check if retailer already has a pending offer for this listing
    const existingOffer = await this.prisma.offer.findFirst({
      where: {
        retailerId,
        listingId: createOfferDto.listingId,
        status: { in: ['PENDING', 'COUNTERED'] }
      }
    });

    if (existingOffer) {
      throw new BadRequestException('You already have a pending offer for this listing');
    }

    // Create the offer
    const offer = await this.prisma.offer.create({
      data: {
        retailerId,
        listingId: createOfferDto.listingId,
        pricePerKg: createOfferDto.pricePerKg,
        quantityKg: createOfferDto.quantityKg,
        message: createOfferDto.message,
        expiresAt: createOfferDto.expiresAt,
        status: 'PENDING'
      },
      include: {
        listing: {
          select: {
            id: true,
            cropType: true,
            farmerId: true,
            expectedPrice: true
          }
        }
      }
    });

    // Create initial negotiation record
    await this.prisma.negotiation.create({
      data: {
        offerId: offer.id,
        fromUserId: retailerId,
        toUserId: listing.farmerId,
        type: 'COUNTER_OFFER',
        pricePerKg: createOfferDto.pricePerKg,
        quantityKg: createOfferDto.quantityKg,
        message: createOfferDto.message || 'Initial offer'
      }
    });

    return offer;
  }

  async respondToOffer(farmerId: string, offerId: string, respondDto: RespondToOfferDto) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        listing: true,
        negotiations: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.listing.farmerId !== farmerId) {
      throw new ForbiddenException('You can only respond to offers on your own listings');
    }

    if (!['PENDING', 'COUNTERED'].includes(offer.status)) {
      throw new BadRequestException('This offer cannot be modified');
    }

    // Check if offer has expired
    if (offer.expiresAt && new Date() > offer.expiresAt) {
      await this.prisma.offer.update({
        where: { id: offerId },
        data: { status: 'EXPIRED' }
      });
      throw new BadRequestException('This offer has expired');
    }

    return this.prisma.$transaction(async (tx) => {
      let newStatus: string;
      let negotiationType: string;
      let newPricePerKg = offer.pricePerKg;
      let newQuantityKg = offer.quantityKg;

      switch (respondDto.action) {
        case 'ACCEPT':
          newStatus = 'ACCEPTED';
          negotiationType = 'ACCEPT';
          // Update listing status to matched
          await tx.cropListing.update({
            where: { id: offer.listingId },
            data: { status: 'MATCHED' }
          });
          break;

        case 'REJECT':
          newStatus = 'REJECTED';
          negotiationType = 'REJECT';
          break;

        case 'COUNTER':
          newStatus = 'COUNTERED';
          negotiationType = 'COUNTER_OFFER';
          newPricePerKg = respondDto.pricePerKg || offer.pricePerKg;
          newQuantityKg = respondDto.quantityKg || offer.quantityKg;
          break;

        default:
          throw new BadRequestException('Invalid action');
      }

      // Update offer
      const updatedOffer = await tx.offer.update({
        where: { id: offerId },
        data: {
          status: newStatus,
          pricePerKg: newPricePerKg,
          quantityKg: newQuantityKg
        },
        include: {
          listing: true
        }
      });

      // Create negotiation record
      await tx.negotiation.create({
        data: {
          offerId,
          fromUserId: farmerId,
          toUserId: offer.retailerId,
          type: negotiationType,
          pricePerKg: respondDto.action === 'COUNTER' ? newPricePerKg : null,
          quantityKg: respondDto.action === 'COUNTER' ? newQuantityKg : null,
          message: respondDto.message
        }
      });

      return updatedOffer;
    });
  }

  async counterOffer(retailerId: string, offerId: string, counterDto: CounterOfferDto) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        listing: true
      }
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.retailerId !== retailerId) {
      throw new ForbiddenException('You can only counter your own offers');
    }

    if (offer.status !== 'COUNTERED') {
      throw new BadRequestException('This offer cannot be countered');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update offer with new terms
      const updatedOffer = await tx.offer.update({
        where: { id: offerId },
        data: {
          pricePerKg: counterDto.pricePerKg || offer.pricePerKg,
          quantityKg: counterDto.quantityKg || offer.quantityKg,
          status: 'PENDING' // Back to pending for farmer response
        },
        include: {
          listing: true
        }
      });

      // Create negotiation record
      await tx.negotiation.create({
        data: {
          offerId,
          fromUserId: retailerId,
          toUserId: offer.listing.farmerId,
          type: 'COUNTER_OFFER',
          pricePerKg: counterDto.pricePerKg,
          quantityKg: counterDto.quantityKg,
          message: counterDto.message
        }
      });

      return updatedOffer;
    });
  }

  async sendNegotiationMessage(userId: string, offerId: string, messageDto: NegotiationMessageDto) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        listing: true
      }
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    // Check if user is part of this negotiation
    const isRetailer = offer.retailerId === userId;
    const isFarmer = offer.listing.farmerId === userId;

    if (!isRetailer && !isFarmer) {
      throw new ForbiddenException('You are not part of this negotiation');
    }

    const toUserId = isRetailer ? offer.listing.farmerId : offer.retailerId;

    return this.prisma.negotiation.create({
      data: {
        offerId,
        fromUserId: userId,
        toUserId,
        type: 'MESSAGE',
        message: messageDto.message
      }
    });
  }

  async getOfferDetails(userId: string, offerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        listing: {
          select: {
            id: true,
            cropType: true,
            quantityKg: true,
            expectedPrice: true,
            location: true,
            farmerId: true,
            status: true
          }
        },
        negotiations: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    // Check if user has access to this offer
    const isRetailer = offer.retailerId === userId;
    const isFarmer = offer.listing.farmerId === userId;

    if (!isRetailer && !isFarmer) {
      throw new ForbiddenException('You do not have access to this offer');
    }

    return offer;
  }

  async getMyOffers(retailerId: string, status?: string) {
    const where: any = { retailerId };
    if (status) {
      where.status = status;
    }

    return this.prisma.offer.findMany({
      where,
      include: {
        listing: {
          select: {
            id: true,
            cropType: true,
            quantityKg: true,
            expectedPrice: true,
            location: true,
            farmerId: true,
            status: true
          }
        },
        negotiations: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Get latest negotiation
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getOffersForMyListings(farmerId: string, status?: string) {
    const where: any = {
      listing: {
        farmerId
      }
    };
    if (status) {
      where.status = status;
    }

    return this.prisma.offer.findMany({
      where,
      include: {
        listing: {
          select: {
            id: true,
            cropType: true,
            quantityKg: true,
            expectedPrice: true,
            location: true,
            status: true
          }
        },
        negotiations: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Get latest negotiation
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async expireOldOffers() {
    const expiredOffers = await this.prisma.offer.updateMany({
      where: {
        expiresAt: {
          lt: new Date()
        },
        status: { in: ['PENDING', 'COUNTERED'] }
      },
      data: {
        status: 'EXPIRED'
      }
    });

    return { expiredCount: expiredOffers.count };
  }
}