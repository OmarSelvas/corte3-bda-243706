const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const search = req.query.search || '';
    const role   = req.userRole;
    const vetId  = req.userVetId;

    const sql = `
      SELECT m.id, m.nombre, m.especie, m.fecha_nacimiento,
             d.nombre AS dueno, d.telefono
        FROM mascotas m
        JOIN duenos d ON d.id = m.dueno_id
       WHERE m.nombre  ILIKE $1
          OR m.especie ILIKE $1
       ORDER BY m.nombre
    `;

    const result = await db.query(role, vetId, sql, [`%${search}%`]);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('[GET /api/mascotas]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const mascotaId = parseInt(req.params.id);
    if (isNaN(mascotaId)) return res.status(400).json({ error: 'id inválido' });

    const sql = `
      SELECT m.*, d.nombre AS dueno, d.telefono, d.email
        FROM mascotas m
        JOIN duenos d ON d.id = m.dueno_id
       WHERE m.id = $1
    `;
    const result = await db.query(req.userRole, req.userVetId, sql, [mascotaId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrada' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('[GET /api/mascotas/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;