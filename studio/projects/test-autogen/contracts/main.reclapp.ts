/**
 * AutoGen - Reclapp Contract
 * Generated: 2026-01-01T16:21:05.051Z
 */

import type { ReclappContract, Entity } from '@reclapp/contracts';

export interface Product {
  id: string;
  name: string;
}

export const contract: ReclappContract = {
  app: { name: 'AutoGen', version: '1.0.0' },
  entities: ['Product']
};

export default contract;
