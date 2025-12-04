// --- SETUP ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// helper parse angka
function toInt(v) {
  return parseInt(String(v).replace(/[^\d]/g, ''), 10) || 0;
}

// --- NORMALISASI SESUAI PERSYARATAN ---

// M1 = Vendor A (Warung)
function normalizeM1(rows) {
  return rows.map(r => ({
    vendor: "VendorA",
    product_code: r.kd_produk,
    product_name: r.nm_brg,
    price: Math.round(toInt(r.hrg) * 0.9),    // Diskon 10%
    stock_status: r.ket_stok === "ada" ? "ada" : "habis"
  }));
}

// M2 = Vendor B
function normalizeM2(rows) {
  return rows.map(r => ({
    vendor: "VendorB",
    product_code: r.sku,
    product_name: r.product_name,
    price: toInt(r.price),
    stock_status: r.is_available ? "Tersedia" : "Habis"
  }));
}

// M3 = Vendor C (Resto)
function normalizeM3(rows) {
  return rows.map(r => {
    const details = typeof r.details === "string" ? JSON.parse(r.details) : r.details;
    const pricing = typeof r.pricing === "string" ? JSON.parse(r.pricing) : r.pricing;

    const base = toInt(pricing.base_price);
    const tax = toInt(pricing.tax);
    const finalPrice = base + tax;

    let name = details.name;
    if ((details.category || "").toLowerCase() === "food") {
      name += " (Recommended)";
    }

    return {
      vendor: "VendorC",
      product_code: String(r.id),
      product_name: name,
      price: finalPrice,
      stock_status: r.stock > 0 ? "Tersedia" : "Habis"
    };
  });
}

// --- ENDPOINT GET NORMALIZATION SAJA ---

app.get("/products", async (req, res) => {
  try {
    const [m1, m2, m3] = await Promise.all([
      db.query("SELECT * FROM vendor_a"),
      db.query("SELECT * FROM vendor_b"),
      db.query("SELECT * FROM vendor_c")
    ]);

    const finalData = [
      ...normalizeM1(m1.rows),
      ...normalizeM2(m2.rows),
      ...normalizeM3(m3.rows)
    ];

    res.json({
      total: finalData.length,
      data: finalData
    });

  } catch (err) {
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

app.listen(3300, () => console.log("Server berjalan di http://localhost:3300"));