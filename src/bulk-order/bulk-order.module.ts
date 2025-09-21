import { Module } from '@nestjs/common';
import { BulkOrderController } from './bulk-order.controller';
import { BulkOrderService } from './bulk-order.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [PrismaModule, WalletModule],
  controllers: [BulkOrderController],
  providers: [BulkOrderService],
  exports: [BulkOrderService],
})
export class BulkOrderModule {}