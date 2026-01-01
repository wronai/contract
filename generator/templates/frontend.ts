/**
 * Frontend Templates - React + Vite Generation
 */

import { kebab, camel, tsType } from './api';

export interface FrontendContext {
  appName: string;
  appVersion: string;
  entities: Array<{ name: string; fields: Array<{ name: string; type: string; nullable?: boolean }> }>;
}

export function appTemplate(ctx: FrontendContext): string {
  const imports = ctx.entities.map(e => 
    `import ${e.name}List from './components/${e.name}List';`
  ).join('\n');

  const navItems = ctx.entities.map(e => 
    `{ id: '${kebab(e.name)}s', label: '${e.name}s' }`
  ).join(', ');

  const cases = ctx.entities.map(e => 
    `case '${kebab(e.name)}s': return <${e.name}List />;`
  ).join('\n      ');

  const defaultTab = ctx.entities[0] ? `${kebab(ctx.entities[0].name)}s` : 'home';

  return `import React, { useState } from 'react';
import './index.css';
${imports}

function App() {
  const [tab, setTab] = useState('${defaultTab}');
  const navItems = [${navItems}];

  const renderContent = () => {
    switch (tab) {
      ${cases}
      default: return <div className="text-center py-8">Welcome to ${ctx.appName}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r p-4">
        <h1 className="text-xl font-bold mb-4">${ctx.appName}</h1>
        <nav className="space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={\`w-full text-left px-3 py-2 rounded \${tab === item.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}\`}>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{renderContent()}</main>
    </div>
  );
}
export default App;
`;
}

export function mainTemplate(): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
`;
}

export function componentTemplate(
  entityName: string, 
  fields: Array<{ name: string; type: string; nullable?: boolean }>
): string {
  const displayFields = fields.slice(0, 4);

  return `import React, { useEffect, useState } from 'react';

function ${entityName}List() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/${kebab(entityName)}s')
      .then(r => r.json())
      .then(d => { setItems(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">${entityName}s</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
${displayFields.map(f => `              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">${f.name}</th>`).join('\n')}
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item: any) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-sm">{item.id}</td>
${displayFields.map(f => `                <td className="px-4 py-3 text-sm">{String(item.${f.name} ?? '-')}</td>`).join('\n')}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default ${entityName}List;
`;
}

export function hooksTemplate(entities: Array<{ name: string }>): string {
  const hooks = entities.map(e => `
export function use${e.name}s() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const refetch = async () => {
    setLoading(true);
    const res = await fetch('/api/${kebab(e.name)}s');
    setData(await res.json());
    setLoading(false);
  };
  useEffect(() => { refetch(); }, []);
  return { data, loading, refetch };
}`).join('\n');

  return `import { useState, useEffect } from 'react';
${hooks}
`;
}

export function indexCss(): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
}

export function frontendPackageJson(name: string, version: string): string {
  return JSON.stringify({
    name: `${kebab(name)}-frontend`,
    version,
    type: "module",
    scripts: { dev: "vite", build: "vite build" },
    dependencies: { react: "^18.2.0", "react-dom": "^18.2.0" },
    devDependencies: {
      "@types/react": "^18.2.43", "@types/react-dom": "^18.2.17",
      "@vitejs/plugin-react": "^4.2.1", tailwindcss: "^3.3.6",
      autoprefixer: "^10.4.16", postcss: "^8.4.32", typescript: "^5.3.2", vite: "^5.0.8"
    }
  }, null, 2);
}

export function viteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { port: 3000, proxy: { '/api': 'http://localhost:8080' } }
});
`;
}

export function indexHtml(appName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${appName}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

export function tailwindConfig(): string {
  return `export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: []
};`;
}

export function postcssConfig(): string {
  return `export default {
  plugins: { tailwindcss: {}, autoprefixer: {} }
};`;
}

export function frontendTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: "ES2020", useDefineForClassFields: true, lib: ["ES2020", "DOM"],
      module: "ESNext", skipLibCheck: true, moduleResolution: "bundler",
      allowImportingTsExtensions: true, resolveJsonModule: true,
      isolatedModules: true, noEmit: true, jsx: "react-jsx", strict: true
    },
    include: ["src"]
  }, null, 2);
}

export { kebab };
