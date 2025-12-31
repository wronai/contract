import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// Types
interface Customer {
  customerId: string;
  name: string;
  nip: string;
  segment: string;
  onboardingStatus: string;
  riskScore?: number;
  creditLimit?: number;
}

interface RiskEvent {
  id: string;
  entityId: string;
  eventType: string;
  severity: string;
  description: string;
  timestamp: string;
  resolved: boolean;
}

interface DashboardSummary {
  customers: {
    total: number;
    verified: number;
    pending: number;
    rejected: number;
    bySegment: { enterprise: number; sme: number; startup: number };
  };
  contractors: {
    total: number;
    active: number;
    avgRating: number;
    totalValue: number;
  };
  riskEvents: {
    total: number;
    unresolved: number;
    bySeverity: { critical: number; high: number; medium: number; low: number };
  };
}

// API functions
const API_BASE = import.meta.env.DEV ? 'http://localhost:8080/api' : '/api';

async function fetchSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${API_BASE}/dashboard/summary`);
  const data = await res.json();
  return data.data;
}

async function fetchCustomers(): Promise<Customer[]> {
  const res = await fetch(`${API_BASE}/customers`);
  const data = await res.json();
  return data.data;
}

async function fetchRiskEvents(): Promise<RiskEvent[]> {
  const res = await fetch(`${API_BASE}/risk-events`);
  const data = await res.json();
  return data.data;
}

// Components
function StatCard({ title, value, subtitle, color = 'blue' }: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`${colors[color]} rounded-full p-3 mr-4`}>
          <div className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[severity] || 'bg-gray-100'}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    verified: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    active: 'bg-blue-100 text-blue-800'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
}

function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get initial tab from URL hash or default to 'overview'
  const getTabFromURL = () => {
    const hash = window.location.hash.slice(1);
    return hash || 'overview';
  };
  
  const [activeTab, setActiveTab] = useState(getTabFromURL());

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.history.pushState(null, '', `#${tab}`);
  };

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getTabFromURL());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [summaryData, customersData, eventsData] = await Promise.all([
          fetchSummary(),
          fetchCustomers(),
          fetchRiskEvents()
        ]);
        setSummary(summaryData);
        setCustomers(customersData);
        setRiskEvents(eventsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reclapp</h1>
            <p className="text-sm text-gray-500">Declarative Application Platform</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Connected" />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {['overview', 'customers', 'risk-events', 'dsl-editor'].map(tab => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'overview' && summary && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Customers"
                value={summary.customers.total}
                subtitle={`${summary.customers.verified} verified`}
                color="blue"
              />
              <StatCard
                title="Pending Onboarding"
                value={summary.customers.pending}
                subtitle="Awaiting verification"
                color="yellow"
              />
              <StatCard
                title="Active Contractors"
                value={summary.contractors.active}
                subtitle={`Avg rating: ${summary.contractors.avgRating.toFixed(1)}`}
                color="green"
              />
              <StatCard
                title="Unresolved Risks"
                value={summary.riskEvents.unresolved}
                subtitle={`${summary.riskEvents.bySeverity.critical} critical`}
                color="red"
              />
            </div>

            {/* Risk Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Risk Events by Severity</h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-3xl font-bold text-red-600">{summary.riskEvents.bySeverity.critical}</p>
                  <p className="text-sm text-gray-500">Critical</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-3xl font-bold text-orange-600">{summary.riskEvents.bySeverity.high}</p>
                  <p className="text-sm text-gray-500">High</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-3xl font-bold text-yellow-600">{summary.riskEvents.bySeverity.medium}</p>
                  <p className="text-sm text-gray-500">Medium</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{summary.riskEvents.bySeverity.low}</p>
                  <p className="text-sm text-gray-500">Low</p>
                </div>
              </div>
            </div>

            {/* Customer Segments */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Customer Segments</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-3xl font-bold text-purple-600">{summary.customers.bySegment.enterprise}</p>
                  <p className="text-sm text-gray-500">Enterprise</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{summary.customers.bySegment.sme}</p>
                  <p className="text-sm text-gray-500">SME</p>
                </div>
                <div className="text-center p-4 bg-teal-50 rounded-lg">
                  <p className="text-3xl font-bold text-teal-600">{summary.customers.bySegment.startup}</p>
                  <p className="text-sm text-gray-500">Startup</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Customers ({customers.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NIP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Limit</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map(customer => (
                    <tr key={customer.customerId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{customer.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{customer.nip}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="capitalize">{customer.segment}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={customer.onboardingStatus} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={customer.riskScore && customer.riskScore > 70 ? 'text-red-600 font-medium' : ''}>
                          {customer.riskScore || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {customer.creditLimit ? `${customer.creditLimit.toLocaleString()} PLN` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'risk-events' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Risk Events ({riskEvents.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {riskEvents.map(event => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <SeverityBadge severity={event.severity} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="capitalize">{event.eventType.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-6 py-4">{event.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {event.resolved ? (
                          <span className="text-green-600">✓ Resolved</span>
                        ) : (
                          <span className="text-red-600">⚠ Open</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'dsl-editor' && <DSLEditor />}
      </main>
    </div>
  );
}

function DSLEditor() {
  const [source, setSource] = useState(`# Example: Define a Customer Entity
ENTITY Customer {
  FIELD id: UUID @generated
  FIELD name: String @required
  FIELD email: Email @unique
  FIELD status: String @enum("pending", "active") = "pending"
}

ALERT "New Customer" {
  ENTITY Customer
  CONDITION status == "pending"
  TARGET email, slack
}
`);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleParse() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source })
      });
      const data = await res.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source })
      });
      const data = await res.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handlePlan() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source })
      });
      const data = await res.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">DSL Editor</h2>
        <textarea
          value={source}
          onChange={e => setSource(e.target.value)}
          className="w-full h-96 font-mono text-sm p-4 border rounded-lg bg-gray-50"
          placeholder="Enter your Reclapp DSL code here..."
        />
        <div className="flex space-x-4 mt-4">
          <button
            onClick={handleParse}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Parse
          </button>
          <button
            onClick={handleValidate}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Validate
          </button>
          <button
            onClick={handlePlan}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Build Plan
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Output</h2>
        <pre className="w-full h-96 overflow-auto font-mono text-sm p-4 border rounded-lg bg-gray-50">
          {result ? JSON.stringify(result, null, 2) : 'Results will appear here...'}
        </pre>
      </div>
    </div>
  );
}

// Styles (Tailwind-like inline)
const styles = `
  .bg-white { background-color: white; }
  .bg-gray-50 { background-color: #f9fafb; }
  .bg-gray-100 { background-color: #f3f4f6; }
  .bg-blue-50 { background-color: #eff6ff; }
  .bg-blue-500 { background-color: #3b82f6; }
  .bg-green-50 { background-color: #f0fdf4; }
  .bg-green-500 { background-color: #22c55e; }
  .bg-yellow-50 { background-color: #fefce8; }
  .bg-yellow-500 { background-color: #eab308; }
  .bg-orange-50 { background-color: #fff7ed; }
  .bg-red-50 { background-color: #fef2f2; }
  .bg-red-500 { background-color: #ef4444; }
  .bg-purple-50 { background-color: #faf5ff; }
  .bg-purple-500 { background-color: #a855f7; }
  .bg-teal-50 { background-color: #f0fdfa; }
  .text-gray-400 { color: #9ca3af; }
  .text-gray-500 { color: #6b7280; }
  .text-gray-600 { color: #4b5563; }
  .text-gray-700 { color: #374151; }
  .text-gray-900 { color: #111827; }
  .text-blue-600 { color: #2563eb; }
  .text-green-600 { color: #16a34a; }
  .text-yellow-600 { color: #ca8a04; }
  .text-orange-600 { color: #ea580c; }
  .text-red-600 { color: #dc2626; }
  .text-purple-600 { color: #9333ea; }
  .text-teal-600 { color: #0d9488; }
  .rounded { border-radius: 0.25rem; }
  .rounded-lg { border-radius: 0.5rem; }
  .rounded-full { border-radius: 9999px; }
  .shadow { box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .border { border: 1px solid #e5e7eb; }
  .border-b { border-bottom: 1px solid #e5e7eb; }
  .border-b-2 { border-bottom: 2px solid; }
  .border-transparent { border-color: transparent; }
  .border-blue-500 { border-color: #3b82f6; }
  .p-1 { padding: 0.25rem; }
  .p-3 { padding: 0.75rem; }
  .p-4 { padding: 1rem; }
  .p-6 { padding: 1.5rem; }
  .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
  .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
  .px-4 { padding-left: 1rem; padding-right: 1rem; }
  .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
  .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
  .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
  .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
  .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
  .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
  .m-0 { margin: 0; }
  .mr-4 { margin-right: 1rem; }
  .mb-4 { margin-bottom: 1rem; }
  .mt-4 { margin-top: 1rem; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .space-x-4 > * + * { margin-left: 1rem; }
  .space-x-8 > * + * { margin-left: 2rem; }
  .space-y-8 > * + * { margin-top: 2rem; }
  .gap-4 { gap: 1rem; }
  .gap-6 { gap: 1.5rem; }
  .flex { display: flex; }
  .grid { display: grid; }
  .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .text-xs { font-size: 0.75rem; }
  .text-sm { font-size: 0.875rem; }
  .text-lg { font-size: 1.125rem; }
  .text-xl { font-size: 1.25rem; }
  .text-2xl { font-size: 1.5rem; }
  .text-3xl { font-size: 1.875rem; }
  .font-medium { font-weight: 500; }
  .font-semibold { font-weight: 600; }
  .font-bold { font-weight: 700; }
  .font-mono { font-family: monospace; }
  .uppercase { text-transform: uppercase; }
  .capitalize { text-transform: capitalize; }
  .whitespace-nowrap { white-space: nowrap; }
  .overflow-hidden { overflow: hidden; }
  .overflow-auto { overflow: auto; }
  .overflow-x-auto { overflow-x: auto; }
  .min-h-screen { min-height: 100vh; }
  .min-w-full { min-width: 100%; }
  .w-3 { width: 0.75rem; }
  .w-6 { width: 1.5rem; }
  .w-full { width: 100%; }
  .h-3 { height: 0.75rem; }
  .h-6 { height: 1.5rem; }
  .h-96 { height: 24rem; }
  .max-w-7xl { max-width: 80rem; }
  .divide-y > * + * { border-top: 1px solid #e5e7eb; }
  .divide-gray-200 > * + * { border-color: #e5e7eb; }
  .animate-pulse { animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .hover\\:bg-gray-50:hover { background-color: #f9fafb; }
  .hover\\:bg-blue-600:hover { background-color: #2563eb; }
  .hover\\:bg-green-600:hover { background-color: #16a34a; }
  .hover\\:bg-purple-600:hover { background-color: #7c3aed; }
  .hover\\:text-gray-700:hover { color: #374151; }
  .disabled\\:opacity-50:disabled { opacity: 0.5; }
  .text-white { color: white; }
  .bg-blue-100 { background-color: #dbeafe; }
  .text-blue-800 { color: #1e40af; }
  .bg-green-100 { background-color: #dcfce7; }
  .text-green-800 { color: #166534; }
  .bg-yellow-100 { background-color: #fef9c3; }
  .text-yellow-800 { color: #854d0e; }
  .bg-orange-100 { background-color: #ffedd5; }
  .text-orange-800 { color: #9a3412; }
  .bg-red-100 { background-color: #fee2e2; }
  .text-red-800 { color: #991b1b; }

  @media (min-width: 768px) {
    .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (min-width: 1024px) {
    .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }
`;

// Inject styles
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);

// Render
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>
);
