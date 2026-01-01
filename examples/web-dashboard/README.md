# Analytics Dashboard

Real-time analytics dashboard for tracking user events, page views, and business metrics.

> **Self-Sufficient DSL**: All source code is generated from `contracts/analytics.reclapp`. No manual `src/` files needed.

## Quick Start

```bash
# Generate application from DSL
reclapp generate contracts/analytics.reclapp --output target/

# Start with Docker Compose
cd target && docker-compose up -d

# Or run locally
cd target && npm install && npm run dev
```

## Project Structure

```text
web-dashboard/
├── contracts/
│   └── analytics.reclapp    # DSL definition (single source of truth)
├── .env.example             # Environment template
├── .env                     # Local config (gitignored)
├── README.md
└── target/                  # Generated (gitignored)
    ├── src/
    ├── package.json
    ├── docker-compose.yml
    └── ...
```

## Deployment

```bash
# Deploy to Vercel
reclapp deploy contracts/analytics.reclapp --provider vercel

# Deploy to custom infrastructure
reclapp generate contracts/analytics.reclapp --output target/
cd target && docker-compose -f docker-compose.prod.yml up -d
```

## Features

- Real-time event tracking
- User analytics and cohort analysis
- Custom funnels and conversion tracking
- Automated alerts and reporting
- WebSocket live dashboard updates

## License

MIT
