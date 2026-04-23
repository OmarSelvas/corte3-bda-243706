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
    const { mascota_id, vacuna_id, fecha_aplicacion, costo_cobrado, veterinario_id } = req.body;

    console.log(`[POST /api/vacunas] Body recibido:`, req.body);
    console.log(`[POST /api/vacunas] Role: ${req.userRole}, VetId: ${req.userVetId}`);

    if (!mascota_id || !vacuna_id) {
      return res.status(400).json({ 
        error: 'Campos obligatorios: mascota_id, vacuna_id' 
      });
    }

    // Determinar veterinario_id según rol
    let finalVetId;

    if (req.userRole === 'vet') {
      // Veterinario: usa su propio ID del header
      finalVetId = req.userVetId;
      if (!finalVetId) {
        return res.status(400).json({ 
          error: 'Error: veterinario no tiene ID asignado' 
        });
      }
    } else if (req.userRole === 'admin' || req.userRole === 'recepcion') {
      // Admin/Recepción: debe proporcionar veterinario_id en el body
      if (!veterinario_id) {
        return res.status(400).json({ 
          error: 'Campo obligatorio para admin/recepción: veterinario_id en body' 
        });
      }
      finalVetId = parseInt(veterinario_id);
      if (isNaN(finalVetId)) {
        return res.status(400).json({ 
          error: 'veterinario_id debe ser un número válido' 
        });
      }
    } else {
      return res.status(403).json({ 
        error: 'Rol no autorizado para aplicar vacunas' 
      });
    }

    const sql = `
      INSERT INTO vacunas_aplicadas
        (mascota_id, vacuna_id, veterinario_id, fecha_aplicacion, costo_cobrado)
      VALUES ($1, $2, $3, $4::DATE, $5)
    `;
    
    console.log(`[POST /api/vacunas] Insertando: mascota=${mascota_id}, vacuna=${vacuna_id}, vet=${finalVetId}`);
    
    await db.query(req.userRole, req.userVetId, sql, [
      parseInt(mascota_id),
      parseInt(vacuna_id),
      finalVetId,
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