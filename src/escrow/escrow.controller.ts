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
import { EscrowService } from './escrow.service';
import { LockEscrowDto } from './dto/lock-escrow.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('escrow')
@ApiBearerAuth()
@Controller('escrow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Post('lock')
  @Roles('retailer')
  @ApiOperation({ summary: 'Lock funds in escrow for an offer' })
  async lockFunds(
    @Request() req: any,
    @Body() lockEscrowDto: LockEscrowDto,
  ) {
    return this.escrowService.lockFunds(req.user.userId, lockEscrowDto);
  }

  @Patch('release/:id')
  @Roles('farmer', 'retailer')
  @ApiOperation({ summary: 'Release funds from escrow to farmer' })
  async releaseFunds(@Param('id') escrowId: string) {
    return this.escrowService.releaseFunds(escrowId);
  }

  @Patch('dispute/:id')
  @Roles('farmer', 'retailer')
  @ApiOperation({ summary: 'Mark escrow as disputed' })
  async disputeEscrow(@Param('id') escrowId: string) {
    return this.escrowService.disputeEscrow(escrowId);
  }

  @Get(':id')
  @Roles('farmer', 'retailer')
  @ApiOperation({ summary: 'Get escrow details' })
  async getEscrowDetails(@Param('id') escrowId: string) {
    return this.escrowService.getEscrowDetails(escrowId);
  }
}