CREATE OR REPLACE PROCEDURE sp_agendar_cita(
    p_mascota_id     INT,
    p_veterinario_id INT,
    p_fecha_hora     TIMESTAMP,
    p_motivo         TEXT,
    OUT p_cita_id    INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_activo        BOOLEAN;
    v_dias_descanso VARCHAR(50);
    v_dia_semana    TEXT;
BEGIN
    -- Verificar que el veterinario existe y está activo
    SELECT activo, dias_descanso
      INTO v_activo, v_dias_descanso
      FROM veterinarios
     WHERE id = p_veterinario_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Veterinario % no existe', p_veterinario_id;
    END IF;

    IF NOT v_activo THEN
        RAISE EXCEPTION 'Veterinario % está inactivo', p_veterinario_id;
    END IF;

    -- Verificar día de descanso 
        v_dia_semana :=(
        CASE EXTRACT(DOW FROM p_fecha_hora)
            WHEN 0 THEN 'domingo'
            WHEN 1 THEN 'lunes'
            WHEN 2 THEN 'martes'
            WHEN 3 THEN 'miércoles'
            WHEN 4 THEN 'jueves'
            WHEN 5 THEN 'viernes'
            WHEN 6 THEN 'sábado'
    );

    IF v_dias_descanso <> '' AND
       v_dia_semana = ANY(string_to_array(v_dias_descanso, ',')) THEN
        RAISE EXCEPTION 'El veterinario descansa los %. No se puede agendar el %',
            v_dias_descanso, v_dia_semana;
    END IF;

    -- Verificar que la mascota existe
    IF NOT EXISTS (SELECT 1 FROM mascotas WHERE id = p_mascota_id) THEN
        RAISE EXCEPTION 'Mascota % no existe', p_mascota_id;
    END IF;

    -- Insertar la cita
    INSERT INTO citas (mascota_id, veterinario_id, fecha_hora, motivo, estado)
    VALUES (p_mascota_id, p_veterinario_id, p_fecha_hora, p_motivo, 'AGENDADA')
    RETURNING id INTO p_cita_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION fn_total_facturado(
    p_mascota_id INT,
    p_anio       INT
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total_citas    NUMERIC := 0;
    v_total_vacunas  NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(costo), 0)
      INTO v_total_citas
      FROM citas
     WHERE mascota_id = p_mascota_id
       AND estado = 'COMPLETADA'
       AND EXTRACT(YEAR FROM fecha_hora) = p_anio;

    SELECT COALESCE(SUM(costo_cobrado), 0)
      INTO v_total_vacunas
      FROM vacunas_aplicadas
     WHERE mascota_id = p_mascota_id
       AND EXTRACT(YEAR FROM fecha_aplicacion) = p_anio;

    RETURN v_total_citas + v_total_vacunas;
END;
$$;