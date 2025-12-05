require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

function toInt(v) {
  return parseInt(String(v).replace(/[^\d]/g, ''), 10) || 0;
}

function normalizeM1(rows) {
  return rows.map(r => {
    const harga = toInt(r.hrg);
    const harga_diskon = Math.round(harga * 0.9);

    return {
      vendor: "Vendor A (Warung Klontong)",
      code: r.kd_produk,
      name: r.nm_brg,
      price: harga,
      final_price: harga_diskon,
      stock_status: r.ket_stok
    };
  });
}

function normalizeM2(rows) {
  return rows.map(r => {
    const harga = toInt(r.price);

    return {
      vendor: "Vendor B",
      code: r.sku,
      name: r.product_name,
      price: harga,
      final_price: harga, // tidak ada diskon
      stock_status: r.is_available ? "Tersedia" : "Habis"
    };
  });
}

function normalizeM3(rows) {
  return rows.map(r => {
    const details = typeof r.details === "string" ? JSON.parse(r.details) : r.details;
    const pricing = typeof r.pricing === "string" ? JSON.parse(r.pricing) : r.pricing;

    const harga = toInt(pricing.base_price);
    const harga_final = harga + toInt(pricing.tax);

    return {
      vendor: "Vendor C (Resto)",
      code: r.id,
      name:
        (details.category || "").toLowerCase() === "food"
          ? `${details.name} (Recommended)`
          : details.name,
      price: harga,
      final_price: harga_final,
      stock_status: r.stock > 0 ? "Tersedia" : "Habis"
    };
  });
}

app.get("/vendorA", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM vendor_a ORDER BY kd_produk ASC");
    res.json({ total: result.rowCount, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

app.get("/vendorB", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM vendor_b ORDER BY sku ASC");
    res.json({ total: result.rowCount, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

app.get("/vendorC", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM vendor_c ORDER BY id ASC");
    res.json({ total: result.rowCount, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

app.get("/all-products", async (req, res) => {
  try {
    const [m1, m2, m3] = await Promise.all([
      db.query("SELECT * FROM vendor_a"),
      db.query("SELECT * FROM vendor_b"),
      db.query("SELECT * FROM vendor_c")
    ]);

    // Hanya mengambil hasil normalisasi
    const normalized = [
      ...normalizeM1(m1.rows),
      ...normalizeM2(m2.rows),
      ...normalizeM3(m3.rows)
    ];

    res.json({
      total: normalized.length,
      data: normalized
    });

  } catch (err) {
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

module.exports = app;

if (require.main === module) {
  app.listen(3300, () => console.log("Server berjalan di http://localhost:3300"));
}