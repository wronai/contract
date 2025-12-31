# IoT Device Monitoring Example

Przykład monitoringu urządzeń IoT z wykorzystaniem Reclapp, MQTT i causal analysis.

## Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│                    IOT DEVICE MONITORING                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Devices  │───▶│ MQTT     │───▶│ Reclapp  │───▶│ Alert    │  │
│  │ Sensors  │    │ Broker   │    │ Engine   │    │ System   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │                               │               │          │
│       │          ┌──────────┐         │               │          │
│       └─────────▶│ InfluxDB │◀────────┘               │          │
│                  │TimeSeries│                         │          │
│                  └──────────┘                         │          │
│                       │                               │          │
│                       ▼                               │          │
│                  ┌──────────┐    ┌──────────┐        │          │
│                  │ Grafana  │◀───│ Anomaly  │◀───────┘          │
│                  │Dashboard │    │Detection │                    │
│                  └──────────┘    └──────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Uruchom cały stack
docker compose up -d

# Uruchom z symulacją urządzeń
docker compose --profile simulation up -d

# Dashboard
open http://localhost:3000  # Grafana (admin/admin)

# MQTT test
mosquitto_pub -h localhost -t "devices/sensor-1/temperature" -m '{"value": 25.5}'
```

## Komponenty

- **reclapp-iot** - Główne API z DSL parser i MQTT handler
- **mosquitto** - MQTT Broker dla komunikacji IoT
- **influxdb** - Time-series database dla metryk
- **grafana** - Dashboardy i wizualizacje
- **device-simulator** - Symulator urządzeń IoT

## Features

- Real-time monitoring urządzeń
- Anomaly detection z causal analysis
- Predictive maintenance
- Alerting przy przekroczeniu progów
- Historical analysis

## MQTT Topics

| Topic | Opis |
|-------|------|
| `devices/+/temperature` | Odczyty temperatury |
| `devices/+/humidity` | Odczyty wilgotności |
| `devices/+/status` | Status urządzenia |
| `devices/+/alerts` | Alerty z urządzenia |
| `reclapp/commands/+` | Komendy do urządzeń |

## DSL Example

```reclapp
ENTITY Device {
  FIELD id: UUID @generated
  FIELD name: String @required
  FIELD type: String @enum("sensor", "actuator", "gateway")
  FIELD status: String @enum("online", "offline", "error")
  FIELD temperature: Float
  FIELD humidity: Float
  FIELD lastSeen: DateTime
}

ALERT "High Temperature" {
  ENTITY Device
  CONDITION temperature > 80
  TARGET slack, email
  SEVERITY high
  EXPLAIN_WITH temperature_trend, ambient_conditions
}

PIPELINE DeviceMonitoring {
  INPUT mqtt.devices.+.temperature
  TRANSFORM normalize, detectAnomaly
  OUTPUT influxdb.metrics, alerts
  SCHEDULE realtime
}
```
