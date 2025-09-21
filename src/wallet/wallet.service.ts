import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TopupWalletDto } from './dto/topup-wallet.dto';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async topupWallet(userId: string, topupWalletDto: TopupWalletDto) {
    // Create or update wallet and record transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {
          balance: {
            increment: topupWalletDto.amount,
          },
        },
        create: {
          userId,
          balance: topupWalletDto.amount,
        },
      });

      // Record the transaction
      await tx.transaction.create({
        data: {
          userId,
          type: 'TOPUP',
          amount: topupWalletDto.amount,
          description: `Wallet top-up of $${topupWalletDto.amount}`,
          status: 'COMPLETED',
        },
      });

      return wallet;
    });

    return {
      message: 'Wallet topped up successfully',
      wallet: {
        id: result.id,
        userId: result.userId,
        balance: result.balance,
        updatedAt: result.updatedAt,
      },
    };
  }

  async getWalletBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      // Create wallet with 0 balance if it doesn't exist
      const newWallet = await this.prisma.wallet.create({
        data: {
          userId,
          balance: 0,
        },
      });

      return {
        id: newWallet.id,
        userId: newWallet.userId,
        balance: newWallet.balance,
        createdAt: newWallet.createdAt,
        updatedAt: newWallet.updatedAt,
      };
    }

    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  async getWalletTransactionHistory(userId: string) {
    const wallet = await this.getWalletBalance(userId);
    
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to last 50 transactions
    });

    return {
      wallet,
      transactions,
    };
  }

  async processPayment(userId: string, amount: number, description: string, referenceId?: string) {
    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    const wallet = await this.getWalletBalance(userId);
    
    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Process payment in transaction
    return this.prisma.$transaction(async (tx) => {
      // Deduct from wallet
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      // Record the transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'PAYMENT',
          amount: -amount, // Negative for debit
          description,
          status: 'COMPLETED',
          referenceId,
        },
      });

      return {
        success: true,
        wallet: updatedWallet,
        transaction,
        message: 'Payment processed successfully',
      };
    });
  }

  async processRefund(userId: string, amount: number, description: string, referenceId?: string) {
    if (amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than 0');
    }

    // Process refund in transaction
    return this.prisma.$transaction(async (tx) => {
      // Add to wallet
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // Record the transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'REFUND',
          amount,
          description,
          status: 'COMPLETED',
          referenceId,
        },
      });

      return {
        success: true,
        wallet: updatedWallet,
        transaction,
        message: 'Refund processed successfully',
      };
    });
  }

  async processEscrowRelease(farmerId: string, amount: number, description: string, referenceId?: string) {
    if (amount <= 0) {
      throw new BadRequestException('Release amount must be greater than 0');
    }

    // Process escrow release in transaction
    return this.prisma.$transaction(async (tx) => {
      // Add to farmer's wallet
      const updatedWallet = await tx.wallet.upsert({
        where: { userId: farmerId },
        update: {
          balance: {
            increment: amount,
          },
        },
        create: {
          userId: farmerId,
          balance: amount,
        },
      });

      // Record the transaction
      const transaction = await tx.transaction.create({
        data: {
          userId: farmerId,
          type: 'ESCROW_RELEASE',
          amount,
          description,
          status: 'COMPLETED',
          referenceId,
        },
      });

      return {
        success: true,
        wallet: updatedWallet,
        transaction,
        message: 'Escrow released successfully',
      };
    });
  }

  async checkBalance(userId: string, requiredAmount: number) {
    const wallet = await this.getWalletBalance(userId);
    
    return {
      hasBalance: wallet.balance >= requiredAmount,
      currentBalance: wallet.balance,
      requiredAmount,
      shortfall: Math.max(0, requiredAmount - wallet.balance),
    };
  }
}