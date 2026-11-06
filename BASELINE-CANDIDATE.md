# Candidato de baseline PostgreSQL: bloqueado, para revisión

Estado: **referencia experimental ejecutada hasta 0020; no es baseline de producción ni equivalencia certificada**. La referencia vive en la base aislada `baseline_candidate_20261031` del contenedor descartable autorizado; la copia histórica hasta 0017 vive en `experiments/baseline-reference/` y no modifica el historial original. No es una estrategia de actualización de bases existentes. El runner documentado abajo tampoco supone adopción: solo permite una reproducción revisada explícitamente en una base vacía de preview/desarrollo.

## Runner reutilizable experimental (requiere revisión explícita)

`scripts/baseline-runner.ts` dispone de dos modos. **No se conecta ni se ejecuta en Vercel durante este cambio.** La URL nunca se obtiene de `POSTGRES_URL`, `DATABASE_URL` ni de un fallback. Para Vercel, copiar manualmente las credenciales del entorno Preview o Development aprobado a `BASELINE_DATABASE_URL`; configurar Vercel `VERCEL_ENV` en el proceso hace que Production se rechace siempre. No usar credenciales ni destinos de producción. Neon puede ser el proveedor subyacente: el host real debe indicarse explícitamente y coincidir con la URL. Una conexión remota fuerza SSL.

Variables requeridas (solo nombres; no guardar valores en este documento):

- `BASELINE_DATABASE_URL`: URL PostgreSQL completa, proporcionada explícitamente para el destino autorizado.
- `VERCEL_ENV`: requerido y debe coincidir con `preview` o `development` cuando se apunta a esos entornos de Vercel. Para `disposable`, la URL debe apuntar estrictamente a loopback local. `VERCEL_ENV=production` se rechaza siempre.

Ejecutar desde cualquier directorio con `npx tsx` (no se agrega ni modifica ningún script de package.json):

```sh
npx tsx /ruta/absoluta/al/proyecto/scripts/baseline-runner.ts \
  --mode preflight \
  --expected-host '<host exacto de BASELINE_DATABASE_URL>' \
  --expected-database '<nombre exacto de base>' \
  --expected-user '<usuario exacto de base>' \
   --target-environment disposable
```

El ejemplo usa la base local descartable. El modo `preflight` es de solo lectura: comprueba identidad de host (comparando la URL), base y usuario, PostgreSQL 16, ausencia de esquemas de usuario ajenos a `public`, relaciones de usuario y metadata de Drizzle. No crea esquemas ni ejecuta migraciones. PostgreSQL 16 es el único aceptado porque la repetibilidad documentada se comprobó solo en 16.14. Para Vercel Preview/Development, usar `--target-environment preview` (o `development`) y ejecutar con `VERCEL_ENV` coincidente; la URL debe ser el endpoint directo, no el pooler. No correr contra Production.

Solo después de revisar el destino, el preflight y este documento, una persona debe autorizar por separado la aplicación en una base vacía disposable local o Vercel Preview/Development. El comando de escritura requiere confirmación exacta del nombre de base:

```sh
npx tsx /ruta/absoluta/al/proyecto/scripts/baseline-runner.ts \
  --mode apply \
  --expected-host '<host exacto de BASELINE_DATABASE_URL>' \
  --expected-database '<nombre exacto de base>' \
  --expected-user '<usuario exacto de base>' \
   --target-environment disposable \
  --confirm-database '<nombre exacto de base>'
```

`apply` adquiere un advisory lock de sesión antes de inspeccionar el estado, retiene la misma conexión (pool de una conexión) durante la comprobación y las dos llamadas al migrador, primero `experiments/baseline-reference/migrations` (corregidas `0000`–`0017`) y luego `src/drizzle/migrations` (journal `0000`–`0020`, aplicando solo las pendientes). Las rutas se resuelven desde el archivo del runner, no desde el directorio actual. Verifica al final 21 entradas, timestamp final `1792497100143` y tablas `public.order_payments` y `public.payment_exceptions`. La conexión se cierra incluso ante error; los mensajes no imprimen URL ni credenciales.

El runner es un guardarraíl operativo, no una certificación de equivalencia, no actualiza bases existentes y no es autorización para producción. Revisar el destino y obtener aprobación explícita antes de cada ejecución de `apply`; nunca ejecutar `apply` como parte de despliegue automático. Mantener las dos correcciones históricas descritas en el manifiesto bajo revisión y no alterar el journal ni migraciones originales.

## Evidencia y bloqueos

- El journal `src/drizzle/migrations/meta/_journal.json` enumera `0000`–`0020`. Los archivos `0018`–`0020` y el journal tienen cambios de trabajo preexistentes; deben conservarse tal como están.
- `0000_romantic_stature.sql` no crea `users`; `0001_add_stock_movements.sql` agrega una FK hacia `public.users`, creada recién en `0002_left_cassandra_nova.sql`. Capturar `duplicate_object` no resuelve una tabla ausente. Por inspección, una reproducción limpia en ese orden falla antes de completar `0001`.
- También hay superposición: `0001` crea `stock_movements` y agrega `products.is_visible`; `0002` intenta crear la misma tabla y agregar esa columna sin `IF NOT EXISTS`. Reordenar o saltar arbitrariamente sentencias no demuestra el resultado histórico correcto.
- El snapshot más reciente es `0017_snapshot.json`. Las migraciones `0018`–`0020` agregan `orders.user_id`, `order_payments` y `payment_exceptions`; tampoco hay prueba de que el snapshot `0017` represente todas las migraciones manuales anteriores. `schema.ts` es otra fuente a contrastar, no una prueba independiente de equivalencia.
- El historial incluye transformaciones de datos, por ejemplo `0008`, `0011`, `0016` y el backfill de `0017`. Un baseline de esquema vacío no reproduce por sí solo la actualización de datos existentes. `src/drizzle/seed.ts` borra y repuebla datos y usa una URL por defecto: no sirve como prueba de equivalencia ni debe incluirse automáticamente.
- Varias referencias históricas están calificadas como `public`, por ejemplo en `0001`, `0002` y `0017`. Cambiar solo `search_path` a un esquema único no aísla esas referencias. El test `postgres.integration.test.ts` usa un subconjunto sintético y explícitamente no valida migraciones.
- La copia experimental corregida se ejecutó en la base descartable `baseline_candidate_20261031` del contenedor autorizado, hasta `0017`. El preflight confirmó base vacía; después se observaron 25 tablas públicas y 18 filas en `drizzle.__drizzle_migrations`, con timestamp final `1792497100140`.
- La comparación de catálogo con `src/drizzle/migrations/meta/0017_snapshot.json` encontró los mismos 25 nombres de tablas y 211 nombres de columnas, pero no equivalencia literal: `product_variants.reserved_stock` está NOT NULL en la base y nullable en el snapshot; la base tiene CHECK de precio, FK e índice de `order_items.variant_id` e índice parcial de pedidos pendientes no declarados en el snapshot; hay dos diferencias de nombres de FK. El snapshot enumera columnas serial pero su mapa `sequences` vacío no basta para comparar secuencias físicas.
- Las diferencias principales tienen explicación en SQL histórico: `0003` añade `reserved_stock NOT NULL`, la FK e índice de `order_items.variant_id` y el índice parcial de pedidos; `0014` añade el CHECK de precio. Por eso el snapshot `0017` está incompleto respecto del resultado del SQL. Los nombres de FK dependen de truncamiento/lógica de nombres de PostgreSQL y no cambian la semántica de referencia/acción observada. La copia corregida del SQL, no el snapshot aislado, es la referencia experimental provisional para una instalación limpia.
- Tras un preflight que confirmó base/rol esperados, 25 tablas y solo 18 registros hasta el timestamp `0017`, se ejecutó el migrador con la URL explícita y un config separado para aplicar `0018`–`0020`. La verificación de solo lectura posterior observó 27 tablas, 21 registros hasta `1792497100143`, ambas tablas de pagos y `orders.user_id` nullable como exige preservar pedidos legados. La operación se limitó a la base candidata.
- Se creó una segunda base vacía `baseline_clean_20261031` en el mismo contenedor descartable y se reprodujo el mismo procedimiento en dos etapas: copia corregida `0000`–`0017`, luego SQL original `0018`–`0020`. Ambas bases tienen 21 filas de metadata con timestamps y hashes iguales; sus dumps `pg_dump --schema-only` de `public` y `drizzle` fueron idénticos (1.525 líneas normalizadas). Los conteos de defaults coinciden: una shipping method, una shipping rule, cuatro variant types y dos tablas de pago. `migrate` volvió a ejecutarse sin cambios en ambas candidatas y reportó éxito. Esto demuestra repetibilidad del **procedimiento experimental corregido** en el mismo PostgreSQL 16.14, no equivalencia con una instalación histórica ni portabilidad a otras versiones/roles.
- Una comparación manual read-only final entre las 27 tablas físicas y las 27 entidades de `src/drizzle/schema.ts` encontró coincidencia en columnas, tipos, nulabilidad, defaults, PK, índices y checks inspeccionados, con tres diferencias solo de nombre en FKs inline (`orders.user_id`, `order_payments.order_id`, `payment_exceptions.order_id`). `schema.ts` ahora declara esos nombres físicos explícitamente para evitar churn innecesario. La comparación fue manual, no un validador automatizado ni certificación de objetos extra del servidor.
- El runner pasó TypeScript y ESLint focalizado. Su modo `preflight` se ejecutó sobre `baseline_clean_20261031` con conexión de solo lectura, después de verificar contenedor/puerto y base/usuario/versión; reportó `non-empty-review-required`, schema `drizzle`, 21 registros y timestamp `1792497100143`, sin DDL/DML. Luego, con autorización separada y preflight de target vacío, `apply` reprodujo la referencia en `baseline_runner_20261031`, verificó 21 entradas y tablas de pagos. Los tres dumps normalizados `public`+`drizzle` de candidata, clean y runner son idénticos (1.525 líneas). El contenedor se reinició con autorización y quedó iniciado. Esto prueba el runner solo en loopback local PostgreSQL 16.14, no contra Vercel.
- Los snapshots existentes terminaban en `0017`; no describían `0018`–`0020`. No se usó `drizzle-kit generate`, porque comparar contra 0017 puede proponer DDL duplicado para cambios ya representados por migraciones manuales. Se creó `src/drizzle/migrations/meta/0020_snapshot.json` directamente con `generateDrizzleJson` de la API instalada, encadenado al `id` de 0017 y sin generar SQL. Una segunda ejecución del script `experiments/baseline-reference/snapshot-0020.mjs verify` regeneró el modelo y `generateMigration` devolvió diff vacío frente al snapshot guardado.

## Candidato propuesto, sujeto a resolución

La referencia experimental hasta 0020 se construyó con dos correcciones explícitas hasta 0017, documentadas en `experiments/baseline-reference/MANIFEST.md`, más las migraciones originales `0018`–`0020`. El runner pasó preflight y apply contra nuevas bases loopback descartables. Mantener el journal y SQL históricos intactos; no conectar ni ejecutar contra Vercel hasta confirmar instancia Preview, endpoint directo y autorización específica.

Alternativas para establecer la referencia: (1) una base histórica verificable, con procedencia y estado de migraciones comprobados, comparada sin copiar datos sensibles; o (2) una reproducción **documentada y revisada** mediante una copia aislada del historial con correcciones mínimas explícitas. La primera depende de evidencia externa; la segunda requiere decisiones sobre conflictos y no prueba por sí sola lo que ocurrió en una instalación histórica. Si ambas están disponibles, contrastarlas. No elegir unilateralmente cuál es canónica.

## Gates antes de adopción

1. Ejecutar primero `preflight` contra una base disposable local o una branch Vercel Preview dedicada. No apuntar a Production. Verificar que el host sea directo (no pooler), el rol, database, PostgreSQL 16 y que la identidad coincida con los argumentos; el script nunca obtiene URL por fallback.
2. Solo una base realmente vacía puede pasar a `apply`. Bases con tablas, schemas extra o metadata previa quedan clasificadas para revisión y no las adopta el runner.
3. Probar el runner primero en las bases descartables existentes, luego en una branch Preview vacía. Cualquier cambio Vercel requiere confirmar target y alcance; no conectar producción como parte de esta tarea.
4. Para una base existente, usar solo diagnóstico de lectura, respaldos y evaluación de historial. No insertar marcadores ni ejecutar 0018–0020 automáticamente sin una estrategia específica de adopción validada.
5. Antes de baseline formal, revisar datos iniciales, snapshots, transformaciones históricas, grants, extensiones y compatibilidad con el major real de PostgreSQL. La base experimental probada fue 16.14.

## Decisiones pendientes

- ¿Cuál será la fuente de verdad aceptada para el estado final y qué evidencia demuestra su procedencia?
- ¿Cómo resolver las inconsistencias de `0001`/`0002` en una referencia reproducible, sin reinterpretar silenciosamente la historia?
- ¿Qué datos iniciales son obligatorios para una instalación nueva y cuáles son solo transformaciones de datos existentes?
- ¿Qué aislamiento dentro del contenedor existente permite manejar las referencias a `public` sin afectar ningún otro recurso?

Las bases candidatas hasta 0020 son **referencias experimentales reproducibles**, no un baseline aprobado. El runner solo se ha probado en loopback local, no aplicado a Vercel; tampoco existe procedimiento de adopción de bases existentes. `schema.ts` y snapshot 0020 reflejan el estado deseado; el diff de Drizzle contra regeneración fresca está vacío. El replay requiere conservar las dos correcciones explícitas en la copia de 0001/0002. La comparación física se hizo manualmente y las repeticiones ocurrieron solo en PostgreSQL 16.14.
