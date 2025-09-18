import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LockEscrowDto } from './dto/lock-escrow.dto';

@Injectable()
export class EscrowService {
  constructor(private prisma: PrismaService) {}

  async lockFunds(retailerId: string, lockEscrowDto: LockEscrowDto) {
    // Get offer details
    const offer = await this.prisma.offer.findUnique({
      where: { id: lockEscrowDto.offerId },
      include: {
        listing: true,
        escrow: true,
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.retailerId !== retailerId) {
      throw new BadRequestException('You can only lock funds for your own offers');
    }

    if (offer.escrow) {
      throw new BadRequestException('Funds already locked for this offer');
    }

    const totalAmount = offer.pricePerKg * offer.listing.quantityKg;

    // Check retailer wallet balance
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: retailerId },
    });

    if (!wallet || wallet.balance < totalAmount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Start transaction
    return this.prisma.$transaction(async (tx) => {
      // Deduct from wallet
      await tx.wallet.update({
        where: { userId: retailerId },
        data: {
          balance: {
            decrement: totalAmount,
          },
        },
      });

      // Create escrow
      const escrow = await tx.escrow.create({
        data: {
          offerId: lockEscrowDto.offerId,
          amountLocked: totalAmount,
          status: 'LOCKED',
        },
      });

      return escrow;
    });
  }

  async releaseFunds(escrowId: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: {
        offer: {
          include: {
            listing: true,
          },
        },
      },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    if (escrow.status !== 'LOCKED') {
      throw new BadRequestException('Escrow is not in locked state');
    }

    const farmerId = escrow.offer.listing.farmerId;

    // Start transaction
    return this.prisma.$transaction(async (tx) => {
      // Update escrow status
      await tx.escrow.update({
        where: { id: escrowId },
        data: {
          status: 'RELEASED',
        },
      });

      // Credit farmer wallet (create if doesn't exist)
      await tx.wallet.upsert({
        where: { userId: farmerId },
        update: {
          balance: {
            increment: escrow.amountLocked,
          },
        },
        create: {
          userId: farmerId,
          balance: escrow.amountLocked,
        },
      });

      // Update listing status
      await tx.cropListing.update({
        where: { id: escrow.offer.listing.id },
        data: {
          status: 'SOLD',
        },
      });

      return { message: 'Funds released successfully', escrowId };
    });
  }

  async disputeEscrow(escrowId: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    if (escrow.status !== 'LOCKED') {
      throw new BadRequestException('Escrow is not in locked state');
    }

    await this.prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: 'DISPUTE',
      },
    });

    return { message: 'Escrow marked as disputed', escrowId };
  }

  async getEscrowDetails(escrowId: string) {
    return this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: {
        offer: {
          include: {
            listing: {
              select: {
                id: true,
                cropType: true,
                quantityKg: true,
                location: true,
                farmerId: true,
              },
            },
          },
        },
      },
    });
  }
}