require('dotenv').config();
const express = require('express');
const cors = require('cors');

const vendorARoute = require('./vendors/vendor1.js');

const app = express();
const PORT = process.env.PORT || 3300;

app.use(cors());
app.use(express.json());

// route vendor A
app.use('/vendor1', vendorARoute);

// status check
app.get('/status', (req, res) => {
    res.json({ ok: true, service: 'Vendor A API' });
});

// not found
app.use((req, res) => {
    res.status(404).json({ error: 'Rute tidak ditemukan' });
});

// error handler
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.stack);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});