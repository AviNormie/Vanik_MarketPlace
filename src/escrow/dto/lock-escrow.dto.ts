import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LockEscrowDto {
  @ApiProperty({ example: 'uuid-offer-id', description: 'ID of the offer to lock funds for' })
  @IsString()
  @IsUUID()
  offerId: string;
}