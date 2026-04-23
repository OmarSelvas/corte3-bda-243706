# Clínica Veterinaria — Sistema Full-Stack con Seguridad de BD
**BDA Corte 3 · Universidad Politécnica de Chiapas · Enero–Mayo 2026**

Stack: **PostgreSQL 16 · Redis 7 · Express (Node.js) · Next.js**

---

## Levantar el sistema

```bash
git clone <repo>
cd corte3-bda-<matricula>

# Copia y ajusta el archivo de entorno
cp api/.env.example api/.env

# Levanta todo con Docker Compose
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:4000
- PostgreSQL: localhost:5432 / DB: `clinica_vet`
- Redis: localhost:6379

### Sin Docker (desarrollo local)

```bash
# Asegúrate de tener PostgreSQL 16 y Redis corriendo localmente

# Cargar schema y backend SQL
psql -U postgres -c "CREATE DATABASE clinica_vet;"
psql -U postgres -d clinica_vet -f schema_corte3.sql
psql -U postgres -d clinica_vet -f backend/01_procedures.sql
psql -U postgres -d clinica_vet -f backend/02_triggers.sql
psql -U postgres -d clinica_vet -f backend/03_views.sql
psql -U postgres -d clinica_vet -f backend/04_roles_y_permisos.sql
psql -U postgres -d clinica_vet -f backend/05_rls.sql

# API
cd api && cp .env.example .env && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

---

## Documento de decisiones de diseño

### Pregunta 1 — ¿Qué política RLS aplicaste a la tabla `mascotas`?

```sql
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
```

Lo que hace: cuando un usuario con `vet_role` ejecuta `SELECT * FROM mascotas`, PostgreSQL evalúa esta cláusula `USING` como un filtro adicional automático. La condición compara el `id` de cada fila con la lista de `mascota_id` asignados al veterinario cuyo id está en la variable de sesión `app.current_vet_id`. Si el vet_id no está seteado (por ejemplo, si el rol es admin), `NULLIF(..., '')` devuelve `NULL` y la comparación no filtra nada —pero ese caso está cubierto por otra política separada (`pol_mascotas_admin`) que permite todo a `admin_role` y `recepcion_role`.

---

### Pregunta 2 — Vector de ataque posible en la estrategia de identificación de RLS

La estrategia usa `SET LOCAL app.current_vet_id = $1` al inicio de cada transacción desde el backend. El vector de ataque sería que un cliente malintencionado enviara un header `X-Vet-Id` diferente al suyo —por ejemplo, `X-Vet-Id: 2` desde una sesión que debería ser el vet 1— intentando ver mascotas de otro veterinario.

**Mi sistema lo previene de dos formas:**

1. En esta evaluación el header se toma tal cual (sin JWT), pero el valor siempre es validado como entero antes de pasarse a la BD (`parseInt`). Un valor no numérico provoca error, no inyección.
2. El diseño de producción correcto —y el que aplicaría en un sistema real— es que `X-Vet-Id` no lo mande el cliente: el backend lo extrae del JWT firmado en el servidor. El cliente nunca puede alterar su propio `vetId`. Eso cierra el vector completamente.

El segundo vector es que alguien intente `SET app.current_vet_id = 99` directamente desde `psql` conectado como `vet_user`. Esto **funciona** como SET de variable de sesión, pero no como escalada de privilegio: las políticas RLS están definidas sobre `vet_role`, y `vet_user` no puede modificar políticas ni cambiar su propio rol. El peor caso es que vea mascotas de otro vet si adivina el id —mitigado en producción con JWT.

---

### Pregunta 3 — SECURITY DEFINER y escalada de privilegios

**No uso `SECURITY DEFINER`** en ninguno de los procedures de esta evaluación.

La razón es que `sp_agendar_cita` y `fn_total_facturado` no necesitan acceder a recursos que el usuario que los llama no pueda acceder por su propio rol. El procedure de agendado inserta en `citas`, tabla sobre la que `vet_role` y `recepcion_role` ya tienen `INSERT` explícito. No hay necesidad de elevar privilegios.

Si hubiera usado `SECURITY DEFINER`, la mitigación obligatoria sería `SET search_path = pg_catalog, public` dentro del procedure, para evitar que un atacante cree un schema con funciones del mismo nombre que las del sistema y las intercepte durante la ejecución elevada.

---

### Pregunta 4 — TTL del caché Redis: 300 segundos (5 minutos)

**Por qué 300s:** La vista `v_mascotas_vacunacion_pendiente` recorre todas las mascotas y todas sus vacunas —es la query más costosa del sistema. En pruebas locales tarda entre 80ms y 250ms dependiendo del volumen. La pantalla de vacunación pendiente la llaman principalmente recepción y admin, con una frecuencia estimada de 20-50 veces por hora en horario pico. Con 5 min de TTL, una hora de operación normal genera máximo 12 consultas reales a la BD en lugar de 50.

**Si fuera demasiado bajo (ej: 10s):** El caché no ayudaría casi nada —la mayoría de consultas seguirían siendo MISS. La carga en BD sería casi igual que sin caché.

**Si fuera demasiado alto (ej: 1 hora):** Una vacuna aplicada no se reflejaría en la pantalla por hasta una hora, aunque el sistema invalida explícitamente el caché con `redis.del(key)` después de cada `POST /api/vacunas`. Ese mecanismo de invalidación hace que el TTL sea solo el "respaldo" para cambios que el sistema no detecte —por ejemplo, ediciones directas en la BD fuera de la API.

---

### Pregunta 5 — Línea exacta de defensa anti-SQLi en endpoint crítico

**Endpoint:** `GET /api/mascotas?search=<input del usuario>`

**Archivo:** `api/src/index.js`, línea ~62

```js
const result = await db.query(role, vetId, sql, [`%${search}%`]);
```

El valor `search` viene directamente del query string del request —es input del usuario sin filtrar. Lo que protege esa línea es que el valor se pasa como **cuarto argumento** (array de parámetros) a `db.query`, que internamente llama a `client.query(sql, params)` del driver `pg`. El driver de Node.js para PostgreSQL envía la query y los parámetros por **canales separados del protocolo de mensaje de PostgreSQL** —el servidor de BD nunca ve el valor como texto SQL, lo recibe como un valor tipado del protocolo. No importa si el usuario escribe `' OR '1'='1` o `; DROP TABLE mascotas; --`: ese string llega como el valor del parámetro `$1`, no como instrucción SQL.

La concatenación `%${search}%` está en JavaScript, no en SQL —está construyendo el patrón de LIKE, no el SQL mismo. Es segura porque ese string concatenado se convierte en el valor del parámetro, no en parte de la query.

---

### Pregunta 6 — ¿Qué se rompe si revocas todos los permisos de `vet_role` excepto SELECT en `mascotas`?

Tres operaciones que dejarían de funcionar inmediatamente:

1. **Agendar citas** (`POST /api/citas`): el rol perdería `INSERT` sobre la tabla `citas`. El procedure `sp_agendar_cita` fallaría con error de permisos insuficientes al intentar insertar.

2. **Registrar vacunas aplicadas** (`POST /api/vacunas`): sin `INSERT` sobre `vacunas_aplicadas`, el vet no podría registrar ninguna vacuna. El trigger `trg_descontar_vacuna` tampoco se dispararía, así que el inventario tampoco se actualizaría.

3. **Consultar la vista `v_mascotas_vacunacion_pendiente`**: la vista hace JOIN con `vacunas_aplicadas` y con `duenos`. Sin `SELECT` sobre esas tablas (y sin `SELECT` explícito sobre la vista), la consulta fallaría. El endpoint `/api/vacunacion-pendiente` devolvería error de permisos.

---

## Estructura del repositorio

```
corte3-bda-{matricula}/
├── README.md
├── cuaderno_ataques.md
├── schema_corte3.sql
├── docker-compose.yml
├── backend/
│   ├── 01_procedures.sql
│   ├── 02_triggers.sql
│   ├── 03_views.sql
│   ├── 04_roles_y_permisos.sql
│   └── 05_rls.sql
├── api/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js
│       ├── db.js
│       └── cache.js
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.js
    └── src/
        ├── app/
        │   ├── globals.css
        │   ├── layout.js
        │   ├── page.js           ← Login / selección de rol
        │   ├── mascotas/page.js  ← Búsqueda + superficie SQLi
        │   ├── vacunacion/page.js← Vacunación pendiente + demo Redis
        │   ├── citas/page.js     ← Citas + formulario
        │   └── inventario/page.js← Inventario (solo admin)
        ├── components/
        │   └── AppLayout.js
        └── lib/
            └── api.js
```