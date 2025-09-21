import { IsArray, IsNotEmpty, IsNumber, IsString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BulkOrderItemDto {
  @ApiProperty({ description: 'Crop listing ID' })
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @ApiProperty({ description: 'Quantity in kg to order' })
  @IsNumber()
  @Min(0.1)
  quantityKg: number;

  @ApiProperty({ description: 'Price per kg offered' })
  @IsNumber()
  @Min(0.01)
  pricePerKg: number;
}

export class CreateBulkOrderDto {
  @ApiProperty({ 
    description: 'Array of bulk order items',
    type: [BulkOrderItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkOrderItemDto)
  items: BulkOrderItemDto[];
}