const express = require('express');
const db = require('../db.js');
const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const result = await db.query("SELECT * FROM vendor_b ORDER BY id ASC");
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    const { sku, product_name, price, is_available } = req.body;
    try {
        const sql = `
            INSERT INTO vendor_b (sku, product_name, price, is_available)
            VALUES ($1, $2, $3, $4) RETURNING *
        `;
        const result = await db.query(sql, [sku, product_name, price, is_available]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});



module.exports = router;