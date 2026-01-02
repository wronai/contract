/**
 * React Frontend Templates
 * 
 * Variables: {{ENTITY}}, {{PLURAL}}, {{PORT}}
 */

export const mainTsxTemplate = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

export const appTsxTemplate = `import React, { useState, useEffect } from 'react';

interface {{ENTITY}} {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

const API_URL = 'http://localhost:{{PORT}}/api/v1/{{PLURAL}}';

function App() {
  const [items, setItems] = useState<{{ENTITY}}[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const newItem = await res.json();
      setItems([...items, newItem]);
      setName('');
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(\`\${API_URL}/\${id}\`, { method: 'DELETE' });
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{{ENTITY}} Manager</h1>
        
        <form onSubmit={addItem} className="mb-8 flex gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Add
          </button>
        </form>

        <ul className="space-y-4">
          {items.map(item => (
            <li key={item.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
              <span className="text-gray-800">{item.name}</span>
              <button
                onClick={() => deleteItem(item.id)}
                className="text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        {items.length === 0 && (
          <p className="text-center text-gray-500">No items yet. Add one above!</p>
        )}
      </div>
    </div>
  );
}

export default App;
`;

export const indexCssTemplate = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

export const indexHtmlTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ENTITY}} App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

export const viteConfigTemplate = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:{{PORT}}'
    }
  }
});
`;

export const tailwindConfigTemplate = `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: []
};
`;

export const frontendPackageTemplate = {
  name: "frontend",
  version: "1.0.0",
  type: "module",
  scripts: {
    dev: "vite",
    build: "vite build",
    preview: "vite preview"
  },
  dependencies: {
    react: "^18.2.0",
    "react-dom": "^18.2.0"
  },
  devDependencies: {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    autoprefixer: "^10.4.16",
    postcss: "^8.4.32",
    tailwindcss: "^3.4.0",
    typescript: "^5.3.0",
    vite: "^5.0.0"
  }
};

export default {
  mainTsxTemplate,
  appTsxTemplate,
  indexCssTemplate,
  indexHtmlTemplate,
  viteConfigTemplate,
  tailwindConfigTemplate,
  frontendPackageTemplate
};
