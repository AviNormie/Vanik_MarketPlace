import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RetailerService } from './retailer.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('retailer')
@ApiBearerAuth()
@Controller('retailer')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RetailerController {
  constructor(private readonly retailerService: RetailerService) {}

  @Get('listings')
  @Roles('retailer')
  @ApiOperation({ summary: 'Get all open crop listings' })
  async getAllOpenListings() {
    return this.retailerService.getAllOpenListings();
  }

  @Post('offers')
  @Roles('retailer')
  @ApiOperation({ summary: 'Place an offer on a crop listing' })
  async createOffer(
    @Request() req: any,
    @Body() createOfferDto: CreateOfferDto,
  ) {
    return this.retailerService.createOffer(req.user.userId, createOfferDto);
  }

  @Get('offers')
  @Roles('retailer')
  @ApiOperation({ summary: 'Get all offers made by the retailer' })
  async getRetailerOffers(@Request() req: any) {
    return this.retailerService.getRetailerOffers(req.user.userId);
  }
}