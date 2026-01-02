# Reclapp Setup Guide

Platform: **Linux**

Generated: 2026-01-02T18:43:24.260Z

---

## 🔧 Optional Dependencies

These may be needed depending on your use case:

### Install PostgreSQL

Install PostgreSQL for database support

```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

📖 Documentation: https://postgresql.org

### Install Redis

Install Redis for caching

```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

📖 Documentation: https://redis.io

---

## Quick Start

```bash
# After installing dependencies:
reclapp evolve -p "Create a todo app" -o ./my-app
```
