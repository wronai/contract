/**
 * CRM - Reclapp Contract
 * Generated: 2026-01-01T13:04:58.507Z
 */

import type { ReclappContract, Entity, Event } from '@reclapp/contracts';

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  contact: ->;
  createdAt: Date;
}

// Entity definitions
const ContactEntity: Entity = {
  name: 'Contact',
  fields: [
    { name: 'id', type: 'uuid', annotations: { unique: true, generated: true } },
    { name: 'name', type: 'text', annotations: { required: true } },
    { name: 'email', type: 'email', annotations: { unique: true, required: true } },
    { name: 'phone', type: 'phone', annotations: { required: true } },
  ]
};

const TransactionEntity: Entity = {
  name: 'Transaction',
  fields: [
    { name: 'id', type: 'uuid', annotations: { unique: true, generated: true } },
    { name: 'description', type: 'text', annotations: { required: true } },
    { name: 'amount', type: 'decimal', annotations: { required: true } },
    { name: 'contact', type: '->' },
    { name: 'createdAt', type: 'datetime', annotations: { generated: true } },
  ]
};

// Main contract
export const contract: ReclappContract = {
  app: {
    name: 'CRM',
    version: '1.0.0'
  },
  entities: [ContactEntity, TransactionEntity]
};

export default contract;
