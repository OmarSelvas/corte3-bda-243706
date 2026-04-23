const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const authMiddleware = require('./middlewares/auth');
const db = require('./db');
const mascotasRoutes = require('../routes/mascotas');
const citasRoutes    = require('../routes/citas');
const vacunasRoutes  = require('../routes/vacunas');
const catalogosRoutes = require('../routes/catalogos');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(authMiddleware);

// Rutas
app.use('/api/mascotas', mascotasRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/vacunas', vacunasRoutes);
app.use('/api/veterinarios', catalogosRoutes);

// Ruta adicional para inventario (directa, no en catalogos)
app.get('/api/inventario-vacunas', async (req, res) => {
  try {
    console.log(`[GET /api/inventario-vacunas] role=${req.userRole}`);
    const result = await db.query(req.userRole, req.userVetId,
      'SELECT * FROM inventario_vacunas ORDER BY nombre'
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[GET /api/inventario-vacunas]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[API] Servidor escuchando en http://localhost:${PORT}`);
});