Cuaderno de Ataques
Sistema Clínica Veterinaria · BDA Corte 3
Universidad Politécnica de Chiapas

Sección 1 — Tres ataques de SQL Injection que fallan
Ataque 1: El clásico engaño (' OR '1'='1)
Input exacto probado:

' OR '1'='1
Pantalla del frontend: Búsqueda de mascotas (/mascotas).

Qué intentaba hacer el atacante: Engañar a la base de datos con una condición que siempre es verdadera (1=1) para saltarse la seguridad y ver el registro de todas las mascotas, sin importar de quién sean.

Resultado observado: El sistema no devolvió nada (0 resultados). No hubo errores ni robo de información. El log muestra esto:

GET /api/mascotas?search=' OR '1'='1
[DB] query params: [ "%' OR '1'='1%" ]
Por qué falló (Línea que lo defendió):
Archivo: api/src/index.js, línea ~62

JavaScript
const result = await db.query(role, vetId, sql, [`%${search}%`]);
Nuestra capa de conexión empaqueta lo que el usuario escribe de forma segura. En lugar de procesar el ataque como una orden, lo trató como si fuera simple texto. Es decir, la base de datos literalmente se puso a buscar una mascota que se llamara " ' OR '1'='1 ", y como no existe, no mostró nada.

Ataque 2: Intento de borrar todo ('; DROP TABLE mascotas; --)
Input exacto probado:

'; DROP TABLE mascotas; --
Pantalla del frontend: Búsqueda de mascotas.

Qué intentaba hacer el atacante: Cerrar la búsqueda normal y ejecutar una segunda instrucción destructiva para borrar por completo la tabla de mascotas.

Resultado observado: El sistema devolvió 0 resultados y la tabla sigue intacta.

[DB] query params: [ "%'; DROP TABLE mascotas; --%"  ]
Por qué falló (Línea que lo defendió):
Archivo: api/src/db.js, línea ~43

JavaScript
const result = await client.query(sql, params);
Primero, nuestra configuración no permite enviar múltiples instrucciones de golpe. Segundo, al igual que en el ataque anterior, el sistema blindó el texto. Nunca interpretó la palabra DROP TABLE como un comando, sino como un texto cualquiera que el usuario metió en el buscador.

Ataque 3: Intento de robar datos ocultos (' UNION SELECT cedula,nombre,cedula,cedula,cedula,cedula FROM veterinarios --)
Input exacto probado:

' UNION SELECT cedula,nombre,cedula,cedula,cedula,cedula FROM veterinarios --
Pantalla del frontend: Búsqueda de mascotas.

Qué intentaba hacer el atacante: Unir la lista de mascotas con información privada de la tabla de veterinarios para extraer sus datos.

Resultado observado: 0 resultados.

[DB] query params: [ "%' UNION SELECT cedula,nombre,...%"  ]
Por qué falló:
Nuevamente nos protegió la parametrización en api/src/index.js (línea ~62). El sistema neutralizó la palabra UNION SELECT quitándole su poder de instrucción. Simplemente buscó pacientes cuyo nombre incluyera esa frase tan rara.

Sección 2 — Demostración de Row-Level Security (RLS)
La prueba
En nuestra clínica, el Dr. Fernando atiende a Firulais, Toby y Max. Por su parte, la Dra. Sofía atiende a Misifú, Luna y Dante.

Lo que ve el Dr. Fernando:
Al iniciar sesión y darle buscar a "todas las mascotas", el sistema le muestra solo sus pacientes:

#1  Firulais   perro   María González
#5  Toby       perro   María González
#7  Max        perro   Roberto Cruz
Lo que ve la Dra. Sofía:
Haciendo exactamente la misma búsqueda en la misma pantalla, ella ve algo totalmente distinto:

#2  Misifú   gato   Carlos Hernández
#4  Luna     gato   Diego Ramírez
#9  Dante    perro  Carlos Hernández
¿Cómo logramos esta magia?
Gracias a esta política de seguridad que configuramos directamente en la base de datos:

SQL
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
Explicación sencilla: Esto es un filtro invisible. Cada vez que alguien hace una petición desde la API, nosotros le pasamos discretamente a la base de datos el ID de quién está preguntando (app.current_vet_id). La base de datos revisa esa identificación y solo devuelve los animales que están bajo el cuidado de ese doctor en específico.

Sección 3 — Demostración de memoria caché (Redis)
¿Cómo funciona en la práctica? (Logs del servidor)
// 1. Primera vez que alguien pregunta: El caché está vacío, toma tiempo porque va hasta la base de datos.
[CACHE MISS] vacunacion_pendiente — 2026-04-22T10:15:00.123Z
[BD] vacunacion_pendiente en 187ms

// 2. Alguien vuelve a preguntar enseguida: El caché responde casi al instante (5ms).
[CACHE HIT]  vacunacion_pendiente — 2026-04-22T10:15:04.891Z

// 3. ¡Ojo! Vacunamos a Firulais. El sistema inmediatamente borra el caché para no dar datos viejos.
[POST /api/vacunas] Vacuna aplicada a mascota_id=1 (Firulais)
[CACHE INVALIDADO] vacunacion_pendiente — 2026-04-22T10:15:22.005Z

// 4. Siguiente pregunta: Como borramos el caché, vuelve a ir a la BD para traer la lista actualizada (sin Firulais).
[CACHE MISS] vacunacion_pendiente — 2026-04-22T10:15:24.331Z
[BD] vacunacion_pendiente en 201ms
Nuestras reglas de memoria
Tiempo de vida (TTL): Le dimos un límite de 5 minutos (300 segundos). Elegimos este tiempo porque hacer esta consulta es pesado para la base de datos y se hace decenas de veces por hora, pero las vacunas realmente se aplican muy de vez en cuando. 5 minutos alivia el servidor sin mostrar información demasiado vieja.

Estrategia de limpieza (Invalidación): No nos esperamos a que pasen los 5 minutos si hay cambios importantes. Cada vez que un veterinario registra que aplicó una vacuna, nuestra API ejecuta un comando de limpieza (redis.del('vacunacion_pendiente')). Así garantizamos que, en la siguiente consulta, el sistema vuelva a calcular la lista con datos frescos.