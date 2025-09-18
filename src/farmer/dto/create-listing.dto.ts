import { IsString, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateListingDto {
  @ApiProperty({ example: 'wheat', description: 'Type of crop' })
  @IsString()
  cropType: string;

  @ApiProperty({ example: 1000, description: 'Quantity in kilograms' })
  @IsNumber()
  @IsPositive()
  quantityKg: number;

  @ApiProperty({ example: 25.5, description: 'Expected price per kg' })
  @IsNumber()
  @IsPositive()
  expectedPrice: number;

  @ApiProperty({ example: 'Delhi, India', description: 'Location of the crop' })
  @IsString()
  location: string;
}