/**
 * Example: E-Commerce Contract AI
 * 
 * Platforma e-commerce z produktami, zamówieniami i klientami.
 * Oparty na examples/e-commerce.
 * 
 * @version 2.2.0
 */

import { ContractAI } from '../../src/core/contract-ai';

export const ecommerceContract: ContractAI = {
  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 1: DEFINITION (CO)
  // ═══════════════════════════════════════════════════════════════════════
  
  definition: {
    app: {
      name: 'E-Commerce Platform',
      version: '1.0.0',
      description: 'Online store with products, orders, customers, and inventory'
    },
    
    entities: [
      {
        name: 'Category',
        description: 'Product category for organization',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'slug', type: 'String', annotations: { required: true, unique: true } },
          { name: 'description', type: 'Text', annotations: { required: false } },
          { name: 'imageUrl', type: 'URL', annotations: { required: false } },
          { name: 'sortOrder', type: 'Int', annotations: { default: 0 } }
        ],
        relations: [
          { name: 'parent', type: 'ManyToOne', target: 'Category', foreignKey: 'parentId' }
        ]
      },
      {
        name: 'Product',
        description: 'Product available for purchase',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'sku', type: 'String', annotations: { required: true, unique: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'description', type: 'Text', annotations: { required: false } },
          { name: 'price', type: 'Money', annotations: { required: true, min: 0 } },
          { name: 'compareAtPrice', type: 'Money', annotations: { required: false, min: 0 } },
          { name: 'cost', type: 'Money', annotations: { required: false, min: 0 } },
          { name: 'images', type: 'JSON', annotations: { required: false } },
          { name: 'attributes', type: 'JSON', annotations: { required: false } },
          { name: 'status', type: 'String', annotations: { enum: ['draft', 'active', 'archived'] } },
          { name: 'stock', type: 'Int', annotations: { default: 0, min: 0 } },
          { name: 'lowStockThreshold', type: 'Int', annotations: { default: 10 } },
          { name: 'publishedAt', type: 'DateTime', annotations: { required: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'category', type: 'ManyToOne', target: 'Category', foreignKey: 'categoryId' }
        ]
      },
      {
        name: 'Customer',
        description: 'Registered customer',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'email', type: 'Email', annotations: { required: true, unique: true } },
          { name: 'firstName', type: 'String', annotations: { required: true } },
          { name: 'lastName', type: 'String', annotations: { required: true } },
          { name: 'phone', type: 'Phone', annotations: { required: false } },
          { name: 'defaultAddress', type: 'JSON', annotations: { required: false } },
          { name: 'tags', type: 'JSON', annotations: { required: false } },
          { name: 'totalOrders', type: 'Int', annotations: { default: 0 } },
          { name: 'totalSpent', type: 'Money', annotations: { default: 0 } },
          { name: 'lastOrderAt', type: 'DateTime', annotations: { required: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ]
      },
      {
        name: 'Order',
        description: 'Customer order',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'orderNumber', type: 'String', annotations: { generated: true, unique: true } },
          { name: 'status', type: 'String', annotations: { enum: ['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'] } },
          { name: 'email', type: 'Email', annotations: { required: true } },
          { name: 'subtotal', type: 'Money', annotations: { required: true } },
          { name: 'tax', type: 'Money', annotations: { default: 0 } },
          { name: 'shipping', type: 'Money', annotations: { default: 0 } },
          { name: 'discount', type: 'Money', annotations: { default: 0 } },
          { name: 'total', type: 'Money', annotations: { required: true } },
          { name: 'shippingAddress', type: 'JSON', annotations: { required: true } },
          { name: 'billingAddress', type: 'JSON', annotations: { required: false } },
          { name: 'notes', type: 'Text', annotations: { required: false } },
          { name: 'paidAt', type: 'DateTime', annotations: { required: false } },
          { name: 'shippedAt', type: 'DateTime', annotations: { required: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'customer', type: 'ManyToOne', target: 'Customer', foreignKey: 'customerId' }
        ]
      },
      {
        name: 'OrderItem',
        description: 'Line item in an order',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'quantity', type: 'Int', annotations: { required: true, min: 1 } },
          { name: 'unitPrice', type: 'Money', annotations: { required: true } },
          { name: 'totalPrice', type: 'Money', annotations: { required: true } },
          { name: 'productName', type: 'String', annotations: { required: true } },
          { name: 'productSku', type: 'String', annotations: { required: true } }
        ],
        relations: [
          { name: 'order', type: 'ManyToOne', target: 'Order', foreignKey: 'orderId' },
          { name: 'product', type: 'ManyToOne', target: 'Product', foreignKey: 'productId' }
        ]
      }
    ],
    
    events: [
      {
        name: 'OrderCreated',
        description: 'Emitted when a new order is placed',
        payload: { orderId: 'UUID', customerId: 'UUID', total: 'Money' }
      },
      {
        name: 'OrderPaid',
        description: 'Emitted when payment is confirmed',
        payload: { orderId: 'UUID', paymentId: 'String', amount: 'Money' }
      },
      {
        name: 'LowStock',
        description: 'Emitted when product stock falls below threshold',
        payload: { productId: 'UUID', currentStock: 'Int', threshold: 'Int' }
      }
    ],
    
    api: {
      prefix: '/api/v1',
      resources: [
        { name: 'categories', entity: 'Category', operations: ['list', 'get', 'create', 'update', 'delete'] },
        { name: 'products', entity: 'Product', operations: ['list', 'get', 'create', 'update', 'delete'] },
        { name: 'customers', entity: 'Customer', operations: ['list', 'get', 'create', 'update'] },
        { name: 'orders', entity: 'Order', operations: ['list', 'get', 'create', 'update'] }
      ]
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 2: GENERATION (JAK)
  // ═══════════════════════════════════════════════════════════════════════
  
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript' },
      { target: 'api', priority: 'must', instruction: 'Implement proper error handling with try-catch' },
      { target: 'api', priority: 'must', instruction: 'Validate all monetary values are non-negative' },
      { target: 'api', priority: 'must', instruction: 'Validate email format' },
      { target: 'api', priority: 'must', instruction: 'Auto-generate order numbers (e.g., ORD-20260101-001)' },
      { target: 'api', priority: 'should', instruction: 'Add pagination to product and order lists' },
      { target: 'api', priority: 'should', instruction: 'Implement stock validation when creating orders' },
      { target: 'api', priority: 'may', instruction: 'Add product search by name and SKU' }
    ],
    
    patterns: [
      {
        name: 'order-number-generator',
        description: 'Generate unique order numbers',
        applies_to: ['api'],
        example: `
function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return \`ORD-\${date}-\${random}\`;
}
`
      }
    ],
    
    constraints: [
      { type: 'no-negative-prices', description: 'All prices must be >= 0', severity: 'error' },
      { type: 'stock-validation', description: 'Cannot order more than available stock', severity: 'error' }
    ],
    
    techStack: {
      backend: {
        runtime: 'node',
        language: 'typescript',
        framework: 'express',
        port: 3000,
        libraries: ['zod', 'cors', 'helmet', 'uuid']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 3: VALIDATION (KIEDY)
  // ═══════════════════════════════════════════════════════════════════════
  
  validation: {
    assertions: [
      {
        id: 'A001',
        description: 'Server entry point exists',
        check: { type: 'file-exists', path: 'api/src/server.ts' },
        severity: 'error',
        errorMessage: 'Missing server.ts entry point'
      },
      {
        id: 'A002',
        description: 'Product routes exist',
        check: { type: 'file-exists', path: 'api/src/routes/products.ts' },
        severity: 'error',
        errorMessage: 'Missing products route file'
      },
      {
        id: 'A003',
        description: 'Order routes exist',
        check: { type: 'file-exists', path: 'api/src/routes/orders.ts' },
        severity: 'error',
        errorMessage: 'Missing orders route file'
      },
      {
        id: 'A010',
        description: 'Routes have error handling',
        check: { type: 'has-error-handling', path: 'api/src/routes/orders.ts' },
        severity: 'error',
        errorMessage: 'Missing try-catch in order routes'
      },
      {
        id: 'A011',
        description: 'Email validation present',
        check: { type: 'has-validation', entityName: 'Customer', fieldName: 'email' },
        severity: 'error',
        errorMessage: 'Missing email validation for customers'
      }
    ],
    
    tests: [
      {
        name: 'Product API Tests',
        type: 'api',
        target: 'Product',
        scenarios: [
          {
            name: 'should list all products',
            given: 'products exist',
            when: 'GET /api/v1/products',
            then: 'return 200 with array',
            expectedResult: { status: 200, isArray: true }
          },
          {
            name: 'should create a product',
            given: 'valid product data',
            when: 'POST /api/v1/products',
            then: 'return 201 with created product',
            testData: { sku: 'TEST-001', name: 'Test Product', price: 99.99, status: 'active' },
            expectedResult: { status: 201 }
          },
          {
            name: 'should reject negative price',
            given: 'product with negative price',
            when: 'POST /api/v1/products',
            then: 'return 400 validation error',
            testData: { sku: 'TEST-002', name: 'Bad Product', price: -10 },
            expectedResult: { status: 400 }
          }
        ]
      },
      {
        name: 'Order API Tests',
        type: 'api',
        target: 'Order',
        scenarios: [
          {
            name: 'should create an order',
            given: 'valid order data',
            when: 'POST /api/v1/orders',
            then: 'return 201 with order number',
            testData: { 
              email: 'customer@test.com',
              items: [{ productId: '123', quantity: 2 }],
              shippingAddress: { street: '123 Main St', city: 'Boston' }
            },
            expectedResult: { status: 201, fields: ['orderNumber'] }
          }
        ]
      }
    ],
    
    staticRules: [
      { name: 'no-unused-vars', severity: 'error' },
      { name: 'no-explicit-any', severity: 'warn' },
      { name: 'prefer-const', severity: 'warn' }
    ],
    
    qualityGates: [
      { name: 'Test coverage', metric: 'test-coverage', threshold: 70, operator: '>=' },
      { name: 'Complexity', metric: 'cyclomatic-complexity', threshold: 15, operator: '<=' },
      { name: 'Duplication', metric: 'duplication-ratio', threshold: 80, operator: '<=' }
    ],
    
    acceptance: {
      testsPass: true,
      minCoverage: 70,
      maxLintErrors: 0,
      maxResponseTime: 500,
      securityChecks: [
        { type: 'no-hardcoded-secrets', severity: 'error', description: 'No secrets in code' },
        { type: 'input-validation', severity: 'error', description: 'Validate all inputs' },
        { type: 'no-sql-injection', severity: 'error', description: 'Prevent SQL injection' }
      ],
      custom: []
    }
  },

  metadata: {
    version: '1.0.0',
    author: 'Reclapp Team',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    tags: ['ecommerce', 'store', 'orders', 'products'],
    source: 'manual'
  }
};

export default ecommerceContract;
