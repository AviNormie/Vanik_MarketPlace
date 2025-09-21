import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OfferService } from './offer.service';
import { CreateOfferDto, CounterOfferDto, RespondToOfferDto, NegotiationMessageDto } from './dto/create-offer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('offer')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Post()
  @Roles('retailer')
  async createOffer(@Request() req, @Body() createOfferDto: CreateOfferDto) {
    return this.offerService.createOffer(req.user.userId, createOfferDto);
  }

  @Patch(':id/respond')
  @Roles('farmer')
  async respondToOffer(
    @Request() req,
    @Param('id') offerId: string,
    @Body() respondDto: RespondToOfferDto,
  ) {
    return this.offerService.respondToOffer(req.user.userId, offerId, respondDto);
  }

  @Patch(':id/counter')
  @Roles('retailer')
  async counterOffer(
    @Request() req,
    @Param('id') offerId: string,
    @Body() counterDto: CounterOfferDto,
  ) {
    return this.offerService.counterOffer(req.user.userId, offerId, counterDto);
  }

  @Post(':id/message')
  @Roles('farmer', 'retailer')
  async sendMessage(
    @Request() req,
    @Param('id') offerId: string,
    @Body() messageDto: NegotiationMessageDto,
  ) {
    return this.offerService.sendNegotiationMessage(req.user.userId, offerId, messageDto);
  }

  @Get(':id')
  @Roles('farmer', 'retailer')
  async getOfferDetails(@Request() req, @Param('id') offerId: string) {
    return this.offerService.getOfferDetails(req.user.userId, offerId);
  }

  @Get('my/sent')
  @Roles('retailer')
  async getMyOffers(@Request() req, @Query('status') status?: string) {
    return this.offerService.getMyOffers(req.user.userId, status);
  }

  @Get('my/received')
  @Roles('farmer')
  async getOffersForMyListings(@Request() req, @Query('status') status?: string) {
    return this.offerService.getOffersForMyListings(req.user.userId, status);
  }

  @Post('expire-old')
  @Roles('farmer', 'retailer') // Could be restricted to admin in production
  async expireOldOffers() {
    return this.offerService.expireOldOffers();
  }
}