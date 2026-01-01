/**
 * Inventory System - Reclapp Contract
 * Generated: 2026-01-01T12:54:43.252Z
 */

import type { ReclappContract, Entity } from '@reclapp/contracts';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  createdAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: phone;
  address: string;
  contactPerson: string;
  rating: number;
  active: boolean;
  createdAt: Date;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: money;
  cost: money;
  unit: enum;
  status: ProductStatus;
  minStock: number;
  maxStock: number;
  weight: number;
  barcode: string;
  images: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  manager: string;
  capacity: number;
  active: boolean;
  createdAt: Date;
}

export interface Stock {
  id: string;
  quantity: number;
  reserved: number;
  location: string;
  lastCountAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: string;
  type: MovementType;
  quantity: number;
  reference: string;
  notes: string;
  performedBy: string;
  createdAt: Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  status: OrderStatus;
  subtotal: money;
  tax: money;
  shipping: money;
  total: money;
  notes: string;
  shippingAddress: string;
  createdAt: Date;
  updatedAt: Date;
  shippedAt: Date;
}

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: money;
  total: money;
}

export const contract: ReclappContract = {
  app: { name: 'Inventory System', version: '1.0.0' },
  entities: ['Category', 'Supplier', 'Product', 'Warehouse', 'Stock', 'StockMovement', 'Order', 'OrderItem']
};

export default contract;
