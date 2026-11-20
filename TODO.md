# TODO - armaduki

Tablero vivo de la app (v2): qué se hizo, qué sigue y en qué orden. La v1 (Fase 2, febrero a noviembre de 2026) está archivada en `docs/TODO - v1.md`, con sus decisiones y esquemas.

## Cómo usar este TODO

- [x] Se lee y se ejecuta de arriba hacia abajo, de a un ítem por vez. Un ítem no toca otros módulos salvo lo que necesita.
- [x] Los sprints son por objetivo, no por fecha. Al cerrar cada uno, Ángela lo revisa antes de seguir.
- [x] Cuando Ángela dice «hacé el Sprint N», Claude lo implementa, lo verifica (lint, tests, build y una prueba en navegador contra una API local), hace commit y push a `main`, que publica en Vercel, y le pasa dónde y cómo probarlo. El sprint se cierra cuando ella lo prueba.
- [x] Primero la base (Sprints 1 a 5), después las funciones nuevas (Sprints 6 a 10).
- [x] En cada sprint va solo lo que se puede hacer ya. Lo que espera una decisión va en «Cosas por cerrar», con quién decide y un default para seguir.
- [x] Un ítem nuevo se conversa antes de construirlo. Lo que sugiere Claude está marcado como **Propuesta**: Ángela lo acepta o lo descarta.
- [x] Lo que Ángela anota en Notion (Personal / Projects / armaduki) se pasa acá antes de hacerlo.
- [x] Los ítems que vienen de la v1 conservan su código entre paréntesis (`F2-…`, `RV-…`).
- [x] Cada ítem se prueba en local al cerrarlo. Cada sprint cierra con lint, tests, build, commit y pasos cortos de prueba manual.
- [x] Mobile-first: cada cambio de UI se diseña y se prueba primero en el teléfono.
- [x] La UI de la app sigue en inglés; este TODO y las conversaciones, en castellano.
- [x] El generador no cambia sin tests: `npm test`, lint y build antes y después. Cómo funciona: `docs/GENERADOR.md`.
- [x] Si un ítem toca la planilla o el Apps Script, primero se actualiza el contrato de datos y se confirma que lo anterior sigue andando. La planilla solo suma columnas, así la versión anterior del backend siempre sirve para volver atrás.
- [x] El backend se publica con `npm run backend:release` (detalle en `apps-script/README.md`): tests, versión nueva, prueba en una implementación temporal y recién ahí producción, que vuelve sola a la versión anterior si algo falla.

## Decisiones cerradas

- [x] Backend: Google Sheets + Apps Script, publicado con `clasp` (`npm run backend:release`). Producción usa la versión 20 (19/11/2026); la 19 queda para volver atrás.
- [x] El ID de la planilla vive en las propiedades del script, no en el código; el Script ID, en `apps-script/.clasp.json`, que git ignora.
- [x] Una sola implementación del backend en producción, más `@HEAD`; las viejas se borraron (18/11). Las versiones quedan en el historial del script.
- [x] `main` publica en Vercel. El repo es público: ningún ID, clave ni dato de la planilla entra al repo.
- [x] Nada de Claude web: ni artifacts, ni Claude Docs, ni conectores de claude.ai. Notion entra como servidor local.
- [x] Reglas del generador de la v1 (F2-01.2, F2-01.3, F2-01.5, F2-01.7): wants mutuos estrictos (desde el Sprint 2, los de un solo lado son preferencia); si un equipo no tiene GK, necesita 2 arqueras de emergencia (`good` o `low`); 3 GK no se bloquea; ATT con diferencia máxima de 1 entre equipos; owner bias por Power.
- [x] Owner bias: sigue como regla fuerte y con Power (19/11).
- [x] Los equipos se cargan a mano en la pestaña `Teams`; el modal solo los elige (F2-05.2.0).
- [x] Orden de los sprints: la base, el generador y el rediseño van antes de las funciones nuevas (18/11).
- [x] Fecha de nacimiento: opcional; se guarda la fecha y se muestra la edad (18/11).

## Sprint 0 - Revisión técnica (hecho)

Objetivo: que lo que ya existe funcione bien antes de sumar cosas. El detalle está en la sección «Revisión técnica» de la v1.

- [x] **Ángela:** guardó desde el sitio publicado y todo anduvo bien (18/11) (RV-11).
- [x] Cada guardado se confirma con la respuesta del Apps Script: si falla, aparece un aviso con `Retry`. Los guardados van de a uno y en orden (RV-01).
- [x] Un cambio manda solo los campos que cambiaron (RV-02).
- [x] Un ID nuevo nunca reusa uno viejo; borrar a alguien limpia sus links; aviso si la planilla tiene IDs repetidos o vacíos (RV-03). La planilla real está limpia.
- [x] Clear links solo toca a quien tiene links (RV-04).
- [x] Generador: cuando ningún reparto cumple todo, elige el que rompe menos reglas y explica por qué; la etapa estricta da lo mismo que antes (RV-05). Tests con `npm test` (RV-06).
- [x] Arreglos del modal, el avatar y la vista en el teléfono (RV-07, RV-08).
- [x] Apps Script: candado en las escrituras, rechazo de IDs repetidos, chequeo de esquema cacheado e ID de la planilla en propiedades (RV-09). Publicado con `clasp` en la versión 19 y probado en una implementación temporal y en producción (RV-10).
- [x] Implementaciones viejas del backend borradas (RV-17).
- [x] De los criterios de cierre de la Fase 2 ya se cumplían lint, build, el scroll al resultado (F2-09), el footer abajo (F2-00.7) y Escape en los modales (F2-00.8). Los demás son objetivo de los Sprints 6, 8 y 10.

## Sprint 1 - Lo que anotaste en Notion (hecho)

Objetivo: los pedidos chicos que anotaste en Notion. Solo frontend. El tercero, «Terminar Fase 2», quedó repartido en los Sprints 6 a 10.

- [x] **Ángela:** probarlo con los pasos de abajo.
- [x] «sort selected»: orden «Sort: selected» en Match y en Players, que deja arriba a las elegidas y mantiene el orden de siempre dentro de cada grupo (19/11).
- [x] «que en el navbar aparezcan los seleccionados»: la primera versión (las elegidas como chips en una segunda fila del header de Match) no gustó y se sacó (19/11). Pasa al rediseño (Sprint 5).
- [x] Verificado en Edge, en teléfono y en escritorio, contra una API local: ningún error de consola.

Prueba (en https://armaduki.vercel.app, mejor desde el teléfono):

1. En Match, tocá algunas jugadoras y elegí «Sort: selected» en el orden: las elegidas quedan primero. Con ese orden, una tarjeta que tocás salta arriba.
2. En Players, elegí «Sort: selected»: las que dicen «selected» quedan primero.
3. El header volvió a ser como antes, sin la fila de elegidas.

## Sprint 2 - El generador: cómo funciona y qué mejorar (hecho)

Objetivo: entender el algoritmo y decidir si se mejora. La explicación completa, con cómo era antes de la revisión, está en `docs/GENERADOR.md`.

- [x] **Ángela:** probarlo con los pasos de abajo.
- [x] **Ángela:** leer `docs/GENERADOR.md` (19/11).
- [x] Prioridad del fallback: queda como está (19/11). Ver «Cosas por cerrar».
- [x] Ideas (19/11): se prueban los wants de un solo lado como preferencia y la social satisfaction como desempate. El owner bias sigue como regla fuerte. Los pesos se ajustan con los resultados de los partidos (Sprint 9). La variedad pasa al backlog. Rating y formación ideal: ver «Cosas por cerrar».
- [x] Wants: los mutuos siguen estrictos; los de un solo lado son preferencia y cada uno que queda en equipos distintos resta 15 puntos, lo mismo que 1,5 puntos de diferencia de rating (19/11). Ver «Cosas por cerrar».
- [x] Social satisfaction como desempate entre repartos con el mismo score (19/11).
- [x] El análisis muestra los wants de un solo lado respetados y rotos, y el término `wantsPref` en la fórmula. La etiqueta «balanced» no descuenta los wants rotos.
- [x] Verificado: sin wants de un solo lado, el resultado es idéntico al de antes, en estricto y en fallback; con wants de un solo lado, un verificador independiente elige el mismo reparto; tests nuevos en `npm test` y prueba en Edge contra una API local.

Prueba (en https://armaduki.vercel.app):

1. En Players, editá a una jugadora (A) y marcá que quiere jugar con otra (B), sin que B la marque a ella. Después armá un par mutuo: C quiere jugar con D y D con C.
2. En Match, elegí 10 que incluyan a A, B, C y D y generá los equipos.
3. C y D quedan siempre juntas. A y B quedan juntas salvo que separarlas empareje bastante los equipos. En el análisis, en «Social», aparece cuántos wants de un solo lado se respetaron («One-way wants … kept») o cuáles se rompieron.
4. Para ver uno roto seguro: hacé que una GK quiera jugar con otra GK, de un solo lado. Elegí a las dos entre las 10, sin la tercera GK (con 3 GK siempre hay fallback). Como no pueden ir dos GK en el mismo equipo, antes esto mandaba al fallback. Ahora sale un resultado normal y el análisis muestra «Broken one-way wants» y `wantsPref(-15)` en la fórmula.
5. Al terminar, sacá esos wants editando a A, C, D y la GK. «Clear Wants» también sirve, pero borra los wants de todas.

## Sprint 3 - Base técnica (hecho, falta tu prueba)

Objetivo: dejar el código y las herramientas listos para crecer.

- [ ] **Ángela:** probarlo con los pasos de abajo.
- [x] **Ángela:** aprobó publicar el backend nuevo (19/11). Claude lo publicó con `npm run backend:release -- "readAll"`: producción pasó de la versión 19 a la 20, con pruebas en la implementación temporal y en producción, y la temporal se borró.
- [x] Búsqueda, filtros y orden de Players y Match en un solo lugar (F2-06.6, RV-15): la lógica en `src/utils/playerListing.ts`, con tests; el estado en `src/hooks/usePlayerListing.ts`, uno por página; los controles y sus estilos en `src/components/PlayerListControls`. Un recorrido grabado por las dos páginas, en teléfono y en escritorio, da el mismo resultado antes y después.
- [x] Los tests de la revisión están en `npm test`: `Code.gs` en Node contra una planilla en memoria y el store de punta a punta contra `Code.gs`. Ninguno puede llegar a la planilla real.
- [x] `npm run backend:release`: tests de `Code.gs`, versión nueva, implementación temporal con pruebas, pase a producción, pruebas otra vez y limpieza. Si una prueba falla antes del pase, producción no cambia; si falla después, vuelve a la versión anterior. No imprime IDs. `npm run backend:release -- --check` solo muestra la versión de producción. Probado con un clasp simulado y usado de verdad para publicar la versión 20 (19/11).
- [x] Una sola lectura al abrir: la acción `readAll` trae jugadoras y equipos en un pedido. Si la pestaña `Teams` falla, las jugadoras cargan igual. Con un backend sin `readAll` (la versión 19 o anteriores, por ejemplo al volver atrás), la app usa las dos lecturas de antes, después de un pedido de más. En producción, el pedido único tarda un poco menos que las dos lecturas en paralelo.
- [x] `npm audit fix` (RV-16): react-router 7.18.6, vite 7.3.8 y typescript-eslint 8.73; `npm audit` sin vulnerabilidades.
- [x] Borrados `src/assets/react.svg` y `public/vite.svg`, que no se usaban.
- [x] Verificado: lint, tipos, 67 tests, build y pruebas en Edge contra una API local: un pedido al abrir con el backend nuevo, las dos lecturas de antes con la versión 19 y jugadoras cargadas con la pestaña `Teams` rota.

Prueba (en https://armaduki.vercel.app, mejor desde el teléfono):

1. En Players y en Match, probá la búsqueda, el filtro de rol y los órdenes: todo anda igual que antes. Con privacy mode apagado, probá también el filtro y el orden por score, con la flecha.
2. «Clear» → «Clear Filters» deja todo como al principio.
3. En Players, «+ Add Player» → «Extra info»: la lista de equipos carga.
4. La app abre con un solo pedido. En la computadora se ve con F12 → Network, filtrando por `exec`: aparece `readAll` y ya no `read` ni `readTeams`.

## Sprint 4 - Clave y privacidad

Objetivo: proteger los datos con una clave.

- [ ] Pedir una clave para guardar, como en VolkosFood (RV-13, F2-12.4). **Propuesta.**
- [ ] Pedir la clave también para leer. **Propuesta.**
- [ ] Abrir al instante con la última lectura guardada en el dispositivo y actualizar detrás, una vez que la clave esté puesta. **Propuesta.**
- [ ] Aplicar en toda la app lo que se decida que oculta privacy mode (RV-12). Ver «Cosas por cerrar».

## Sprint 5 - Rediseño con Fable

Objetivo: darle a la app el mismo nivel de diseño que VolkosFood. Se hace en una sesión con Claude Fable 5.2, el modelo del rediseño de VolkosFood.

- [ ] Escribir la dirección de diseño en `docs/DESIGN_DIRECTION.md` (idea, decisiones, lenguaje visual, movimiento y flujos), partiendo de lo que ya es armaduki: oscuro, rojo, la pelota, mobile-first y privacy mode. **Ángela la aprueba antes de tocar la UI.**
- [ ] Rediseñar Players, Match, el resultado de equipos, el análisis y el modal de jugadora.
- [ ] Repensar cómo mostrar las seleccionadas en el navbar (pedido de Notion). La primera versión, con chips en una segunda fila del header, no gustó (19/11).
- [ ] Recorrido en escritorio y en el teléfono contra una API local, sin tocar la planilla real.
- [ ] Revisión de Ángela antes de seguir.

## Sprint 6 - Campos de jugadora

Objetivo: cargar desde el modal los datos que la planilla ya tiene (resto de la Fase 2). Las columnas ya existen; los esquemas están en `apps-script/README.md`.

- [ ] Grupo o cancha habitual y día/lugar, con varios valores (F2-05.3). Los grupos se cargan en la pestaña `Groups`.
- [ ] Mostrar el equipo en la tarjeta (F2-05.6).
- [ ] Varios roles por jugadora, en lugar de la segunda posición (F2-05.9): cada una tiene la lista de roles que juega y FLEX pasa a ser «todos». Las filas con FLEX siguen valiendo. Antes, decidir qué cuentan las reglas del generador (ver «Cosas por cerrar»). Va después del rediseño, para diseñar el modal una sola vez.
- [ ] `active`: ocultar jugadoras inactivas sin borrarlas (F2-05.10).
- [ ] Notas internas, opcionales (F2-05.11).
- [ ] Fecha de nacimiento, opcional: se guarda la fecha y se muestra la edad (F2-05.8). **Propuesta:** guardarla en una columna nueva `birthDate` (AAAA-MM-DD) y dejar sin uso `birthYear`. Va después de la clave (Sprint 4) por ser un dato personal.
- [ ] Al cerrar: los campos nuevos leen y escriben sin romper a las jugadoras existentes (criterio de cierre de la Fase 2).

## Sprint 7 - Filtros y orden

Objetivo: encontrar rápido a quién elegir. Usa la búsqueda unificada del Sprint 3.

- [ ] Filtro por equipo en Players y en Match (F2-06.1, F2-06.3).
- [ ] Filtro por grupo o cancha y por día/lugar en Players y en Match (F2-06.2, F2-06.4).
- [ ] Orden por camiseta, equipo, grupo o día/lugar donde sume (F2-06.5).

## Sprint 8 - Wants y avoids con historial

Objetivo: elegir relaciones más rápido, empezando por las de siempre.

- [ ] Confirmar el contrato de la pestaña `RelationshipHistory` (F2-07.1). Un «no quiero» se guarda como avoid (F2-07.3).
- [ ] Apps Script: al agregar un want o un avoid nuevo, sumar 1 a su contador (F2-07.5).
- [ ] Leer el historial con la acción `readRelationshipHistory` y valores por defecto si está vacío (F2-07.2, F2-07.4). Sin historial, el selector funciona igual (F2-07.6).
- [ ] Buscador en los selectores de Wants y Avoids (F2-08.1, F2-08.2).
- [ ] Orden del selector: seleccionadas primero, después el historial del par, después la popularidad general y, si empatan, alfabético (F2-08.3 a F2-08.6).
- [ ] Mantener las pistas de relación inversa (F2-08.7) y validar en el teléfono: listas con scroll y botones legibles (F2-08.8).
- [ ] Al cerrar: los selectores buscan y ordenan por historial cuando existe (criterio de cierre de la Fase 2).

## Sprint 9 - Historial de partidos

Objetivo: guardar los partidos que se jugaron.

- [ ] Confirmar el contrato de la pestaña `MatchHistory` (F2-11.1), separado de `RelationshipHistory` (F2-11.5).
- [ ] Acción del Apps Script para guardar un partido (F2-11.3): fecha e id, seleccionadas, Team 1, Team 2, score, etapa y social satisfaction (F2-11.2).
- [ ] Guardar desde el resultado. Ver «Cosas por cerrar» (F2-11.4).
- [ ] Guardar también el resultado de cada partido (quién ganó y por cuánto), para ajustar los pesos del score y probar la propuesta de rating y atributos (Sprint 2).

## Sprint 10 - Bonus por mismo equipo

Objetivo: que las que juegan juntas en un equipo real tiendan a caer juntas, sin romper reglas. Empieza cuando `teams` esté cargado y probado con datos reales (F2-10.0).

- [ ] Sumar +1 al score por cada pareja del mismo equipo dentro del mismo team (F2-10.1), sin romper avoids ni reglas fuertes (F2-10.2).
- [ ] Mostrar el bonus en el análisis (F2-10.3).
- [ ] Test que muestre que mejora el score sin forzar un reparto imposible (F2-10.4).
- [ ] Revisar si +1 alcanza después de probar con datos reales (F2-10.5).
- [ ] Al cerrar: el bonus aparece en el análisis y no rompe reglas fuertes (criterio de cierre de la Fase 2).

## Cosas por cerrar

- [x] **Prioridad del fallback del generador.** Queda como está: avoids > wants > owner bias > spread ATT/DEF > límites GK/DEF (19/11). Cuando los wants de un solo lado pasen a preferencia, en el segundo lugar quedan solo los mutuos.
- [ ] **Rating y atributos.** **Propuesta:** no tocarlos por ahora. El rating y los atributos miden casi lo mismo, así que el nivel cuenta dos veces. Con resultados de partidos (Sprint 9), probar que los atributos midan solo el estilo (que la velocidad o la defensa no queden todas del mismo lado) y no el nivel. El Power del owner bias no cambia. Decide: Ángela. Default: no tocarlos hasta tener resultados.
- [x] **Formación ideal.** No se agrega: con los roles de hoy no sería un buen criterio (19/11). Se puede repensar con los varios roles del Sprint 6.
- [ ] **Cuánto cuesta romper un want de un solo lado.** Hoy, 15 puntos de score, lo mismo que 1,5 puntos de diferencia de rating (`ONE_WAY_WANT_PENALTY`). Más alto respeta más wants y empareja un poco menos; más bajo, al revés. Decide: Ángela. Default: 15.
- [ ] **Varios roles: qué cuentan las reglas.** Con varios roles por jugadora, el máximo de GK y de DEF y los repartos de DEF y de ATT tienen que contar el rol principal o el puesto que le toca en el equipo. Decide: Ángela, antes del Sprint 6. Default: el rol principal.
- [x] **Qué es «sort selected».** «Sort: selected» en Match y en Players: deja arriba a las elegidas (19/11).
- [ ] **«Fable 2.5».** Se entendió Claude Fable 5.2, el modelo del rediseño de VolkosFood. Decide: Ángela. Default: Fable 5.2.
- [ ] **Default de arquera (`gkWillingness`).** El modal crea jugadoras con `low`, pero una fila de la planilla sin el dato se lee como `no` (RV-14). Decide: Ángela. Default: `no` en los dos, para que lo desconocido no cuente como arquera de emergencia.
- [ ] **Qué oculta privacy mode** (RV-12). Hoy oculta los ratings individuales, pero el análisis sigue mostrando el total de rating por equipo. Decide: Ángela. Default: ocultar también esos totales.
- [ ] **Guardar partidos: automático o con botón** (F2-11.4). Decide: Ángela. Default: botón explícito, con «prueba» o «partido real».
- [ ] **Alcance** (F2-12.6): uso personal o abrir a más grupos. Cambia cuánto pesan la clave, los roles y el multi-grupo. Decide: Ángela. Default: uso personal.
- [ ] **Requisitos dudosos de la v1:** «sugerencia #1 no entendida» (F2-12.7) y «pregunta #10 no entendida» (F2-12.8). Decide: Ángela. Default: se descartan si nadie los recuerda.

## Backlog · Nice to have

- [ ] Suplentes: 10 titulares y 1 o 2 suplentes en gris, con una copia clara (F2-12.1).
- [ ] Partidos de otro tamaño sin romper el balanceador (F2-12.2), y equipos de F6, F7, etc. (F2-12.3).
- [ ] Roles para editar (F2-12.4), si el alcance pasa a más grupos. Para el uso personal alcanza la clave del Sprint 4.
- [ ] Multi-grupo o multi-liga (F2-12.5).
- [ ] Variedad en el generador: «otro reparto» entre los casi iguales, o no repetir los equipos de la última fecha (con el historial del Sprint 9).
- [ ] Fotos más livianas: las fotos guardadas en la planilla son casi todo lo que baja al abrir la app (medido el 19/11). Achicarlas al guardarlas, o traerlas aparte de la lectura inicial. Se complementa con abrir con la última lectura guardada (Sprint 4). **Propuesta.**
- [ ] Navegación en la URL: el botón atrás cierra el modal y vuelve de pantalla, como en VolkosFood. Puede entrar en el rediseño. **Propuesta.**
- [ ] Pedir confirmación al cerrar el modal con cambios sin guardar. **Propuesta.**
- [ ] Que «Copy Teams» no se confunda con apodos de más de una palabra. **Propuesta.**
- [ ] Mostrar los escudos (`crest`) de los equipos. **Propuesta.**
- [ ] Accesibilidad de diálogos y menús: el foco queda dentro del diálogo y los menús usan los roles correctos. **Propuesta.**
