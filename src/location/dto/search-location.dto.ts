import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchLocationDto {
  @ApiProperty({ example: 'Delhi', description: 'Location query to search for' })
  @IsString()
  query: string;

  @ApiProperty({ example: 5, description: 'Maximum number of results to return', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 5;
}

export class NearbyLocationDto {
  @ApiProperty({ example: 28.6139, description: 'Latitude coordinate' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 77.2090, description: 'Longitude coordinate' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ example: 50, description: 'Search radius in kilometers', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  radiusKm?: number = 50;
}