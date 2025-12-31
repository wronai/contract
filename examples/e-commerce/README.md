# E-Commerce Example

Full e-commerce platform with products, orders, inventory, and payments.

## Features

- **Product Catalog**: Products with categories, variants, and images
- **Shopping Cart**: Session-based cart with persistence
- **Order Management**: Complete order lifecycle
- **Inventory Tracking**: Multi-warehouse inventory
- **Payment Processing**: Stripe integration
- **Shipping**: Multi-carrier shipping support
- **Reviews**: Product reviews and ratings

## Contract Overview

```dsl
ENTITY Product       - Product catalog
ENTITY Category      - Product categories
ENTITY Inventory     - Stock management
ENTITY Customer      - Customer accounts
ENTITY Order         - Order records
ENTITY Cart          - Shopping carts
ENTITY Shipment      - Shipping tracking
```

## Quick Start

```bash
# Generate application
reclapp generate ./contracts/main.reclapp -o ./src -t full-stack

# Install dependencies
cd src && npm install

# Run development
npm run dev
```

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/ecommerce
STRIPE_API_KEY=sk_test_...
INVENTORY_API_URL=https://inventory.example.com
SHIPPING_API_URL=https://shipping.example.com
```

## Dashboards

- **Sales Overview**: Revenue, orders, conversion rate
- **Inventory Health**: Stock levels, low stock alerts
- **Customer Insights**: Customer LTV, repeat rate
- **Fulfillment Status**: Order processing pipeline

## Pipelines

- **OrderProcessing**: Validate → Pay → Reserve → Ship
- **InventorySync**: External inventory synchronization
- **RecommendationEngine**: Personalized recommendations
- **FraudDetection**: Real-time fraud scoring
