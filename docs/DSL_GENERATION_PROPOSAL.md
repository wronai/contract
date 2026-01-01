# DSL-Based Full Application Generation - Proposal

## Overview

This document proposes enhancements to the Reclapp DSL system to enable **complete application generation** from a single DSL definition file. The goal is to eliminate the need for manual `src/` folders and generate all required files (backend, frontend, deployment configs) into a `target/` folder.

## Current State

Currently, examples contain:

- `contracts/*.reclapp.rcl` - Mini-DSL contracts (used by Studio + generation)
- `contracts/*.reclapp.ts` - Type-safe TypeScript contracts (validated source)
- `contracts/*.rcl.md` - Markdown contracts (readable + chat history)
- `src/` - Manually written server code (in some examples)
- `docker-compose.yml`, `Dockerfile`, `package.json` - Manual configurations (in some examples)

## Proposed Architecture

### Project Structure (After Enhancement)

```text
my-app/
├── contracts/
│   └── main.reclapp.rcl      # Single source of truth (Mini-DSL)
│   └── main.reclapp.ts       # Optional: type-safe variant
│   └── main.rcl.md           # Optional: readable doc + conversation
├── .env.example              # Environment variables template
├── .env                      # Local configuration (gitignored)
├── README.md                 # Generated documentation
├── overrides/                # Optional custom code extensions
│   ├── components/
│   └── api/
└── target/                   # All generated files (gitignored)
    ├── backend/
    │   ├── src/
    │   │   ├── server.ts
    │   │   ├── routes/
    │   │   ├── models/
    │   │   ├── services/
    │   │   └── middleware/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── Dockerfile
    ├── frontend/
    │   ├── src/
    │   │   ├── App.tsx
    │   │   ├── components/
    │   │   ├── pages/
    │   │   ├── hooks/
    │   │   └── lib/
    │   ├── package.json
    │   ├── vite.config.ts
    │   └── Dockerfile
    ├── migrations/
    ├── assets/
    ├── package.json
    ├── docker-compose.yml
    ├── docker-compose.prod.yml
    └── README.md
```

## New DSL Sections

### 1. APP - Application Metadata

```dsl
APP "My Application" {
  VERSION "1.0.0"
  DESCRIPTION "Application description"
  AUTHOR "Team Name"
  LICENSE "MIT"
  REPOSITORY "https://github.com/org/repo"
}
```

### 2. DEPLOYMENT - Build and Deployment Configuration

```dsl
DEPLOYMENT web {
  FRAMEWORK nextjs | react | vue | svelte | electron
  
  BUILD {
    OUTPUT_DIR "target"
    NODE_VERSION "18"
    OUTPUT_MODE "standalone" | "static" | "server"
  }
  
  HOSTING {
    PROVIDER "vercel" | "netlify" | "docker" | "kubernetes"
    REGION "eu-central-1"
    
    DOMAIN {
      PRIMARY "app.example.com"
      REDIRECT_WWW true
    }
    
    SSL {
      ENABLED true
      PROVIDER "auto" | "letsencrypt" | "custom"
    }
  }
  
  SCALING {
    MIN_INSTANCES 1
    MAX_INSTANCES 10
    AUTO_SCALE true
  }
  
  CDN {
    ENABLED true
    CACHE_STATIC "31536000"
  }
}

DEPLOYMENT desktop {
  FRAMEWORK electron
  PLATFORMS ["win", "mac", "linux"]
  
  BUILD {
    BUNDLE_ID "com.company.app"
    APP_NAME "My App"
    ICONS { WIN "icon.ico", MAC "icon.icns", LINUX "icon.png" }
    SIGNING { WIN "${WIN_CERT}", MAC "${MAC_CERT}" }
  }
  
  AUTO_UPDATE {
    ENABLED true
    PROVIDER "github" | "s3" | "custom"
  }
}

DEPLOYMENT mobile {
  FRAMEWORK "react-native" | "flutter" | "capacitor"
  PLATFORMS ["ios", "android"]
  
  BUILD {
    BUNDLE_ID "com.company.app"
    APP_NAME "My App"
  }
}
```

### 3. BACKEND - Server Configuration

```dsl
BACKEND api {
  RUNTIME node | python | go | rust
  FRAMEWORK express | fastify | fastapi | gin
  PORT "${API_PORT:8080}"
  
  DATABASE {
    TYPE postgres | mysql | sqlite | mongodb
    URL "${DATABASE_URL}"
    POOL_SIZE 10
    MIGRATIONS "target/migrations"
  }
  
  CACHE {
    TYPE redis | memcached | memory
    URL "${REDIS_URL}"
    TTL_DEFAULT 300
  }
  
  AUTH {
    TYPE jwt | oauth2 | session | apiKey
    PROVIDERS ["google", "github", "email"]
    SECRET "${JWT_SECRET}"
    EXPIRY "24h"
  }
  
  CORS {
    ORIGINS ["http://localhost:*"]
    CREDENTIALS true
  }
  
  RATE_LIMIT {
    WINDOW_MS 60000
    MAX_REQUESTS 100
  }
  
  WEBHOOKS {
    STRIPE { SECRET "${STRIPE_SECRET}", EVENTS ["*"] }
  }
}
```

### 4. FRONTEND - UI Configuration

```dsl
FRONTEND my_ui {
  FRAMEWORK react | vue | svelte | angular
  BUNDLER vite | webpack | nextjs | parcel
  STYLE tailwindcss | css-modules | styled-components
  COMPONENTS shadcn | material | ant-design | chakra
  
  THEME {
    MODE "light" | "dark" | "system"
    PRIMARY "#3b82f6"
    ACCENT "#10b981"
    CHARTS ["#6366f1", "#22c55e", "#f59e0b"]
  }
  
  LAYOUT {
    TYPE "sidebar" | "topnav" | "dashboard" | "app-shell"
    NAVIGATION [
      { ICON "home", LABEL "Dashboard", PATH "/" },
      { ICON "users", LABEL "Users", PATH "/users" }
    ]
  }
  
  PAGES {
    PUBLIC ["/", "/login", "/signup"]
    PROTECTED ["/dashboard/*", "/settings/*"]
  }
  
  SSR true
  OFFLINE_SUPPORT false
  PWA false
}
```

### 5. API - Auto-generated REST/GraphQL Endpoints

```dsl
API v1 {
  PREFIX "/api/v1"
  TYPE rest | graphql
  
  RESOURCE users {
    ENTITY User
    OPERATIONS [list, get, create, update, delete]
    AUTH required
    RATE_LIMIT 100
    
    NESTED posts {
      ENTITY Post
      OPERATIONS [list, get, create]
    }
    
    ACTION activate {
      METHOD POST
      PATH "/:id/activate"
      INPUT { code: String }
      OUTPUT { success: Boolean }
    }
  }
}
```

### 6. ENV - Environment Variables Documentation

```dsl
ENV {
  DATABASE_URL: String @secret
  API_PORT: Int = 8080
  DEBUG: Boolean = false
  ALLOWED_HOSTS: String[] = ["localhost"]
  OPTIONAL_VAR: String?
}
```

### 7. DOCKER - Container Configuration

```dsl
DOCKER {
  SERVICES [
    { NAME "app", BUILD ".", PORTS ["3000:3000"], DEPENDS_ON ["db"] },
    { NAME "db", IMAGE "postgres:15", VOLUMES ["db_data:/var/lib/postgresql/data"] }
  ]
  
  VOLUMES ["db_data", "cache_data"]
  
  NETWORKS ["frontend", "backend"]
}
```

### 8. IPC - Electron Inter-Process Communication

```dsl
IPC main_renderer {
  CHANNELS [
    { NAME "data:update", DIRECTION "main->renderer", DATA MyEntity },
    { NAME "action:trigger", DIRECTION "renderer->main", DATA { action: String } }
  ]
}
```

### 9. TRAY - System Tray Configuration

```dsl
TRAY {
  ICON "assets/tray.png"
  TOOLTIP "My App"
  
  MENU [
    { LABEL "Open", ACTION "window:show" },
    { TYPE "separator" },
    { LABEL "Quit", ACTION "app:quit" }
  ]
}
```

### 10. WEBSOCKET - Real-time Communication

```dsl
WEBSOCKET realtime {
  AUTH jwt
  
  CHANNELS [
    { NAME "updates", SUBSCRIBE true, DATA Event },
    { NAME "notifications", SUBSCRIBE true, PUBLISH false }
  ]
  
  HEARTBEAT 30000
}
```

## CLI Commands

### Generate Application

```bash
# Generate all files from DSL
reclapp generate contracts/main.reclapp --output target/

# Generate specific parts only
reclapp generate contracts/main.reclapp --output target/ --only backend
reclapp generate contracts/main.reclapp --output target/ --only frontend

# Watch mode for development
reclapp generate contracts/main.reclapp --output target/ --watch
```

### Run Application

```bash
# Run with auto-generation
reclapp dev contracts/main.reclapp

# Run specific environment
reclapp dev contracts/main.reclapp --env production
```

### Deploy Application

```bash
# Deploy to configured provider
reclapp deploy contracts/main.reclapp --env production

# Deploy to specific provider
reclapp deploy contracts/main.reclapp --provider vercel
reclapp deploy contracts/main.reclapp --provider docker --registry ghcr.io/org

# Deploy to URL
reclapp deploy contracts/main.reclapp --url https://app.example.com
```

### Other Commands

```bash
# Validate DSL syntax
reclapp validate contracts/main.reclapp

# Generate database migrations
reclapp migrate contracts/main.reclapp --output target/migrations/

# Generate API documentation
reclapp docs contracts/main.reclapp --output target/docs/

# Generate types/SDK for clients
reclapp sdk contracts/main.reclapp --language typescript --output target/sdk/
```

## Code Generation Templates

The system uses templates for code generation:

```text
templates/
├── backend/
│   ├── express/
│   ├── fastify/
│   ├── fastapi/
│   └── gin/
├── frontend/
│   ├── react/
│   ├── vue/
│   ├── svelte/
│   └── nextjs/
├── desktop/
│   └── electron/
├── mobile/
│   ├── react-native/
│   └── capacitor/
└── infrastructure/
    ├── docker/
    ├── kubernetes/
    └── terraform/
```

## Extension Points

### Custom Overrides

Place custom code in `overrides/` folder:

```text
overrides/
├── components/
│   └── CustomChart.tsx      # Custom UI component
├── api/
│   └── customEndpoint.ts    # Custom API handler
└── services/
    └── externalIntegration.ts
```

Use `@override` annotation in DSL:

```dsl
DASHBOARD "Custom" {
  WIDGETS [
    { TYPE "custom", COMPONENT "overrides/components/CustomChart.tsx" }
  ]
}
```

### Plugins

```dsl
PLUGINS [
  "@reclapp/plugin-stripe",
  "@reclapp/plugin-analytics",
  "./my-custom-plugin"
]
```

## Implementation Roadmap

### Phase 1: Core Generation (MVP)

- [ ] DSL parser for new sections
- [ ] Backend code generation (Express/Node)
- [ ] Frontend code generation (React/Vite)
- [ ] Docker Compose generation
- [ ] Basic CLI commands

### Phase 2: Extended Platforms

- [ ] Next.js support
- [ ] Electron desktop apps
- [ ] Database migrations
- [ ] Multiple database support

### Phase 3: Advanced Features

- [ ] GraphQL API generation
- [ ] WebSocket real-time support
- [ ] Mobile app generation
- [ ] Kubernetes manifests
- [ ] Terraform infrastructure

### Phase 4: Developer Experience

- [ ] Watch mode with hot reload
- [ ] VSCode extension
- [ ] Type-safe SDK generation
- [ ] API documentation generation
- [ ] Testing scaffolding

## Benefits

1. **Single Source of Truth**: All application logic in one DSL file
2. **No Manual Boilerplate**: Backend, frontend, configs auto-generated
3. **Consistent Architecture**: Standardized patterns across projects
4. **Easy Deployment**: One command to deploy anywhere
5. **Version Control Friendly**: Only DSL changes tracked, generated code ignored
6. **Fast Iteration**: Change DSL, regenerate, test immediately
7. **Platform Agnostic**: Same DSL for web, desktop, mobile

## Example: Complete Application

```dsl
// Complete SaaS application in one file

APP "TaskManager" {
  VERSION "1.0.0"
  DESCRIPTION "Simple task management app"
}

DEPLOYMENT web {
  FRAMEWORK nextjs
  HOSTING { PROVIDER "vercel", DOMAIN { PRIMARY "tasks.example.com" } }
}

BACKEND api {
  RUNTIME node
  DATABASE { TYPE postgres, URL "${DATABASE_URL}" }
  AUTH { TYPE jwt, SECRET "${JWT_SECRET}" }
}

FRONTEND ui {
  FRAMEWORK react
  STYLE tailwindcss
  LAYOUT { TYPE sidebar }
}

ENTITY Task {
  title: String
  completed: Boolean
  userId: String @relation(User)
  createdAt: DateTime @generated
}

ENTITY User {
  email: String @unique
  name: String
}

API v1 {
  RESOURCE tasks {
    ENTITY Task
    OPERATIONS [list, get, create, update, delete]
    AUTH required
  }
}

DASHBOARD "Tasks" {
  METRICS ["totalTasks", "completedTasks", "pendingTasks"]
  WIDGETS [
    { TYPE "stat", TITLE "Total", METRIC "totalTasks" },
    { TYPE "table", ENTITY "Task" }
  ]
}

ENV {
  DATABASE_URL: String @secret
  JWT_SECRET: String @secret
}
```

Run: `./bin/reclapp dev contracts/main.reclapp.rcl` → Full working app at `http://localhost:3000`

## Conclusion

This proposal transforms Reclapp DSL from a contract/specification language into a complete application definition language. By generating all code from DSL, we achieve:

- Faster development cycles
- Consistent codebases
- Easier maintenance
- Simplified deployment
- Better documentation

The system remains extensible through overrides and plugins while providing sensible defaults for common patterns.
