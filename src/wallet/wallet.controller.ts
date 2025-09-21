import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { TopupWalletDto } from './dto/topup-wallet.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('topup')
  @Roles('farmer', 'retailer')
  @ApiOperation({ summary: 'Add funds to wallet (mock implementation)' })
  async topupWallet(
    @Request() req: any,
    @Body() topupWalletDto: TopupWalletDto,
  ) {
    return this.walletService.topupWallet(req.user.userId, topupWalletDto);
  }

  @Get(':userId')
  @Roles('farmer', 'retailer')
  @ApiOperation({ summary: 'Get wallet balance for a user' })
  async getWalletBalance(@Param('userId') userId: string) {
    return this.walletService.getWalletBalance(userId);
  }

  @Get('my/balance')
  @Roles('farmer', 'retailer')
  @ApiOperation({ summary: 'Get current user wallet balance' })
  async getMyWalletBalance(@Request() req: any) {
    return this.walletService.getWalletBalance(req.user.userId);
  }

  @Get('my/transactions')
  @Roles('farmer', 'retailer')
  @ApiOperation({ summary: 'Get current user wallet transaction history' })
  async getMyTransactionHistory(@Request() req: any) {
    return this.walletService.getWalletTransactionHistory(req.user.userId);
  }

  @Post('payment')
  @Roles('retailer')
  @ApiOperation({ summary: 'Process a payment from wallet' })
  async processPayment(
    @Request() req: any,
    @Body() paymentData: { amount: number; description: string; referenceId?: string },
  ) {
    return this.walletService.processPayment(
      req.user.userId,
      paymentData.amount,
      paymentData.description,
      paymentData.referenceId,
    );
  }

  @Post('refund')
  @Roles('farmer', 'retailer')
  @ApiOperation({ summary: 'Process a refund to wallet' })
  async processRefund(
    @Request() req: any,
    @Body() refundData: { amount: number; description: string; referenceId?: string },
  ) {
    return this.walletService.processRefund(
      req.user.userId,
      refundData.amount,
      refundData.description,
      refundData.referenceId,
    );
  }

  @Get('check-balance')
  @Roles('retailer')
  @ApiOperation({ summary: 'Check if wallet has sufficient balance for a transaction' })
  async checkBalance(
    @Request() req: any,
    @Query('amount') amount: string,
  ) {
    const requiredAmount = parseFloat(amount);
    if (isNaN(requiredAmount) || requiredAmount <= 0) {
      throw new Error('Invalid amount provided');
    }
    return this.walletService.checkBalance(req.user.userId, requiredAmount);
  }
}