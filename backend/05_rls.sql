-- TABLA: mascotas
ALTER TABLE mascotas ENABLE ROW LEVEL SECURITY;

-- Admin y recepción: ven todo (política permisiva)
DROP POLICY IF EXISTS pol_mascotas_admin ON mascotas;
CREATE POLICY pol_mascotas_admin ON mascotas
    FOR ALL
    TO admin_role, recepcion_role
    USING (true)
    WITH CHECK (true);

-- Veterinario: solo sus mascotas asignadas (política restrictiva)
DROP POLICY IF EXISTS pol_mascotas_vet ON mascotas;
CREATE POLICY pol_mascotas_vet ON mascotas
    FOR SELECT
    TO vet_role
    USING (
        id IN (
            SELECT mascota_id
              FROM vet_atiende_mascota
             WHERE vet_id = NULLIF(current_setting('app.current_vet_id', true), '')::INT
               AND activa = true
        )
    );

-- =============================================================
-- TABLA: vacunas_aplicadas
-- =============================================================
ALTER TABLE vacunas_aplicadas ENABLE ROW LEVEL SECURITY;

-- Admin: ve todo
DROP POLICY IF EXISTS pol_vacunas_admin ON vacunas_aplicadas;
CREATE POLICY pol_vacunas_admin ON vacunas_aplicadas
    FOR ALL
    TO admin_role
    USING (true)
    WITH CHECK (true);

-- Veterinario: solo vacunas de sus mascotas (SELECT + INSERT)
DROP POLICY IF EXISTS pol_vacunas_vet_select ON vacunas_aplicadas;
CREATE POLICY pol_vacunas_vet_select ON vacunas_aplicadas
    FOR SELECT
    TO vet_role
    USING (
        mascota_id IN (
            SELECT mascota_id
              FROM vet_atiende_mascota
             WHERE vet_id = NULLIF(current_setting('app.current_vet_id', true), '')::INT
               AND activa = true
        )
    );

-- INSERT: el vet solo puede insertar vacunas a sus mascotas
DROP POLICY IF EXISTS pol_vacunas_vet_insert ON vacunas_aplicadas;
CREATE POLICY pol_vacunas_vet_insert ON vacunas_aplicadas
    FOR INSERT
    TO vet_role
    WITH CHECK (
        mascota_id IN (
            SELECT mascota_id
              FROM vet_atiende_mascota
             WHERE vet_id = NULLIF(current_setting('app.current_vet_id', true), '')::INT
               AND activa = true
        )
    );

-- Recepción: DENIEGA acceso (información médica)
DROP POLICY IF EXISTS pol_vacunas_recepcion_deny ON vacunas_aplicadas;
CREATE POLICY pol_vacunas_recepcion_deny ON vacunas_aplicadas
    FOR ALL
    TO recepcion_role
    USING (false)
    WITH CHECK (false);

-- =============================================================
-- TABLA: citas
-- =============================================================
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

-- Admin y recepción: ven todo y pueden insertar
DROP POLICY IF EXISTS pol_citas_admin_recep ON citas;
CREATE POLICY pol_citas_admin_recep ON citas
    FOR ALL
    TO admin_role, recepcion_role
    USING (true)
    WITH CHECK (true);

-- Veterinario: solo las citas donde él es el vet asignado (SELECT)
DROP POLICY IF EXISTS pol_citas_vet_select ON citas;
CREATE POLICY pol_citas_vet_select ON citas
    FOR SELECT
    TO vet_role
    USING (
        veterinario_id = NULLIF(current_setting('app.current_vet_id', true), '')::INT
    );

-- INSERT: el vet solo puede agendar citas donde él es el vet
DROP POLICY IF EXISTS pol_citas_vet_insert ON citas;
CREATE POLICY pol_citas_vet_insert ON citas
    FOR INSERT
    TO vet_role
    WITH CHECK (
        veterinario_id = NULLIF(current_setting('app.current_vet_id', true), '')::INT
    );