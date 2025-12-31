/**
 * IoT Device Monitoring API Server
 * Reclapp 2.1.0 Example
 */

import express, { Request, Response, NextFunction } from 'express';
import mqtt, { MqttClient } from 'mqtt';
import { InfluxDB, Point, WriteApi } from '@influxdata/influxdb-client';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  port: parseInt(process.env.PORT || '8080'),
  nodeEnv: process.env.NODE_ENV || 'development',
  mqtt: {
    broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883'
  },
  influxdb: {
    url: process.env.INFLUXDB_URL || 'http://localhost:8086',
    token: process.env.INFLUXDB_TOKEN || 'reclapp-token',
    org: process.env.INFLUXDB_ORG || 'reclapp',
    bucket: process.env.INFLUXDB_BUCKET || 'iot_metrics'
  },
  anomalyDetection: {
    enabled: process.env.ANOMALY_DETECTION_ENABLED === 'true',
    threshold: parseFloat(process.env.ANOMALY_THRESHOLD || '0.7')
  }
};

// ============================================================================
// INFLUXDB CLIENT
// ============================================================================

const influxDB = new InfluxDB({
  url: config.influxdb.url,
  token: config.influxdb.token
});

const writeApi: WriteApi = influxDB.getWriteApi(
  config.influxdb.org,
  config.influxdb.bucket,
  'ns'
);

// ============================================================================
// MQTT CLIENT
// ============================================================================

let mqttClient: MqttClient;

// Device state storage (in-memory for simplicity)
const devices: Map<string, DeviceState> = new Map();

interface DeviceState {
  deviceId: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: Date;
  temperature?: number;
  humidity?: number;
  batteryLevel?: number;
  healthScore: number;
}

interface TelemetryData {
  deviceId: string;
  sensorType: string;
  value: number;
  unit: string;
  timestamp: string;
}

function connectMQTT(retries = 5, delay = 3000): Promise<void> {
  return new Promise((resolve) => {
    let attempt = 0;
    
    const tryConnect = () => {
      attempt++;
      console.log(`MQTT connecting (attempt ${attempt}/${retries})...`);
      
      mqttClient = mqtt.connect(config.mqtt.broker, {
        reconnectPeriod: 5000,
        connectTimeout: 10000
      });
      
      mqttClient.on('connect', () => {
        console.log('✓ MQTT connected');
        
        // Subscribe to device topics
        mqttClient.subscribe('devices/+/telemetry');
        mqttClient.subscribe('devices/+/status');
        mqttClient.subscribe('devices/+/alerts');
        resolve();
      });
      
      mqttClient.on('message', async (topic: string, message: Buffer) => {
        try {
          const parts = topic.split('/');
          const deviceId = parts[1];
          const messageType = parts[2];
          const payload = JSON.parse(message.toString());
          
          await handleDeviceMessage(deviceId, messageType, payload);
        } catch (error) {
          console.error('Error processing MQTT message:', error);
        }
      });
      
      mqttClient.on('error', (error) => {
        console.error('MQTT error:', error);
        if (attempt < retries) {
          mqttClient.end(true);
          setTimeout(tryConnect, delay);
        } else {
          console.warn('MQTT connection failed after max retries, continuing without MQTT');
          resolve();
        }
      });
    };
    
    tryConnect();
  });
}

async function handleDeviceMessage(deviceId: string, messageType: string, payload: any) {
  // Update device state
  let device = devices.get(deviceId);
  if (!device) {
    device = {
      deviceId,
      name: payload.name || deviceId,
      type: payload.type || 'sensor',
      status: 'online',
      lastSeen: new Date(),
      healthScore: 100
    };
    devices.set(deviceId, device);
  }
  
  device.lastSeen = new Date();
  device.status = 'online';
  
  switch (messageType) {
    case 'telemetry':
      await handleTelemetry(device, payload);
      break;
    case 'status':
      device.status = payload.status;
      break;
    case 'alerts':
      await handleAlert(device, payload);
      break;
  }
}

async function handleTelemetry(device: DeviceState, payload: TelemetryData) {
  // Update device state
  if (payload.sensorType === 'temperature') {
    device.temperature = payload.value;
  } else if (payload.sensorType === 'humidity') {
    device.humidity = payload.value;
  } else if (payload.sensorType === 'battery') {
    device.batteryLevel = payload.value;
  }
  
  // Write to InfluxDB
  const point = new Point('device_telemetry')
    .tag('deviceId', device.deviceId)
    .tag('sensorType', payload.sensorType)
    .floatField('value', payload.value)
    .timestamp(new Date(payload.timestamp));
  
  writeApi.writePoint(point);
  
  // Check for anomalies
  if (config.anomalyDetection.enabled) {
    const anomalyScore = detectAnomaly(device, payload);
    if (anomalyScore > config.anomalyDetection.threshold) {
      await createAlert(device, 'anomaly_detected', {
        sensorType: payload.sensorType,
        value: payload.value,
        anomalyScore
      });
    }
  }
  
  // Update health score
  updateHealthScore(device);
}

function detectAnomaly(device: DeviceState, payload: TelemetryData): number {
  // Simple anomaly detection based on thresholds
  // In production, use more sophisticated algorithms
  if (payload.sensorType === 'temperature' && (payload.value > 80 || payload.value < -20)) {
    return 0.9;
  }
  if (payload.sensorType === 'humidity' && (payload.value > 95 || payload.value < 5)) {
    return 0.8;
  }
  if (payload.sensorType === 'battery' && payload.value < 10) {
    return 0.85;
  }
  return 0;
}

function updateHealthScore(device: DeviceState) {
  let score = 100;
  
  // Temperature factor
  if (device.temperature !== undefined) {
    if (device.temperature > 70) score -= 20;
    else if (device.temperature > 50) score -= 10;
  }
  
  // Battery factor
  if (device.batteryLevel !== undefined) {
    if (device.batteryLevel < 10) score -= 30;
    else if (device.batteryLevel < 30) score -= 15;
  }
  
  device.healthScore = Math.max(0, Math.min(100, score));
}

async function handleAlert(device: DeviceState, payload: any) {
  await createAlert(device, payload.alertType, payload);
}

async function createAlert(device: DeviceState, alertType: string, data: any) {
  console.log(`[ALERT] Device ${device.deviceId}: ${alertType}`, data);
  
  // Write alert to InfluxDB
  const point = new Point('device_alerts')
    .tag('deviceId', device.deviceId)
    .tag('alertType', alertType)
    .stringField('data', JSON.stringify(data))
    .timestamp(new Date());
  
  writeApi.writePoint(point);
}

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    version: '1.0.0',
    mqttConnected: mqttClient?.connected || false,
    deviceCount: devices.size,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// DEVICE ENDPOINTS
// ============================================================================

// List devices
app.get('/api/v1/devices', (req: Request, res: Response) => {
  const deviceList = Array.from(devices.values());
  res.json({ devices: deviceList });
});

// Get device details
app.get('/api/v1/devices/:deviceId', (req: Request, res: Response) => {
  const device = devices.get(req.params.deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  res.json({ device });
});

// Send command to device
app.post('/api/v1/devices/:deviceId/command', (req: Request, res: Response) => {
  const { deviceId } = req.params;
  const { command, parameters } = req.body;
  
  const device = devices.get(deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  // Publish command to MQTT
  const topic = `reclapp/commands/${deviceId}`;
  const payload = JSON.stringify({ command, parameters, timestamp: new Date().toISOString() });
  
  mqttClient.publish(topic, payload, { qos: 1 }, (error) => {
    if (error) {
      return res.status(500).json({ error: 'Failed to send command' });
    }
    res.json({ success: true, message: 'Command sent' });
  });
});

// ============================================================================
// METRICS ENDPOINTS
// ============================================================================

// Get device metrics
app.get('/api/v1/devices/:deviceId/metrics', async (req: Request, res: Response) => {
  const { deviceId } = req.params;
  const { range = '1h' } = req.query;
  
  try {
    const queryApi = influxDB.getQueryApi(config.influxdb.org);
    const query = `
      from(bucket: "${config.influxdb.bucket}")
        |> range(start: -${range})
        |> filter(fn: (r) => r.deviceId == "${deviceId}")
        |> filter(fn: (r) => r._measurement == "device_telemetry")
    `;
    
    const results: any[] = [];
    await queryApi.collectRows(query, (row) => results.push(row));
    
    res.json({ metrics: results });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// ============================================================================
// DASHBOARD ENDPOINT
// ============================================================================

app.get('/api/v1/dashboard', (req: Request, res: Response) => {
  const deviceList = Array.from(devices.values());
  
  const summary = {
    totalDevices: deviceList.length,
    onlineDevices: deviceList.filter(d => d.status === 'online').length,
    offlineDevices: deviceList.filter(d => d.status === 'offline').length,
    errorDevices: deviceList.filter(d => d.status === 'error').length,
    avgHealthScore: deviceList.length > 0 
      ? deviceList.reduce((sum, d) => sum + d.healthScore, 0) / deviceList.length 
      : 0,
    criticalDevices: deviceList.filter(d => d.healthScore < 30).length,
    warningDevices: deviceList.filter(d => d.healthScore >= 30 && d.healthScore < 70).length
  };
  
  res.json({
    summary,
    devices: deviceList.slice(0, 10),
    generatedAt: new Date().toISOString()
  });
});

// ============================================================================
// MCP ENDPOINT
// ============================================================================

app.post('/mcp', async (req: Request, res: Response) => {
  const { jsonrpc, id, method, params } = req.body;
  
  let result: any = null;
  let error: any = null;
  
  switch (method) {
    case 'initialize':
      result = {
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'reclapp-iot-monitoring', version: '1.0.0' },
        capabilities: { resources: {}, tools: {}, prompts: {} }
      };
      break;
    
    case 'tools/list':
      result = {
        tools: [
          { name: 'query_device', description: 'Query device status' },
          { name: 'send_command', description: 'Send command to device' }
        ]
      };
      break;
    
    default:
      error = { code: -32601, message: `Method not found: ${method}` };
  }
  
  res.json({ jsonrpc: '2.0', id, result, error });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// START SERVER
// ============================================================================

async function start() {
  try {
    // Connect to MQTT (with retries)
    await connectMQTT();
    
    app.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          IoT Monitoring API - Reclapp 2.1.0                   ║
╠═══════════════════════════════════════════════════════════════╣
║  Port:        ${config.port}                                         ║
║  Environment: ${config.nodeEnv.padEnd(45)}║
║  MQTT:        ${config.mqtt.broker.padEnd(45)}║
║  Anomaly:     ${config.anomalyDetection.enabled}                                       ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
