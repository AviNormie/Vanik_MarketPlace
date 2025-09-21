import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { CreateBulkOrderDto } from './dto/create-bulk-order.dto';

@Injectable()
export class BulkOrderService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  async createBulkOrder(retailerId: string, createBulkOrderDto: CreateBulkOrderDto) {
    const { items } = createBulkOrderDto;

    // Validate all listings exist and are available
    const listingIds = items.map(item => item.listingId);
    const listings = await this.prisma.cropListing.findMany({
      where: {
        id: { in: listingIds },
        status: 'OPEN'
      }
    });

    if (listings.length !== listingIds.length) {
      throw new BadRequestException('Some listings are not available or do not exist');
    }

    // Calculate total amount
    let totalAmount = 0;
    const orderItems = items.map(item => {
      const listing = listings.find(l => l.id === item.listingId);
      if (!listing) {
        throw new NotFoundException(`Listing ${item.listingId} not found`);
      }

      // Check if requested quantity is available
      if (item.quantityKg > listing.quantityKg) {
        throw new BadRequestException(
          `Requested quantity ${item.quantityKg}kg exceeds available quantity ${listing.quantityKg}kg for ${listing.cropType}`
        );
      }

      const totalPrice = item.quantityKg * item.pricePerKg;
      totalAmount += totalPrice;

      return {
        listingId: item.listingId,
        quantityKg: item.quantityKg,
        pricePerKg: item.pricePerKg,
        totalPrice
      };
    });

    // Create bulk order with items in a transaction
    const bulkOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.bulkOrder.create({
        data: {
          retailerId,
          totalAmount,
          status: 'PENDING'
        }
      });

      await tx.bulkOrderItem.createMany({
        data: orderItems.map(item => ({
          bulkOrderId: order.id,
          ...item
        }))
      });

      return order;
    });

    // Return the complete bulk order with items
    return this.getBulkOrderById(bulkOrder.id);
  }

  async getBulkOrderById(bulkOrderId: string) {
    const bulkOrder = await this.prisma.bulkOrder.findUnique({
      where: { id: bulkOrderId },
      include: {
        items: {
          include: {
            listing: {
              select: {
                id: true,
                farmerId: true,
                cropType: true,
                location: true,
                expectedPrice: true
              }
            }
          }
        }
      }
    });

    if (!bulkOrder) {
      throw new NotFoundException('Bulk order not found');
    }

    return bulkOrder;
  }

  async getRetailerBulkOrders(retailerId: string) {
    return this.prisma.bulkOrder.findMany({
      where: { retailerId },
      include: {
        items: {
          include: {
            listing: {
              select: {
                id: true,
                farmerId: true,
                cropType: true,
                location: true,
                expectedPrice: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async updateBulkOrderStatus(bulkOrderId: string, status: string) {
    const validStatuses = ['PENDING', 'CONFIRMED', 'PAID', 'COMPLETED', 'CANCELLED'];
    
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const bulkOrder = await this.prisma.bulkOrder.findUnique({
      where: { id: bulkOrderId }
    });

    if (!bulkOrder) {
      throw new NotFoundException('Bulk order not found');
    }

    return this.prisma.bulkOrder.update({
      where: { id: bulkOrderId },
      data: { 
        status,
        updatedAt: new Date()
      }
    });
  }

  async confirmBulkOrder(bulkOrderId: string) {
    return this.updateBulkOrderStatus(bulkOrderId, 'CONFIRMED');
  }

  async cancelBulkOrder(bulkOrderId: string) {
    return this.updateBulkOrderStatus(bulkOrderId, 'CANCELLED');
  }

  async payBulkOrder(retailerId: string, bulkOrderId: string) {
    const bulkOrder = await this.getBulkOrderById(bulkOrderId);
    
    if (bulkOrder.retailerId !== retailerId) {
      throw new BadRequestException('You can only pay for your own orders');
    }

    if (bulkOrder.status !== 'CONFIRMED') {
      throw new BadRequestException('Order must be confirmed before payment');
    }

    // Check retailer wallet balance using wallet service
    const balanceCheck = await this.walletService.checkBalance(retailerId, bulkOrder.totalAmount);
    
    if (!balanceCheck.hasBalance) {
      throw new BadRequestException(
        `Insufficient wallet balance. Required: $${bulkOrder.totalAmount}, Available: $${balanceCheck.currentBalance}`
      );
    }

    // Process payment using wallet service
    const paymentResult = await this.walletService.processPayment(
      retailerId,
      bulkOrder.totalAmount,
      `Payment for bulk order ${bulkOrderId}`,
      bulkOrderId
    );

    // Process bulk order completion in transaction
    return this.prisma.$transaction(async (tx) => {
      // Update bulk order status
      await tx.bulkOrder.update({
        where: { id: bulkOrderId },
        data: { status: 'PAID' }
      });

      // Create individual offers and escrows for each item
      for (const item of bulkOrder.items) {
        // Create an offer for this bulk order item with accepted status
        const offer = await tx.offer.create({
          data: {
            retailerId,
            listingId: item.listingId,
            pricePerKg: item.pricePerKg,
            quantityKg: item.quantityKg,
            status: 'ACCEPTED', // Auto-accepted for bulk orders
            message: `Bulk order payment - Order ID: ${bulkOrderId}`
          }
        });

        // Create escrow for this offer
        await tx.escrow.create({
          data: {
            offerId: offer.id,
            amountLocked: item.totalPrice,
            status: 'LOCKED'
          }
        });
      }

      return { 
        success: true, 
        message: 'Payment processed successfully',
        paymentTransaction: paymentResult.transaction
      };
    });
  }
}