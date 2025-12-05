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
    const harga_diskon = Math.round(toInt(r.hrg) * 0.9);

    return {
      vendor: "Vendor A (Warung Klontong)",
      kd_produk: r.kd_produk,
      nm_brg: r.nm_brg,
      hrg: toInt(r.hrg),
      ket_stok: r.ket_stok,
      diskon: "10%",
      harga_diskon: harga_diskon
    };
  });
}

function normalizeM2(rows) {
  return rows.map(r => ({
    vendor: "Vendor B",
    sku: r.sku,
    product_name: r.product_name,
    price: toInt(r.price),
    is_available: r.is_available,
    stock_status: r.is_available ? "Tersedia" : "Habis"
  }));
}

function normalizeM3(rows) {
  return rows.map(r => {
    const details = typeof r.details === "string" ? JSON.parse(r.details) : r.details;
    const pricing = typeof r.pricing === "string" ? JSON.parse(r.pricing) : r.pricing;

    const harga_final = toInt(pricing.base_price) + toInt(pricing.tax);

    return {
      vendor: "Vendor C (Resto)",
      id: r.id,
      details: details,
      pricing: pricing,
      stock: r.stock,
      harga_final: harga_final,
      product_name:
        (details.category || "").toLowerCase() === "food"
          ? `${details.name} (Recommended)`
          : details.name,
      stock_status: r.stock > 0 ? "Tersedia" : "Habis"
    };
  });
}

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
