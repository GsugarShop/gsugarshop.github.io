const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const ordersFile = path.join(dataDir, 'orders.json');
const adminPassword = process.env.ADMIN_PASSWORD || 'gsugar-admin';
const cookieSecret = process.env.COOKIE_SECRET || 'gsugar-session-secret';
const adminCookieName = 'gsugarAdminAuth';

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

if (!fs.existsSync(ordersFile)) {
  fs.writeFileSync(ordersFile, '[]', 'utf8');
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(cookieSecret));

function isAdminAuthenticated(req) {
  return req.signedCookies && req.signedCookies[adminCookieName] === 'yes';
}

function requireAdmin(req, res, next) {
  if (isAdminAuthenticated(req)) {
    return next();
  }
  res.redirect('/admin-login.html');
}

app.get('/admin.html', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin.js', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.js'));
});

app.post('/admin/login', (req, res) => {
  const password = req.body.password;
  if (password === adminPassword) {
    res.cookie(adminCookieName, 'yes', {
      signed: true,
      httpOnly: true,
      sameSite: 'lax'
    });
    return res.redirect('/admin.html');
  }

  res.redirect('/admin-login.html?error=1');
});

app.get('/admin/logout', (req, res) => {
  res.clearCookie(adminCookieName);
  res.redirect('/admin-login.html');
});

function readOrders() {
  try {
    return JSON.parse(fs.readFileSync(ordersFile, 'utf8')) || [];
  } catch (error) {
    console.error('Error reading orders file:', error);
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2), 'utf8');
}

app.get('/api/orders', (req, res) => {
  const orders = readOrders();
  const email = req.query.customerEmail;
  if (email) {
    return res.json(orders.filter(order => order.customerEmail.toLowerCase() === email.toLowerCase()));
  }
  if (!isAdminAuthenticated(req)) {
    return res.status(403).json({ error: 'Authentication required.' });
  }
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const { customerName, customerEmail, items, total } = req.body;
  if (!customerName || !customerEmail || !Array.isArray(items) || typeof total !== 'number') {
    return res.status(400).json({ error: 'Missing or invalid order payload.' });
  }

  const newOrder = {
    id: `order-${Date.now()}`,
    customerName,
    customerEmail,
    items,
    total,
    status: 'processing',
    createdAt: Date.now(),
    deliveredAt: null,
    cancelledAt: null
  };

  const orders = readOrders();
  orders.push(newOrder);
  writeOrders(orders);

  res.status(201).json(newOrder);
});

app.patch('/api/orders/:id', requireAdmin, (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;
  const allowed = ['email', 'processing', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  const orders = readOrders();
  const order = orders.find(item => item.id === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  order.status = status;
  order.deliveredAt = status === 'delivered' ? Date.now() : null;
  order.cancelledAt = status === 'cancelled' ? Date.now() : null;
  if (status !== 'delivered') order.deliveredAt = null;
  if (status !== 'cancelled') order.cancelledAt = null;

  writeOrders(orders);
  res.json(order);
});

app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`GSugar portal server is running at http://localhost:${PORT}`);
});
