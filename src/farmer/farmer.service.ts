import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';

@Injectable()
export class FarmerService {
  constructor(private prisma: PrismaService) {}

  async createListing(farmerId: string, createListingDto: CreateListingDto) {
    return this.prisma.cropListing.create({
      data: {
        farmerId,
        ...createListingDto,
      },
    });
  }

  async getListing(id: string) {
    const listing = await this.prisma.cropListing.findUnique({
      where: { id },
      include: {
        offers: true,
      },
    });

    // Mock dashboard prices (stub call)
    const dashboardPrices = {
      govMSP: 23.5,
      marketAverage: 25.2,
      lastWeekTrend: '+2.3%',
    };

    return {
      ...listing,
      dashboardPrices,
    };
  }

  async getFarmerListings(farmerId: string) {
    return this.prisma.cropListing.findMany({
      where: { farmerId },
      include: {
        offers: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}