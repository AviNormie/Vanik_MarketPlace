export class CreateOfferDto {
  listingId: string;
  pricePerKg: number;
  quantityKg: number;
  message?: string;
  expiresAt?: Date;
}

export class CounterOfferDto {
  pricePerKg?: number;
  quantityKg?: number;
  message?: string;
}

export class RespondToOfferDto {
  action: 'ACCEPT' | 'REJECT' | 'COUNTER';
  pricePerKg?: number;
  quantityKg?: number;
  message?: string;
}

export class NegotiationMessageDto {
  message: string;
}