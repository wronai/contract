/**
 * E-Commerce Platform API Server
 * Full e-commerce solution with products, orders, inventory, and payments
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// In-memory data stores
const products: Map<string, any> = new Map();
const categories: Map<string, any> = new Map();
const inventory: Map<string, any> = new Map();
const customers: Map<string, any> = new Map();
const orders: Map<string, any> = new Map();
const carts: Map<string, any> = new Map();

// Initialize sample data
function initSampleData() {
  // Categories
  const cat1 = { id: randomUUID(), name: 'Electronics', slug: 'electronics', sortOrder: 1 };
  const cat2 = { id: randomUUID(), name: 'Clothing', slug: 'clothing', sortOrder: 2 };
  const cat3 = { id: randomUUID(), name: 'Home & Garden', slug: 'home-garden', sortOrder: 3 };
  categories.set(cat1.id, cat1);
  categories.set(cat2.id, cat2);
  categories.set(cat3.id, cat3);

  // Products
  const products_data = [
    { sku: 'LAPTOP-001', name: 'ProBook Laptop 15"', price: 2499.99, categoryId: cat1.id, status: 'active' },
    { sku: 'PHONE-001', name: 'SmartPhone X12', price: 999.99, categoryId: cat1.id, status: 'active' },
    { sku: 'HEADPHONES-001', name: 'Wireless Headphones Pro', price: 299.99, categoryId: cat1.id, status: 'active' },
    { sku: 'TSHIRT-001', name: 'Classic T-Shirt', price: 29.99, categoryId: cat2.id, status: 'active' },
    { sku: 'JEANS-001', name: 'Slim Fit Jeans', price: 79.99, categoryId: cat2.id, status: 'active' },
    { sku: 'LAMP-001', name: 'Designer Desk Lamp', price: 149.99, categoryId: cat3.id, status: 'active' },
  ];

  products_data.forEach(p => {
    const product = { id: randomUUID(), ...p, images: [], createdAt: new Date().toISOString() };
    products.set(product.id, product);
    
    // Add inventory
    inventory.set(product.id, {
      productId: product.id,
      warehouseId: 'main',
      quantity: Math.floor(Math.random() * 100) + 10,
      reservedQuantity: 0,
      lowStockThreshold: 10
    });
  });

  // Customers
  const cust1 = {
    id: randomUUID(),
    email: 'jan.kowalski@example.com',
    firstName: 'Jan',
    lastName: 'Kowalski',
    totalOrders: 5,
    totalSpent: 1250.50,
    createdAt: new Date().toISOString()
  };
  customers.set(cust1.id, cust1);

  // Sample order
  const order1 = {
    id: randomUUID(),
    orderNumber: 'ORD-' + Date.now(),
    customerId: cust1.id,
    status: 'processing',
    fulfillmentStatus: 'pending',
    paymentStatus: 'paid',
    subtotal: 999.99,
    shippingTotal: 15.00,
    taxTotal: 203.00,
    discountTotal: 0,
    total: 1217.99,
    currency: 'PLN',
    placedAt: new Date().toISOString()
  };
  orders.set(order1.id, order1);

  console.log('✓ Sample data initialized');
}

// Health endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'ecommerce-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Products API
app.get('/api/v1/products', (req: Request, res: Response) => {
  const { categoryId, status } = req.query;
  let result = Array.from(products.values());
  
  if (categoryId) result = result.filter(p => p.categoryId === categoryId);
  if (status) result = result.filter(p => p.status === status);
  
  res.json({ products: result, total: result.length });
});

app.get('/api/v1/products/:id', (req: Request, res: Response) => {
  const product = products.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  
  const inv = inventory.get(product.id);
  res.json({ ...product, inventory: inv });
});

app.post('/api/v1/products', (req: Request, res: Response) => {
  const product = {
    id: randomUUID(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  products.set(product.id, product);
  res.status(201).json(product);
});

// Categories API
app.get('/api/v1/categories', (req: Request, res: Response) => {
  res.json({
    categories: Array.from(categories.values()).sort((a, b) => a.sortOrder - b.sortOrder),
    total: categories.size
  });
});

// Inventory API
app.get('/api/v1/inventory', (req: Request, res: Response) => {
  const items = Array.from(inventory.values()).map(inv => {
    const product = products.get(inv.productId);
    return { ...inv, productName: product?.name, sku: product?.sku };
  });
  
  res.json({ inventory: items, total: items.length });
});

app.get('/api/v1/inventory/low-stock', (req: Request, res: Response) => {
  const lowStock = Array.from(inventory.values())
    .filter(inv => inv.quantity <= inv.lowStockThreshold)
    .map(inv => {
      const product = products.get(inv.productId);
      return { ...inv, productName: product?.name, sku: product?.sku };
    });
  
  res.json({ items: lowStock, total: lowStock.length });
});

// Customers API
app.get('/api/v1/customers', (req: Request, res: Response) => {
  res.json({
    customers: Array.from(customers.values()),
    total: customers.size
  });
});

app.get('/api/v1/customers/:id', (req: Request, res: Response) => {
  const customer = customers.get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
});

// Orders API
app.get('/api/v1/orders', (req: Request, res: Response) => {
  const { status, customerId } = req.query;
  let result = Array.from(orders.values());
  
  if (status) result = result.filter(o => o.status === status);
  if (customerId) result = result.filter(o => o.customerId === customerId);
  
  res.json({ orders: result, total: result.length });
});

app.get('/api/v1/orders/:id', (req: Request, res: Response) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

app.post('/api/v1/orders', (req: Request, res: Response) => {
  const order = {
    id: randomUUID(),
    orderNumber: 'ORD-' + Date.now(),
    ...req.body,
    status: 'pending',
    fulfillmentStatus: 'pending',
    paymentStatus: 'pending',
    placedAt: new Date().toISOString()
  };
  orders.set(order.id, order);
  res.status(201).json(order);
});

// Cart API
app.get('/api/v1/cart/:sessionId', (req: Request, res: Response) => {
  const cart = carts.get(req.params.sessionId) || { items: [], subtotal: 0 };
  res.json(cart);
});

app.post('/api/v1/cart/:sessionId/items', (req: Request, res: Response) => {
  const { productId, quantity } = req.body;
  let cart = carts.get(req.params.sessionId) || { 
    sessionId: req.params.sessionId, 
    items: [], 
    subtotal: 0,
    updatedAt: new Date().toISOString()
  };
  
  const product = products.get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  
  cart.items.push({ productId, quantity, price: product.price });
  cart.subtotal = cart.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
  cart.updatedAt = new Date().toISOString();
  
  carts.set(req.params.sessionId, cart);
  res.json(cart);
});

// Dashboard metrics
app.get('/api/v1/metrics', (req: Request, res: Response) => {
  const allOrders = Array.from(orders.values());
  const totalRevenue = allOrders.reduce((sum, o) => sum + o.total, 0);
  const avgOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0;
  
  const totalInventory = Array.from(inventory.values()).reduce((sum, inv) => sum + inv.quantity, 0);
  const lowStockCount = Array.from(inventory.values()).filter(inv => inv.quantity <= inv.lowStockThreshold).length;
  
  res.json({
    totalRevenue,
    orderCount: allOrders.length,
    avgOrderValue,
    totalProducts: products.size,
    totalInventory,
    lowStockCount,
    outOfStockCount: Array.from(inventory.values()).filter(inv => inv.quantity === 0).length,
    totalCustomers: customers.size,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
initSampleData();

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         E-Commerce Platform API - Reclapp Example             ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                                  ║
║  Health: http://localhost:${PORT}/health                         ║
║  API: http://localhost:${PORT}/api/v1/                           ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
