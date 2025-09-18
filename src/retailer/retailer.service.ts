import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto } from './dto/create-offer.dto';

@Injectable()
export class RetailerService {
  constructor(private prisma: PrismaService) {}

  async getAllOpenListings() {
    return this.prisma.cropListing.findMany({
      where: {
        status: 'OPEN',
      },
      include: {
        offers: {
          select: {
            id: true,
            pricePerKg: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createOffer(retailerId: string, createOfferDto: CreateOfferDto) {
    // Check if listing exists and is open
    const listing = await this.prisma.cropListing.findUnique({
      where: { id: createOfferDto.listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'OPEN') {
      throw new Error('Listing is not open for offers');
    }

    return this.prisma.offer.create({
      data: {
        retailerId,
        ...createOfferDto,
      },
      include: {
        listing: {
          select: {
            id: true,
            cropType: true,
            quantityKg: true,
            location: true,
          },
        },
      },
    });
  }

  async getRetailerOffers(retailerId: string) {
    return this.prisma.offer.findMany({
      where: { retailerId },
      include: {
        listing: {
          select: {
            id: true,
            cropType: true,
            quantityKg: true,
            location: true,
            status: true,
          },
        },
        escrow: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}