import { IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TopupWalletDto {
  @ApiProperty({ example: 1000, description: 'Amount to add to wallet balance' })
  @IsNumber()
  @IsPositive()
  amount: number;
}