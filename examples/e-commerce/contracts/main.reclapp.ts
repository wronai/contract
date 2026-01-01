/**
 * E-Commerce Platform - Reclapp TypeScript Contract
 * 
 * Full e-commerce solution with products, orders, inventory, and payments.
 * 
 * @version 2.1.0
 */

import type { ReclappContract, Entity, Event, Pipeline, Alert, Dashboard, Workflow, ApiConfig, EnvVar } from '../../../contracts/dsl-types';

// ============================================================================
// ENTITIES
// ============================================================================

const Product: Entity = {
  name: 'Product',
  fields: [
    { name: 'sku', type: 'String', annotations: { unique: true } },
    { name: 'name', type: 'String' },
    { name: 'description', type: 'String', nullable: true },
    { name: 'price', type: 'Decimal' },
    { name: 'compareAtPrice', type: 'Decimal', nullable: true },
    { name: 'cost', type: 'Decimal', nullable: true },
    { name: 'categoryId', type: 'String' },
    { name: 'brandId', type: 'String', nullable: true },
    { name: 'images', type: 'JSON' },
    { name: 'attributes', type: 'JSON', nullable: true },
    { name: 'status', type: 'String' },
    { name: 'publishedAt', type: 'DateTime', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const Category: Entity = {
  name: 'Category',
  fields: [
    { name: 'name', type: 'String' },
    { name: 'slug', type: 'String', annotations: { unique: true } },
    { name: 'parentId', type: 'String', nullable: true },
    { name: 'description', type: 'String', nullable: true },
    { name: 'imageUrl', type: 'String', nullable: true },
    { name: 'sortOrder', type: 'Int' }
  ]
};

const Inventory: Entity = {
  name: 'Inventory',
  fields: [
    { name: 'productId', type: 'String' },
    { name: 'warehouseId', type: 'String' },
    { name: 'quantity', type: 'Int' },
    { name: 'reservedQuantity', type: 'Int' },
    { name: 'lowStockThreshold', type: 'Int' },
    { name: 'updatedAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const Customer: Entity = {
  name: 'Customer',
  fields: [
    { name: 'email', type: 'String', annotations: { unique: true } },
    { name: 'firstName', type: 'String' },
    { name: 'lastName', type: 'String' },
    { name: 'phone', type: 'String', nullable: true },
    { name: 'defaultAddressId', type: 'String', nullable: true },
    { name: 'tags', type: 'String', array: true, nullable: true },
    { name: 'totalOrders', type: 'Int' },
    { name: 'totalSpent', type: 'Decimal' },
    { name: 'lastOrderAt', type: 'DateTime', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const Order: Entity = {
  name: 'Order',
  fields: [
    { name: 'orderNumber', type: 'String', annotations: { unique: true, generated: true } },
    { name: 'customerId', type: 'String' },
    { name: 'email', type: 'String' },
    { name: 'status', type: 'String' },
    { name: 'fulfillmentStatus', type: 'String' },
    { name: 'paymentStatus', type: 'String' },
    { name: 'subtotal', type: 'Decimal' },
    { name: 'shippingTotal', type: 'Decimal' },
    { name: 'taxTotal', type: 'Decimal' },
    { name: 'discountTotal', type: 'Decimal' },
    { name: 'total', type: 'Decimal' },
    { name: 'currency', type: 'String' },
    { name: 'shippingAddressId', type: 'String' },
    { name: 'billingAddressId', type: 'String' },
    { name: 'notes', type: 'String', nullable: true },
    { name: 'metadata', type: 'JSON', nullable: true },
    { name: 'placedAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const OrderItem: Entity = {
  name: 'OrderItem',
  fields: [
    { name: 'orderId', type: 'String' },
    { name: 'productId', type: 'String' },
    { name: 'sku', type: 'String' },
    { name: 'name', type: 'String' },
    { name: 'quantity', type: 'Int' },
    { name: 'unitPrice', type: 'Decimal' },
    { name: 'total', type: 'Decimal' },
    { name: 'fulfillmentStatus', type: 'String' }
  ]
};

const Cart: Entity = {
  name: 'Cart',
  fields: [
    { name: 'sessionId', type: 'String', annotations: { unique: true } },
    { name: 'customerId', type: 'String', nullable: true },
    { name: 'items', type: 'JSON' },
    { name: 'subtotal', type: 'Decimal' },
    { name: 'currency', type: 'String' },
    { name: 'expiresAt', type: 'DateTime' },
    { name: 'updatedAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const Shipment: Entity = {
  name: 'Shipment',
  fields: [
    { name: 'orderId', type: 'String' },
    { name: 'carrier', type: 'String' },
    { name: 'trackingNumber', type: 'String', nullable: true },
    { name: 'status', type: 'String' },
    { name: 'shippedAt', type: 'DateTime', nullable: true },
    { name: 'deliveredAt', type: 'DateTime', nullable: true },
    { name: 'items', type: 'JSON' }
  ]
};

// ============================================================================
// EVENTS
// ============================================================================

const events: Event[] = [
  { name: 'ProductViewed', fields: [
    { name: 'productId', type: 'String' }, { name: 'customerId', type: 'String', nullable: true },
    { name: 'sessionId', type: 'String' }, { name: 'source', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'CartUpdated', fields: [
    { name: 'cartId', type: 'String' }, { name: 'customerId', type: 'String', nullable: true },
    { name: 'action', type: 'String' }, { name: 'productId', type: 'String' },
    { name: 'quantity', type: 'Int' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'OrderPlaced', fields: [
    { name: 'orderId', type: 'String' }, { name: 'customerId', type: 'String' },
    { name: 'total', type: 'Decimal' }, { name: 'itemCount', type: 'Int' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'PaymentProcessed', fields: [
    { name: 'orderId', type: 'String' }, { name: 'paymentId', type: 'String' },
    { name: 'amount', type: 'Decimal' }, { name: 'status', type: 'String' },
    { name: 'method', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'InventoryChanged', fields: [
    { name: 'productId', type: 'String' }, { name: 'warehouseId', type: 'String' },
    { name: 'previousQuantity', type: 'Int' }, { name: 'newQuantity', type: 'Int' },
    { name: 'reason', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'ShipmentUpdated', fields: [
    { name: 'shipmentId', type: 'String' }, { name: 'orderId', type: 'String' },
    { name: 'status', type: 'String' }, { name: 'location', type: 'String', nullable: true }, { name: 'timestamp', type: 'DateTime' }
  ]}
];

// ============================================================================
// PIPELINES
// ============================================================================

const pipelines: Pipeline[] = [
  { name: 'OrderProcessing', input: 'OrderPlaced.stream', transform: ['validateOrder', 'processPayment', 'reserveInventory', 'sendConfirmation'], output: ['fulfillment', 'notifications', 'analytics'] },
  { name: 'InventorySync', input: 'inventoryApi.changes', transform: ['validate', 'updateStock', 'checkReorderPoints'], output: ['inventory', 'alerts'], schedule: '*/15 * * * *' },
  { name: 'RecommendationEngine', input: ['ProductViewed.stream', 'OrderPlaced.stream'], transform: ['analyzePatterns', 'generateRecommendations'], output: ['recommendations', 'personalization'], schedule: '0 */6 * * *' },
  { name: 'AbandonedCartRecovery', input: 'Cart.stale', filter: 'expiresAt < now() AND customerId != null', transform: ['createReminder', 'calculateDiscount'], output: ['email', 'notifications'], schedule: '0 * * * *' },
  { name: 'FraudDetection', input: ['OrderPlaced.stream', 'PaymentProcessed.stream'], transform: ['analyzeRisk', 'scoreTransaction'], output: ['alerts', 'orderHold'] }
];

// ============================================================================
// ALERTS
// ============================================================================

const alerts: Alert[] = [
  { name: 'Low Stock', entity: 'Inventory', condition: 'quantity <= lowStockThreshold', target: ['email', 'slack', 'dashboard'], severity: 'medium' },
  { name: 'Out of Stock', entity: 'Inventory', condition: 'quantity == 0', target: ['email', 'slack'], severity: 'high' },
  { name: 'High Value Order', entity: 'Order', condition: 'total > 1000', target: ['slack'], severity: 'low' },
  { name: 'Payment Failed', entity: 'Order', condition: 'paymentStatus == "failed"', target: ['email', 'slack'], severity: 'critical' },
  { name: 'Fraud Risk', entity: 'Order', condition: 'fraudScore > 0.8', target: ['slack', 'email'], severity: 'critical', throttle: '5m' },
  { name: 'Delivery Exception', entity: 'Shipment', condition: 'status == "exception"', target: ['email', 'slack'], severity: 'high' }
];

// ============================================================================
// DASHBOARDS
// ============================================================================

const dashboards: Dashboard[] = [
  { name: 'Sales Overview', entity: 'Order', metrics: ['totalRevenue', 'orderCount', 'avgOrderValue', 'conversionRate', 'revenueByDay', 'topProducts'], streamMode: 'realtime', layout: 'grid', refreshInterval: '30s' },
  { name: 'Inventory Health', entity: 'Inventory', metrics: ['totalProducts', 'lowStockCount', 'outOfStockCount', 'inventoryValue', 'turnoverRate'], layout: 'grid' },
  { name: 'Customer Insights', entity: 'Customer', metrics: ['totalCustomers', 'newCustomers', 'repeatCustomerRate', 'customerLifetimeValue', 'topCustomers'], layout: 'tabs' },
  { name: 'Fulfillment Status', entity: 'Order', metrics: ['pendingOrders', 'processingOrders', 'shippedOrders', 'deliveredOrders', 'avgFulfillmentTime'], streamMode: 'realtime' }
];

// ============================================================================
// WORKFLOWS
// ============================================================================

const workflows: Workflow[] = [
  { name: 'OrderFulfillment', trigger: 'OrderPlaced.event', steps: [
    { name: 'validateInventory', action: 'checkStock', onSuccess: 'allocateStock', onFailure: 'notifyOutOfStock' },
    { name: 'allocateStock', action: 'reserveInventory', onSuccess: 'processPayment', onFailure: 'releaseHold' },
    { name: 'processPayment', action: 'chargeCustomer', onSuccess: 'createShipment', onFailure: 'handlePaymentFailure' },
    { name: 'createShipment', action: 'generateLabel', onSuccess: 'notifyCustomer' }
  ]},
  { name: 'ReturnProcessing', trigger: 'ReturnRequested.event', steps: [
    { name: 'validateReturn', action: 'checkReturnPolicy', onSuccess: 'approveReturn', onFailure: 'rejectReturn' },
    { name: 'approveReturn', action: 'createReturnLabel', onSuccess: 'trackReturn' },
    { name: 'processRefund', action: 'issueRefund', onSuccess: 'restockInventory', onFailure: 'escalateToSupport' }
  ]}
];

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const env: EnvVar[] = [
  { name: 'API_PORT', type: 'Int', default: 8080 },
  { name: 'DATABASE_URL', type: 'String', required: true, secret: true },
  { name: 'REDIS_URL', type: 'String', required: true, secret: true },
  { name: 'JWT_SECRET', type: 'String', required: true, secret: true },
  { name: 'ELASTICSEARCH_URL', type: 'String', required: true },
  { name: 'STRIPE_SECRET_KEY', type: 'String', required: true, secret: true },
  { name: 'STRIPE_WEBHOOK_SECRET', type: 'String', required: true, secret: true },
  { name: 'APP_DOMAIN', type: 'String', default: 'localhost' },
  { name: 'HOSTING_PROVIDER', type: 'String', default: 'docker' }
];

// ============================================================================
// COMPLETE CONTRACT
// ============================================================================

export const contract: ReclappContract = {
  app: {
    name: 'E-Commerce Platform',
    version: '2.1.0',
    description: 'Full e-commerce solution with products, orders, and payments',
    author: 'Reclapp Team',
    license: 'MIT'
  },
  
  deployment: {
    type: 'web',
    framework: 'nextjs',
    build: { outputDir: 'target', nodeVersion: '18' },
    hosting: { provider: 'docker', domain: { primary: '${APP_DOMAIN}' } }
  },
  
  backend: {
    runtime: 'node',
    framework: 'express',
    port: '${API_PORT:8080}',
    database: { type: 'postgres', url: '${DATABASE_URL}', poolSize: 10 },
    cache: { type: 'redis', url: '${REDIS_URL}' },
    auth: { type: 'jwt', secret: '${JWT_SECRET}' },
    search: { type: 'elasticsearch', url: '${ELASTICSEARCH_URL}' }
  },
  
  frontend: {
    framework: 'react',
    bundler: 'nextjs',
    style: 'tailwindcss',
    components: 'shadcn',
    layout: {
      type: 'e-commerce',
      navigation: [
        { icon: 'home', label: 'Home', path: '/' },
        { icon: 'grid', label: 'Products', path: '/products' },
        { icon: 'shopping-cart', label: 'Cart', path: '/cart' },
        { icon: 'user', label: 'Account', path: '/account' }
      ]
    }
  },
  
  sources: [
    { name: 'inventoryApi', type: 'rest', url: '${INVENTORY_API_URL}', auth: 'apiKey', cacheDuration: '1m' },
    { name: 'paymentGateway', type: 'rest', url: 'https://api.stripe.com/v1', auth: 'bearer' },
    { name: 'shippingProvider', type: 'rest', url: '${SHIPPING_API_URL}', auth: 'apiKey' }
  ],
  
  entities: [Product, Category, Inventory, Customer, Order, OrderItem, Cart, Shipment],
  events,
  pipelines,
  alerts,
  dashboards,
  workflows,
  env,
  
  config: {
    store: { currency: 'USD', timezone: 'America/New_York', taxIncluded: false, freeShippingThreshold: 50 },
    inventory: { defaultLowStockThreshold: 10, reservationTimeout: 900, autoReorderEnabled: true }
  }
};

export default contract;
