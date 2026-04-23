-- v_mascotas_vacunacion_pendiente
-- Muestra mascotas que no tienen vacunas aplicadas en el último
-- año, junto con el nombre del dueño y teléfono de contacto.
DROP VIEW IF EXISTS v_mascotas_vacunacion_pendiente;
CREATE VIEW v_mascotas_vacunacion_pendiente AS
SELECT
    m.id            AS mascota_id,
    m.nombre        AS mascota,
    m.especie,
    m.fecha_nacimiento,
    d.nombre        AS dueno,
    d.telefono,
    d.email,
    -- Última vacuna aplicada (NULL si nunca ha sido vacunada)
    MAX(va.fecha_aplicacion) AS ultima_vacuna,
    -- Días desde la última vacuna (NULL si nunca)
    (CURRENT_DATE - MAX(va.fecha_aplicacion)) AS dias_sin_vacuna
FROM mascotas m
JOIN duenos d ON d.id = m.dueno_id
LEFT JOIN vacunas_aplicadas va ON va.mascota_id = m.id
GROUP BY m.id, m.nombre, m.especie, m.fecha_nacimiento, d.nombre, d.telefono, d.email
HAVING
    -- Sin vacunas en el último año O nunca vacunadas
    MAX(va.fecha_aplicacion) IS NULL
    OR MAX(va.fecha_aplicacion) < CURRENT_DATE - INTERVAL '1 year'
ORDER BY dias_sin_vacuna DESC NULLS FIRST;

-- v_citas_completas
-- Vista de apoyo para la recepción: datos completos de citas
-- con nombres de mascota, dueño y veterinario.
DROP VIEW IF EXISTS v_citas_completas;
CREATE VIEW v_citas_completas AS
SELECT
    c.id,
    c.fecha_hora,
    c.motivo,
    c.costo,
    c.estado,
    m.nombre  AS mascota,
    m.especie,
    d.nombre  AS dueno,
    d.telefono,
    v.nombre  AS veterinario,
    v.cedula  AS cedula_vet
FROM citas c
JOIN mascotas     m ON m.id = c.mascota_id
JOIN duenos       d ON d.id = m.dueno_id
JOIN veterinarios v ON v.id = c.veterinario_id;