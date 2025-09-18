import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LocationService } from './location.service';
import { SearchLocationDto, NearbyLocationDto } from './dto/search-location.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('location')
@ApiBearerAuth()
@Controller('location')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post('search')
  @Roles('farmer', 'retailer')
  @ApiOperation({ summary: 'Search for locations using OpenStreetMap' })
  async searchLocation(@Body() searchLocationDto: SearchLocationDto) {
    return this.locationService.searchLocation(searchLocationDto);
  }

  @Get('reverse')
  @Roles('farmer', 'retailer')
  @ApiOperation({ summary: 'Reverse geocode coordinates to location name' })
  @ApiQuery({ name: 'lat', type: 'number', description: 'Latitude' })
  @ApiQuery({ name: 'lon', type: 'number', description: 'Longitude' })
  async reverseGeocode(
    @Query('lat') latitude: number,
    @Query('lon') longitude: number,
  ) {
    return this.locationService.reverseGeocode(latitude, longitude);
  }

  @Post('nearby')
  @Roles('farmer', 'retailer')
  @ApiOperation({ summary: 'Find nearby crop listings' })
  async findNearbyListings(@Body() nearbyLocationDto: NearbyLocationDto) {
    return this.locationService.findNearbyListings(nearbyLocationDto);
  }

  @Get('suggestions')
  @Roles('farmer', 'retailer')
  @ApiOperation({ summary: 'Get location suggestions for autocomplete' })
  @ApiQuery({ name: 'q', type: 'string', description: 'Search query' })
  async getLocationSuggestions(@Query('q') query: string) {
    return this.locationService.getLocationSuggestions(query);
  }
}