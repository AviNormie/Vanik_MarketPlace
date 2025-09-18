import { IsString, IsNumber, IsPositive, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOfferDto {
  @ApiProperty({ example: 'uuid-listing-id', description: 'ID of the crop listing' })
  @IsString()
  @IsUUID()
  listingId: string;

  @ApiProperty({ example: 24.5, description: 'Offered price per kg' })
  @IsNumber()
  @IsPositive()
  pricePerKg: number;
}