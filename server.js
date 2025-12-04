require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db.js'); 
const { authenticateToken, authorizeRole } = require('./middleware/auth.js');

const app = express();
const PORT = process.env.PORT || 3300;

app.use(cors());
app.use(express.json());

async function ensureProductsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      vendor VARCHAR(20),
      product_code VARCHAR(100),
      product_name VARCHAR(255),
      price INTEGER,
      stock_status VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  await db.query(sql);
}

function toInt(value) {
  const s = String(value).replace(/[^\d\-]/g, '');
  if (s === '') return 0;
  let sign = 1;
  let i = 0;
  if (s[0] === '-') { sign = -1; i = 1; }
  let acc = 0;
  for (; i < s.length; i++) {
    const d = s.charCodeAt(i) - 48;
    if (d < 0 || d > 9) break;
    acc = acc * 10 + d;
  }
  return acc * sign;
}

function normalizeVendorA(rows) {
  return rows.map(r => {
    const rawPrice = toInt(r.hrg);
    const discounted = Math.round(rawPrice * 0.9);
    const stockStatus = (String(r.ket_stok || '').toLowerCase() === 'ada') ? 'Tersedia' : 'Habis';
    return {
      vendor: 'VendorA',
      product_code: r.kd_produk,
      product_name: r.nm_brg,
      price: discounted,
      stock_status: stockStatus
    };
  });
}

function normalizeVendorB(rows) {
  return rows.map(r => {
    return {
      vendor: 'VendorB',
      product_code: r.sku,
      product_name: r.product_name,
      price: toInt(r.price),
      stock_status: (r.is_available === true) ? 'Tersedia' : 'Habis'
    };
  });
}

function normalizeVendorC(rows) {
  return rows.map(r => {
    const details = (typeof r.details === 'string') ? JSON.parse(r.details) : r.details || {};
    const pricing = (typeof r.pricing === 'string') ? JSON.parse(r.pricing) : r.pricing || {};
    const base = toInt(pricing.base_price || pricing.base_price === 0 ? pricing.base_price : 0);
    const tax = toInt(pricing.tax || pricing.tax === 0 ? pricing.tax : 0);
    const total = base + tax;
    let name = details.name || String(r.name || '');
    if ((details.category || '').toLowerCase() === 'food') {
      name = `${name} (Recommended)`;
    }
    return {
      vendor: 'VendorC',
      product_code: String(r.id),
      product_name: name,
      price: total,
      stock_status: (Number(r.stock) > 0) ? 'Tersedia' : 'Habis'
    };
  });
}

app.get('/vendorA', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM vendor_a ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) { next(err); }
});

app.get('/vendorB', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM vendor_b ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) { next(err); }
});

app.get('/vendorC', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM vendor_c ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) { next(err); }
});

app.get('/products', async (req, res, next) => {
  try {
    const r = await db.query('SELECT * FROM products ORDER BY id DESC');
    res.json(r.rows);
  } catch (err) { next(err); }
});

app.post('/integrate', authenticateToken, authorizeRole('admin'), async (req, res, next) => {
  try {
    await ensureProductsTable();

    const [ra, rb, rc] = await Promise.all([
      db.query('SELECT * FROM vendor_a'),
      db.query('SELECT * FROM vendor_b'),
      db.query('SELECT * FROM vendor_c')
    ]);

    const normA = normalizeVendorA(ra.rows);
    const normB = normalizeVendorB(rb.rows);
    const normC = normalizeVendorC(rc.rows);

    const final = [...normA, ...normB, ...normC];

    await db.query('TRUNCATE TABLE products RESTART IDENTITY');

    const insertSql = `INSERT INTO products (vendor, product_code, product_name, price, stock_status) VALUES ($1,$2,$3,$4,$5)`;
    for (const p of final) {
      await db.query(insertSql, [p.vendor, p.product_code, p.product_name, p.price, p.stock_status]);
    }

    res.json({ message: 'Integrasi selesai', total: final.length, data_sample: final.slice(0, 20) });

  } catch (err) {
    next(err);
  }
});

app.get('/preview-normalize', async (req, res, next) => {
  try {
    const [ra, rb, rc] = await Promise.all([
      db.query('SELECT * FROM vendor_a'),
      db.query('SELECT * FROM vendor_b'),
      db.query('SELECT * FROM vendor_c')
    ]);
    const normA = normalizeVendorA(ra.rows);
    const normB = normalizeVendorB(rb.rows);
    const normC = normalizeVendorC(rc.rows);
    res.json({ total: normA.length + normB.length + normC.length, data: [...normA, ...normB, ...normC] });
  } catch (err) { next(err); }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Rute tidak ditemukan' });
});

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`Integrator server berjalan di http://localhost:${PORT}`);
});