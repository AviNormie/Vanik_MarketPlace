import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BulkOrderService } from './bulk-order.service';
import { CreateBulkOrderDto } from './dto/create-bulk-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('bulk-order')
@ApiBearerAuth()
@Controller('bulk-order')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BulkOrderController {
  constructor(private readonly bulkOrderService: BulkOrderService) {}

  @Post()
  @Roles('retailer')
  @ApiOperation({ summary: 'Create a new bulk order' })
  async createBulkOrder(
    @Request() req: any,
    @Body() createBulkOrderDto: CreateBulkOrderDto,
  ) {
    return this.bulkOrderService.createBulkOrder(req.user.userId, createBulkOrderDto);
  }

  @Get('my-orders')
  @Roles('retailer')
  @ApiOperation({ summary: 'Get all bulk orders for the current retailer' })
  async getMyBulkOrders(@Request() req: any) {
    return this.bulkOrderService.getRetailerBulkOrders(req.user.userId);
  }

  @Get(':id')
  @Roles('retailer', 'farmer')
  @ApiOperation({ summary: 'Get bulk order details by ID' })
  async getBulkOrderById(@Param('id') id: string) {
    return this.bulkOrderService.getBulkOrderById(id);
  }

  @Patch(':id/confirm')
  @Roles('retailer')
  @ApiOperation({ summary: 'Confirm a bulk order' })
  async confirmBulkOrder(@Param('id') id: string) {
    return this.bulkOrderService.confirmBulkOrder(id);
  }

  @Patch(':id/cancel')
  @Roles('retailer')
  @ApiOperation({ summary: 'Cancel a bulk order' })
  async cancelBulkOrder(@Param('id') id: string) {
    return this.bulkOrderService.cancelBulkOrder(id);
  }

  @Post(':id/pay')
  @Roles('retailer')
  @ApiOperation({ summary: 'Pay for a confirmed bulk order' })
  async payBulkOrder(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.bulkOrderService.payBulkOrder(req.user.userId, id);
  }
}