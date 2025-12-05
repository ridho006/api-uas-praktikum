const express = require('express');
const cors = require('cors');
const db = require('../db.js');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3300;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

app.post('/auth/register', async (req, res, next) => {
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

app.post('/auth/register-admin', async (req, res, next) => {
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

app.post('/auth/login', async (req, res, next) => {
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

app.get('/', async (req, res, next) => {
    try {
        const result = await db.query("SELECT * FROM vendor_a");
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

app.get('/:id', async (req, res, next) => {
    try {
        const result = await db.query("SELECT * FROM vendor_a WHERE id = $1", [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Data tidak ditemukan" });
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

app.post('/',authenticateToken, async (req, res, next) => {
    const { kd_produk, nm_brg, hrg, ket_stok } = req.body;
    try {
        const sql = `
            INSERT INTO vendor_a (kd_produk, nm_brg, hrg, ket_stok)
            VALUES ($1, $2, $3, $4) RETURNING *
        `;
        const result = await db.query(sql, [kd_produk, nm_brg, hrg, ket_stok]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

app.put('/:id', [authenticateToken, authorizeRole('admin')], async (req, res, next) => {
    const { kd_produk, nm_brg, hrg, ket_stok } = req.body;
    try {
        const sql = `
            UPDATE vendor_a SET kd_produk=$1, nm_brg=$2, hrg=$3, ket_stok=$4
            WHERE id=$5 RETURNING *
        `;
        const result = await db.query(sql, [kd_produk, nm_brg, hrg, ket_stok, req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Data tidak ditemukan" });
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

app.delete('/:id', [authenticateToken, authorizeRole('admin')], async (req, res, next) => {
    try {
        const result = await db.query("DELETE FROM vendor_a WHERE id=$1 RETURNING *", [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Data tidak ditemukan" });
        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Rute tidak ditemukan' });
});

app.use((err, req, res, next) => {
    console.error('[SERVER ERROR]', err.stack);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
});

app.listen(PORT, '0.0.0.0', () => { 
    console.log(`Server aktif di http://localhost:${PORT}`);
});