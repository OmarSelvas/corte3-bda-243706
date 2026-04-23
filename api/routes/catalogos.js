const express = require('express');
const router = express.Router();
const db = require('../src/db');

router.get('/', async (req, res) => {
  try {
    const result = await db.query(req.userRole, req.userVetId,
      'SELECT id, nombre, cedula, activo FROM veterinarios ORDER BY nombre'
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[GET /api/veterinarios]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/inventario-vacunas', async (req, res) => {
  try {
    const result = await db.query(req.userRole, req.userVetId,
      'SELECT * FROM inventario_vacunas ORDER BY nombre'
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[GET /api/veterinarios/inventario-vacunas]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;