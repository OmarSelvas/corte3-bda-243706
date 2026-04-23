const express = require('express');
const router = express.Router();
const db = require('../src/db');
const cache = require('../src/cache');

router.get('/vacunacion-pendiente', async (req, res) => {
  try {
    const cacheKey = cache.KEYS.VACUNACION_PENDIENTE;

    const cached = await cache.get(cacheKey);
    if (cached !== null) {
      return res.json({ data: cached, source: 'cache' });
    }

    const start  = Date.now();
    
    console.log(`[GET /api/vacunas/vacunacion-pendiente] role=${req.userRole}, vetId=${req.userVetId}`);
    const result = await db.query(req.userRole, req.userVetId,
      'SELECT * FROM v_mascotas_vacunacion_pendiente'
    );
    
    const latency = Date.now() - start;
    console.log(`[BD] vacunacion_pendiente en ${latency}ms`);

    await cache.set(cacheKey, result.rows);
    res.json({ data: result.rows, source: 'db', latency_ms: latency });
  } catch (err) {
    console.error('[GET /api/vacunas/vacunacion-pendiente]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { mascota_id, vacuna_id, fecha_aplicacion, costo_cobrado } = req.body;

    if (!mascota_id || !vacuna_id) {
      return res.status(400).json({ 
        error: 'Campos obligatorios: mascota_id, vacuna_id' 
      });
    }

    const vetId = req.userVetId;

    const sql = `
      INSERT INTO vacunas_aplicadas
        (mascota_id, vacuna_id, veterinario_id, fecha_aplicacion, costo_cobrado)
      VALUES ($1, $2, $3, $4::DATE, $5)
    `;
    
    console.log(`[POST /api/vacunas] mascota=${mascota_id}, vacuna=${vacuna_id}`);
    await db.query(req.userRole, vetId, sql, [
      parseInt(mascota_id),
      parseInt(vacuna_id),
      vetId,
      fecha_aplicacion || new Date().toISOString().split('T')[0],
      parseFloat(costo_cobrado) || null,
    ]);

    await cache.invalidate(cache.KEYS.VACUNACION_PENDIENTE);

    res.status(201).json({ 
      message: 'Vacuna registrada. Caché invalidado.' 
    });
  } catch (err) {
    console.error('[POST /api/vacunas]', err.message);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;