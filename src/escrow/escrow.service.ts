import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { LockEscrowDto } from './dto/lock-escrow.dto';

@Injectable()
export class EscrowService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

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

    // Check retailer wallet balance using wallet service
    const balanceCheck = await this.walletService.checkBalance(retailerId, totalAmount);
    
    if (!balanceCheck.hasBalance) {
      throw new BadRequestException(
        `Insufficient wallet balance. Required: $${totalAmount}, Available: $${balanceCheck.currentBalance}`
      );
    }

    // Process payment using wallet service
    const paymentResult = await this.walletService.processPayment(
      retailerId,
      totalAmount,
      `Escrow lock for offer ${lockEscrowDto.offerId}`,
      lockEscrowDto.offerId
    );

    // Create escrow
    const escrow = await this.prisma.escrow.create({
      data: {
        offerId: lockEscrowDto.offerId,
        amountLocked: totalAmount,
        status: 'LOCKED',
      },
    });

    return {
      ...escrow,
      paymentTransaction: paymentResult.transaction
    };
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

    // Release funds to farmer using wallet service
    const releaseResult = await this.walletService.processEscrowRelease(
      farmerId,
      escrow.amountLocked,
      `Escrow release for offer ${escrow.offer.id}`,
      escrowId
    );

    // Start transaction for escrow and listing updates
    return this.prisma.$transaction(async (tx) => {
      // Update escrow status
      await tx.escrow.update({
        where: { id: escrowId },
        data: {
          status: 'RELEASED',
        },
      });

      // Update listing status
      await tx.cropListing.update({
        where: { id: escrow.offer.listing.id },
        data: {
          status: 'SOLD',
        },
      });

      return { 
         message: 'Funds released successfully', 
         escrowId,
         releaseTransaction: releaseResult.transaction
       };
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