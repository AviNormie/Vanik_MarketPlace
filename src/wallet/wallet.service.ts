import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TopupWalletDto } from './dto/topup-wallet.dto';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async topupWallet(userId: string, topupWalletDto: TopupWalletDto) {
    // Create or update wallet
    const wallet = await this.prisma.wallet.upsert({
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

    return {
      message: 'Wallet topped up successfully',
      wallet: {
        id: wallet.id,
        userId: wallet.userId,
        balance: wallet.balance,
        updatedAt: wallet.updatedAt,
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
    // This is a mock implementation since we don't have transaction history table
    // In a real implementation, you would have a separate transactions table
    const wallet = await this.getWalletBalance(userId);
    
    return {
      wallet,
      transactions: [
        {
          id: 'mock-transaction-1',
          type: 'TOPUP',
          amount: wallet.balance,
          description: 'Mock wallet topup',
          createdAt: wallet.createdAt,
        },
      ],
    };
  }
}