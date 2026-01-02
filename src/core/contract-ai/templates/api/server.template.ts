/**
 * Express Server Template
 * 
 * This template is used as fallback when LLM is unavailable.
 * Variables: {{PORT}}, {{ENTITY_STORAGE}}, {{ROUTES}}
 */

export const serverTemplate = `import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || {{PORT}};

app.use(cors());
app.use(express.json());

// In-memory storage
{{ENTITY_STORAGE}}
let idCounter = 1;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

{{ROUTES}}

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});
`;

export const entityStorageTemplate = `const {{plural}}: Map<string, any> = new Map();`;

export const entityRoutesTemplate = `
// === {{Entity}} Routes ===
app.get('/api/v1/{{plural}}', (req, res) => {
  res.json(Array.from({{plural}}.values()));
});

app.get('/api/v1/{{plural}}/:id', (req, res) => {
  const item = {{plural}}.get(req.params.id);
  if (!item) return res.status(404).json({ error: '{{Entity}} not found' });
  res.json(item);
});

app.post('/api/v1/{{plural}}', (req, res) => {
  const id = String(idCounter++);
  const item = { id, ...req.body, createdAt: new Date().toISOString() };
  {{plural}}.set(id, item);
  res.status(201).json(item);
});

app.put('/api/v1/{{plural}}/:id', (req, res) => {
  if (!{{plural}}.has(req.params.id)) return res.status(404).json({ error: '{{Entity}} not found' });
  const item = { ...{{plural}}.get(req.params.id), ...req.body, updatedAt: new Date().toISOString() };
  {{plural}}.set(req.params.id, item);
  res.json(item);
});

app.delete('/api/v1/{{plural}}/:id', (req, res) => {
  if (!{{plural}}.has(req.params.id)) return res.status(404).json({ error: '{{Entity}} not found' });
  {{plural}}.delete(req.params.id);
  res.status(204).send();
});`;

export default { serverTemplate, entityStorageTemplate, entityRoutesTemplate };
