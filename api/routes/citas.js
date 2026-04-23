const express = require('express');
const router = express.Router();
const db = require('../src/db');

router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT c.id, c.fecha_hora, c.motivo, c.costo, c.estado,
             m.nombre AS mascota, v.nombre AS veterinario
        FROM citas c
        JOIN mascotas     m ON m.id = c.mascota_id
        JOIN veterinarios v ON v.id = c.veterinario_id
       ORDER BY c.fecha_hora DESC
       LIMIT 100
    `;
    const result = await db.query(req.userRole, req.userVetId, sql);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[GET /api/citas]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { mascota_id, veterinario_id, fecha_hora, motivo } = req.body;

    if (!mascota_id || !veterinario_id || !fecha_hora) {
      return res.status(400).json({ error: 'Campos obligatorios: mascota_id, veterinario_id, fecha_hora' });
    }

    const sql = `CALL sp_agendar_cita($1, $2, $3::TIMESTAMP, $4, NULL)`;
    await db.query(req.userRole, req.userVetId, sql, [
      parseInt(mascota_id),
      parseInt(veterinario_id),
      fecha_hora,
      motivo || '',
    ]);

    res.status(201).json({ message: 'Cita agendada correctamente' });
  } catch (err) {
    console.error('[POST /api/citas]', err.message);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;