import { SetMetadata } from '@nestjs/common';

export type Role = 'farmer' | 'retailer';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const Public = () => SetMetadata('isPublic', true);