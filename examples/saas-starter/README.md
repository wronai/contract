# SaaS Starter Example

Multi-tenant SaaS application with subscriptions, billing, and user management.

## Features

- **Organizations**: Multi-tenant support with organization-based isolation
- **Users**: User management with roles and permissions
- **Subscriptions**: Stripe integration for billing and subscriptions
- **Usage Tracking**: Monitor API usage and enforce limits
- **Audit Logs**: Complete activity tracking

## Contract Overview

```dsl
ENTITY Organization    - Multi-tenant accounts
ENTITY User           - User accounts
ENTITY Subscription   - Billing subscriptions
ENTITY Invoice        - Payment records
ENTITY Usage          - Usage metrics
ENTITY AuditLog       - Activity tracking
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
DATABASE_URL=postgresql://user:pass@localhost:5432/saas
STRIPE_API_KEY=sk_test_...
AUTH_PROVIDER_URL=https://auth.example.com
JWT_SECRET=your-secret
```

## Dashboards

- **SaaS Metrics**: MRR, ARR, churn rate, LTV
- **Revenue Analytics**: Revenue breakdown by plan
- **User Activity**: DAU, WAU, MAU tracking

## Alerts

- Payment failures (critical)
- Subscription cancellations (high)
- Usage limit warnings (medium)
- Trial expiring (medium)
