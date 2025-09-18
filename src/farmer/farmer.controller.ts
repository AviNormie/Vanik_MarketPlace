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
import { FarmerService } from './farmer.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('farmer')
@ApiBearerAuth()
@Controller('farmer')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FarmerController {
  constructor(private readonly farmerService: FarmerService) {}

  @Post('listings')
  @Roles('farmer')
  @ApiOperation({ summary: 'Create a new crop listing' })
  async createListing(
    @Request() req: any,
    @Body() createListingDto: CreateListingDto,
  ) {
    return this.farmerService.createListing(req.user.userId, createListingDto);
  }

  @Get('listings/:id')
  @Roles('farmer')
  @ApiOperation({ summary: 'Get listing details with dashboard prices' })
  async getListing(@Param('id') id: string) {
    return this.farmerService.getListing(id);
  }

  @Get('listings')
  @Roles('farmer')
  @ApiOperation({ summary: 'Get all listings for the farmer' })
  async getFarmerListings(@Request() req: any) {
    return this.farmerService.getFarmerListings(req.user.userId);
  }
}