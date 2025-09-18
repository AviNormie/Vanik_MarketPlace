import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
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
}