# Investment Portfolio Manager

Desktop Electron application for investment tracking and portfolio analysis.

> **Note**: This example demonstrates a self-sufficient DSL approach. All source code, configurations, and deployment files are generated from the single `contracts/investment.reclapp` file.

## Quick Start

### Prerequisites

- Node.js 18+
- Reclapp CLI (`npm install -g @reclapp/cli`)

### Generate & Run

```bash
# Generate all files from DSL
reclapp generate contracts/investment.reclapp --output target/

# Install dependencies
cd target && npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Package for distribution
npm run dist
```

### Using Docker (API-only mode)

```bash
# Generate and run with Docker
reclapp generate contracts/investment.reclapp --output target/
cd target
docker-compose up -d
```

## Project Structure

```
desktop-electron/
├── contracts/
│   └── investment.reclapp    # Single source of truth - DSL definition
├── .env.example              # Environment variables template
├── .env                      # Your local configuration (not in git)
├── README.md                 # This file
└── target/                   # Generated files (gitignored)
    ├── backend/              # Express API server
    ├── frontend/             # React UI with Vite
    ├── electron/             # Electron main process
    ├── migrations/           # Database migrations
    ├── assets/               # Icons and static files
    ├── package.json          # Root package.json
    ├── electron-builder.yml  # Electron packaging config
    └── docker-compose.yml    # Docker configuration
```

## Features

### Portfolio Management
- Track multiple portfolios with different currencies
- Real-time price updates from market data APIs
- Automatic calculation of gains/losses
- Support for stocks, ETFs, crypto, bonds, and mutual funds

### Transaction Tracking
- Buy/sell transactions with fees
- Dividend tracking and reinvestment
- Multi-currency support with exchange rates
- Export to CSV/PDF

### Analytics
- Performance metrics (CAGR, Sharpe ratio, volatility)
- Benchmark comparison
- Sector/asset allocation charts
- Risk analysis

### Alerts
- Price target notifications
- Stop-loss alerts
- Dividend announcements
- Large portfolio movements

## Configuration

All configuration is done through environment variables. Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `API_PORT` | Backend API port | `8080` |
| `MARKET_DATA_URL` | Market data API endpoint | - |
| `MARKET_DATA_API_KEY` | API key for market data | - |
| `SESSION_SECRET` | Session encryption key | - |
| `AUTO_UPDATE_ENABLED` | Enable auto-updates | `true` |
| `LOG_LEVEL` | Logging level | `info` |

## DSL Overview

The `investment.reclapp` file defines:

- **DEPLOYMENT**: Electron packaging, platforms, signing
- **BACKEND**: API server, database, authentication
- **FRONTEND**: React UI, styling, components
- **ENTITIES**: Data models (Portfolio, Holding, Transaction, etc.)
- **EVENTS**: Business events for tracking
- **PIPELINES**: Data processing workflows
- **ALERTS**: Notification rules
- **DASHBOARDS**: UI dashboard definitions
- **API**: REST endpoints
- **IPC**: Electron inter-process communication
- **SCHEDULER**: Background tasks

## Development

### Modifying the DSL

1. Edit `contracts/investment.reclapp`
2. Run `reclapp generate` to regenerate files
3. Changes are reflected immediately in dev mode

### Adding Custom Code

For customizations not supported by DSL:
1. Create `overrides/` directory
2. Add custom files that will be merged during generation
3. Use `@override` annotations in DSL for extension points

## Testing

```bash
cd target

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run typecheck
```

## Building for Distribution

```bash
cd target

# Build for current platform
npm run dist

# Build for all platforms (requires appropriate environment)
npm run dist:all

# Output in target/dist/
```

## License

MIT
