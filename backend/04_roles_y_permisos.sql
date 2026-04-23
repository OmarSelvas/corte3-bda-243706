-- Eliminar roles si existen 
DROP ROLE IF EXISTS vet_role;
DROP ROLE IF EXISTS recepcion_role;
DROP ROLE IF EXISTS admin_role;
-- Crear los tres roles base 
CREATE ROLE vet_role;
CREATE ROLE recepcion_role;
CREATE ROLE admin_role;
-- PERMISOS POR ROL

-- vet_role 
-- El veterinario solo necesita ver/operar sobre sus mascotas.
-- RLS se encarga de filtrar filas; aquí damos el permiso
-- mínimo de tabla necesario para que RLS tenga sentido.

-- Mascotas: SELECT (RLS filtra a las suyas)
GRANT SELECT ON mascotas TO vet_role;

-- Citas: SELECT + INSERT (agendar citas propias vía procedure)
GRANT SELECT, INSERT ON citas TO vet_role;
GRANT USAGE, SELECT ON SEQUENCE citas_id_seq TO vet_role;

-- Vacunas aplicadas: SELECT + INSERT (aplicar vacunas a sus mascotas)
GRANT SELECT, INSERT ON vacunas_aplicadas TO vet_role;
GRANT USAGE, SELECT ON SEQUENCE vacunas_aplicadas_id_seq TO vet_role;

-- Inventario vacunas: SELECT (necesita saber qué hay en stock)
GRANT SELECT ON inventario_vacunas TO vet_role;

-- Dueños: SELECT (para ver datos de contacto de sus mascotas)
GRANT SELECT ON duenos TO vet_role;

-- Vet_atiende_mascota: SELECT (necesario para que RLS funcione)
GRANT SELECT ON vet_atiende_mascota TO vet_role;

-- Vista de vacunación pendiente (sus mascotas, filtrada por RLS)
GRANT SELECT ON v_mascotas_vacunacion_pendiente TO vet_role;

-- Ejecutar procedure de agendar cita
GRANT EXECUTE ON PROCEDURE sp_agendar_cita(INT, INT, TIMESTAMP, TEXT, INT) TO vet_role;

-- Mascotas: SELECT completo (ve todas, sin filtro RLS en este rol)
GRANT SELECT ON mascotas TO recepcion_role;

-- Dueños: SELECT completo (necesita datos de contacto)
GRANT SELECT ON duenos TO recepcion_role;

-- Citas: SELECT + INSERT (agendar para cualquier mascota)
GRANT SELECT, INSERT ON citas TO recepcion_role;
GRANT USAGE, SELECT ON SEQUENCE citas_id_seq TO recepcion_role;

-- Vista de citas completas: SELECT
GRANT SELECT ON v_citas_completas TO recepcion_role;

-- Veterinarios: SELECT (para mostrar en el formulario de citas)
GRANT SELECT ON veterinarios TO recepcion_role;

-- Ejecutar procedure de agendar cita
GRANT EXECUTE ON PROCEDURE sp_agendar_cita(INT, INT, TIMESTAMP, TEXT, INT) TO recepcion_role;

-- admin_role
-- Admin tiene acceso total. Es el único que puede modificar
-- inventario, asignar veterinarios a mascotas, y ver historial.

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO admin_role;
GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA public TO admin_role;

-- Usuario genérico de veterinario — la app setea el vet_id real
DROP USER IF EXISTS vet_user;
CREATE USER vet_user WITH PASSWORD 'vet_dev_2026';
GRANT vet_role TO vet_user;

-- Usuario de recepción
DROP USER IF EXISTS recepcion_user;
CREATE USER recepcion_user WITH PASSWORD 'recepcion_dev_2026';
GRANT recepcion_role TO recepcion_user;

-- Usuario de administrador
DROP USER IF EXISTS admin_user;
CREATE USER admin_user WITH PASSWORD 'admin_dev_2026';
GRANT admin_role TO admin_user;