# E2E Tests for Reclapp Examples

End-to-end tests for all Reclapp contract examples.

## Quick Start

```bash
# Fix any known issues first
./fix-examples.sh

# Run all E2E tests
./run-all.sh

# Test a single example
./test-example.sh b2b-risk-monitoring
```

## Test Results Summary

| Example | Status | Port | Notes |
| ------- | ------ | ---- | ----- |
| Root Stack | ✅ Pass | 8080 | API healthy, endpoints working |
| b2b-risk-monitoring | ✅ Pass | 8081 | All endpoints working |
| iot-monitoring | ✅ Pass | 8082 | Fixed mosquitto config |
| multi-agent | ✅ Pass | 8090 | Orchestrator + agents healthy |
| saas-starter | ✅ Pass | 8083 | Organizations, users, subscriptions |
| e-commerce | ✅ Pass | 8084 | Products, orders, inventory |
| crm | ✅ Pass | 8085 | Contacts, deals, pipeline |

## Known Issues

### 1. IoT Monitoring - Mosquitto Config

The mosquitto config file gets owned by container user (1883) after first run.

**Fix:**
```bash
sudo chown -R $USER:$USER examples/iot-monitoring/mosquitto/
./tests/e2e/fix-examples.sh
```

### 2. Port Conflicts

If examples fail with port conflicts, ensure previous tests were cleaned up:

```bash
docker compose down -v
```

## Adding New Tests

1. Add test cases in `run_example_tests()` function in `run-all.sh`
2. Include health check endpoints and key API tests
3. Use standard port mappings:
   - Root: 8080, 3000
   - b2b-risk-monitoring: 8081, 3001
   - iot-monitoring: 8082, 3002
   - multi-agent: 8090-8093, 3003

## CI Integration

The tests are designed to work with GitHub Actions:

```yaml
- name: Run E2E Tests
  run: |
    ./tests/e2e/fix-examples.sh
    ./tests/e2e/run-all.sh
```
