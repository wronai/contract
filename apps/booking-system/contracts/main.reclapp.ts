/**
 * Booking System - Reclapp Contract
 * Generated: 2026-01-01T12:54:39.515Z
 */

import type { ReclappContract, Entity } from '@reclapp/contracts';

export interface Provider {
  id: string;
  name: string;
  email: string;
  phone: phone;
  bio: string;
  avatar: url;
  specialties: string;
  active: boolean;
  createdAt: Date;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: money;
  category: string;
  active: boolean;
  createdAt: Date;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone: phone;
  notes: string;
  createdAt: Date;
}

export interface Schedule {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  active: boolean;
}

export interface TimeSlot {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  date: Date;
  startTime: string;
  endTime: string;
  price: money;
  notes: string;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date;
}

export interface Payment {
  id: string;
  amount: money;
  method: enum;
  status: PaymentStatus;
  transactionId: string;
  paidAt: Date;
  createdAt: Date;
}

export const contract: ReclappContract = {
  app: { name: 'Booking System', version: '1.0.0' },
  entities: ['Provider', 'Service', 'Customer', 'Schedule', 'TimeSlot', 'Booking', 'Payment']
};

export default contract;
