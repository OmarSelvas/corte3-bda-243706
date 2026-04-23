const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const authMiddleware = require('./middlewares/auth');
const mascotasRoutes = require('./routes/mascotas');
const citasRoutes    = require('./routes/citas');
const vacunasRoutes  = require('./routes/vacunas');

const app = express();

// 1. Middlewares Globales
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(authMiddleware); // Aplica a todas las rutas de abajo

// 2. Conectar las Rutas (Routers)
app.use('/api/mascotas', mascotasRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/vacunas', vacunasRoutes);

// Health Check puede quedarse aquí por ser trivial
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[API] Servidor escuchando en http://localhost:${PORT}`);
});