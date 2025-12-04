const express = require('express');
const db = require('../db.js');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3300;
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/auth/register', async (req, res, next) => {
    const { username, password } = req.body;
    if (!username || !password || password.length < 6) {
        return res.status(400).json({ error: 'Username dan password (min 6 char) harus diisi' });
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const sql = 'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username';
        const result = await db.query(sql, [username.toLowerCase(), hashedPassword, 'user']);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Username sudah digunakan' });
        }
        next(err);
    }
});

router.post('/auth/register-admin', async (req, res, next) => {
    const { username, password } = req.body;
    if (!username || !password || password.length < 6) {
        return res.status(400).json({ error: 'Username dan password (min 6 char) harus diisi' });
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const sql = 'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username';
        const result = await db.query(sql, [username.toLowerCase(), hashedPassword, 'admin']);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Username sudah digunakan' });
        }
        next(err);
    }
});

router.post('/auth/login', async (req, res, next) => {
    const { username, password } = req.body;
    try {
        const sql = "SELECT * FROM users WHERE username = $1";
        const result = await db.query(sql, [username.toLowerCase()]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ error: 'Kredensial tidak valid' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Kredensial tidak valid' });
        }
        const payload = { user: { id: user.id, username: user.username, role: user.role } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login berhasil', token: token });
    } catch (err) {
        next(err);
    }
});

router.get('/', async (req, res, next) => {
    try {
        const result = await db.query("SELECT * FROM vendor_b");
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const result = await db.query("SELECT * FROM vendor_b WHERE id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Data tidak ditemukan" });
        res.json(result.rows[0]);
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

router.put('/:id',authenticateToken, async (req, res, next) => {
    const { sku, product_name, price, is_available } = req.body;
    try {
        const sql = `
            UPDATE vendor_b SET sku=$1, product_name=$2, price=$3, is_available=$4
            WHERE id=$5 RETURNING *
        `;
        const result = await db.query(sql, [sku, product_name, price, is_available, req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Data tidak ditemukan" });
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query("DELETE FROM vendor_b WHERE id=$1 RETURNING *", [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Data tidak ditemukan" });
        res.status(204).send();
    } catch (err) {
        next(err);
    }
});


module.exports = router;