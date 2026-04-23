-- trg_historial_cita
-- Después de insertar una cita, registra el movimiento en
-- historial_movimientos con tipo 'CITA_AGENDADA'.
CREATE OR REPLACE FUNCTION fn_trg_historial_cita()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO historial_movimientos (tipo, referencia_id, descripcion)
    VALUES (
        'CITA_AGENDADA',
        NEW.id,
        FORMAT('Cita agendada: mascota_id=%s, vet_id=%s, fecha=%s, motivo=%s',
               NEW.mascota_id, NEW.veterinario_id, NEW.fecha_hora, NEW.motivo)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_historial_cita ON citas;
CREATE TRIGGER trg_historial_cita
    AFTER INSERT ON citas
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_historial_cita();

-- trg_alerta_stock_bajo
-- Después de actualizar inventario_vacunas, si el stock cae
-- por debajo del mínimo, genera una alerta automática.
CREATE OR REPLACE FUNCTION fn_trg_alerta_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.stock_actual < NEW.stock_minimo THEN
        INSERT INTO alertas (tipo, descripcion)
        VALUES (
            'STOCK_BAJO',
            FORMAT('Vacuna "%s" (id=%s) con stock %s, mínimo requerido: %s',
                   NEW.nombre, NEW.id, NEW.stock_actual, NEW.stock_minimo)
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alerta_stock ON inventario_vacunas;
CREATE TRIGGER trg_alerta_stock
    AFTER UPDATE OF stock_actual ON inventario_vacunas
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_alerta_stock();

-- trg_descontar_vacuna
-- Después de registrar una vacuna aplicada, descuenta 1 unidad
-- del inventario. El trigger de stock se dispara si cae abajo.
CREATE OR REPLACE FUNCTION fn_trg_descontar_vacuna()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE inventario_vacunas
       SET stock_actual = stock_actual - 1
     WHERE id = NEW.vacuna_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_descontar_vacuna ON vacunas_aplicadas;
CREATE TRIGGER trg_descontar_vacuna
    AFTER INSERT ON vacunas_aplicadas
    FOR EACH ROW
    EXECUTE FUNCTION fn_trg_descontar_vacuna();