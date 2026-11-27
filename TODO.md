# TODO - armaduki

Tablero vivo de la app (v2): qué se hizo, qué sigue y en qué orden. La v1 (Fase 2, febrero a noviembre de 2026) está archivada en `docs/TODO - v1.md`, con sus decisiones y esquemas.

## Cómo usar este TODO

- [x] Se lee y se ejecuta de arriba hacia abajo, de a un ítem por vez. Un ítem no toca otros módulos salvo lo que necesita.
- [x] Los sprints son por objetivo, no por fecha. Al cerrar cada uno, Ángela lo revisa antes de seguir.
- [x] Cuando Ángela dice «hacé el Sprint N», Claude lo implementa, lo verifica (lint, tests, build y una prueba en navegador contra una API local), hace commit y push a `main`, que publica en Vercel, y le pasa dónde y cómo probarlo. El sprint se cierra cuando ella lo prueba. El rediseño (Sprint 5) fue la excepción: se hizo en la rama `sprint-5` y pasó a `main` cuando Ángela lo aprobó (25/11).
- [x] Primero la base (Sprints 1 a 5), después las funciones nuevas (Sprints 6 a 11).
- [x] En cada sprint va solo lo que se puede hacer ya. Lo que espera una decisión va en «Cosas por cerrar», con quién decide y un default para seguir.
- [x] Un ítem nuevo se conversa antes de construirlo. Lo que sugiere Claude está marcado como **Propuesta**: Ángela lo acepta o lo descarta.
- [x] Lo que Ángela anota en Notion (Personal / Projects / armaduki) se pasa acá antes de hacerlo.
- [x] Los ítems que vienen de la v1 conservan su código entre paréntesis (`F2-…`, `RV-…`).
- [x] Cada ítem se prueba en local al cerrarlo. Cada sprint cierra con lint, tests, build, commit y pasos cortos de prueba manual.
- [x] Mobile-first: cada cambio de UI se diseña y se prueba primero en el teléfono.
- [x] La UI de la app está en inglés por defecto; el Sprint 5 le suma un switch a castellano rioplatense (24/11). Este TODO y las conversaciones, en castellano.
- [x] El generador no cambia sin tests: `npm test`, lint y build antes y después. Cómo funciona: `docs/GENERADOR.md`.
- [x] Si un ítem toca la planilla o el Apps Script, primero se actualiza el contrato de datos y se confirma que lo anterior sigue andando. La planilla solo suma columnas, así la versión anterior del backend siempre sirve para volver atrás.
- [x] El backend se publica con `npm run backend:release` (detalle en `apps-script/README.md`): tests, versión nueva, prueba en una implementación temporal y recién ahí producción, que vuelve sola a la versión anterior si algo falla.

## Decisiones cerradas

- [x] Backend: Google Sheets + Apps Script, publicado con `clasp` (`npm run backend:release`). Producción usa la versión 24 (26/11/2026); la 23 queda para volver atrás.
- [x] El ID de la planilla vive en las propiedades del script, no en el código; el Script ID, en `apps-script/.clasp.json`, que git ignora.
- [x] Una sola implementación del backend en producción, más `@HEAD`; las viejas se borraron (18/11). Las versiones quedan en el historial del script.
- [x] `main` publica en Vercel. El repo es público: ningún ID, clave ni dato de la planilla entra al repo.
- [x] Nada de Claude web: ni artifacts, ni Claude Docs, ni conectores de claude.ai. Notion entra como servidor local.
- [x] Reglas del generador de la v1 (F2-01.2, F2-01.3, F2-01.5, F2-01.7): wants mutuos estrictos (desde el Sprint 2, los de un solo lado son preferencia); si un equipo no tiene GK, necesita 2 arquerxs de emergencia (`good` o `low`); 3 GK no se bloquea; ATT con diferencia máxima de 1 entre equipos; owner bias por Power.
- [x] Owner bias: sigue como regla fuerte y con Power (19/11).
- [x] Los equipos se cargan a mano en la pestaña `Teams`; el modal solo los elige (F2-05.2.0).
- [x] Orden de los sprints: la base, el generador y el rediseño van antes de las funciones nuevas (18/11).
- [x] Fecha de nacimiento: opcional; se guarda la fecha y se muestra la edad (18/11).
- [x] Clave (20/11): vive en la propiedad `ACCESS_KEY` del script; nunca en el código, en `.env`, en Vercel ni en el repo, que es público. Con la clave cargada no se lee ni se guarda sin ella. Cada dispositivo la escribe una vez, en el penal de entrada.
- [x] Players y Match son una sola pantalla (19/11): tocar la tarjeta la elige; editar y borrar siguen en la tarjeta, para borrar rápido (con confirmación); el resultado aparece debajo de la lista.
- [x] Rediseño (24/11): un cambio moderado, no radical. La misma pantalla, con cada cosa en su lugar, más moderna, prolija y animada, y que no parezca hecha por IA. Sigue la identidad de armaduki: oscuro, rojo y la pelota. Las ideas de un rediseño grande quedan en «Para otra versión».
- [x] Idioma (24/11): la UI sigue en inglés por defecto, con un switch a castellano rioplatense que cada dispositivo recuerda. En castellano, la app y los docs nombran a las personas con x (jugadorxs, elegidxs, arquerxs), porque en los grupos juegan personas de distintas identidades (25/11).
- [x] Lxs seleccionadxs (24/11): no hace falta verlxs aparte en el header; con lx décimx, lxs elegidxs suben solxs al principio de la lista. Cierra el pedido de Notion «que en el navbar aparezcan los seleccionados».
- [x] El rediseño se hace con Claude Fable 5.2, el modelo del rediseño de VolkosFood (24/11).

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
- [x] De los criterios de cierre de la Fase 2 ya se cumplían lint, build, el scroll al resultado (F2-09), el footer abajo (F2-00.7) y Escape en los modales (F2-00.8). Los demás son objetivo de los Sprints 6, 8 y 11.

## Sprint 1 - Lo que anotaste en Notion (hecho)

Objetivo: los pedidos chicos que anotaste en Notion. Solo frontend. El tercero, «Terminar Fase 2», quedó repartido en los Sprints 6 a 11.

- [x] **Ángela:** probarlo con los pasos de abajo.
- [x] «sort selected»: orden «Sort: selected» en Match y en Players, que deja arriba a lxs elegidxs y mantiene el orden de siempre dentro de cada grupo (19/11).
- [x] «que en el navbar aparezcan los seleccionados»: la primera versión (lxs elegidxs como chips en una segunda fila del header de Match) no gustó y se sacó (19/11). Pasa al rediseño (Sprint 5).
- [x] Verificado en Edge, en teléfono y en escritorio, contra una API local: ningún error de consola.

Prueba (en https://armaduki.vercel.app, mejor desde el teléfono):

1. En Match, tocá algunxs jugadorxs y elegí «Sort: selected» en el orden: lxs elegidxs quedan primero. Con ese orden, una tarjeta que tocás salta arriba.
2. En Players, elegí «Sort: selected»: las tarjetas que dicen «selected» quedan primero.
3. El header volvió a ser como antes, sin la fila de elegidxs.

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

1. En Players, editá a unx jugadorx (A) y marcá que quiere jugar con otrx (B), sin que B lx marque a ellx. Después armá un par mutuo: C quiere jugar con D y D con C.
2. En Match, elegí 10 que incluyan a A, B, C y D y generá los equipos.
3. C y D quedan siempre juntxs. A y B quedan juntxs salvo que separarlxs empareje bastante los equipos. En el análisis, en «Social», aparece cuántos wants de un solo lado se respetaron («One-way wants … kept») o cuáles se rompieron.
4. Para ver uno roto seguro: hacé que unx GK quiera jugar con otrx GK, de un solo lado. Elegí a lxs dos entre lxs 10, sin lx tercerx GK (con 3 GK siempre hay fallback). Como no pueden ir dos GK en el mismo equipo, antes esto mandaba al fallback. Ahora sale un resultado normal y el análisis muestra «Broken one-way wants» y `wantsPref(-15)` en la fórmula.
5. Al terminar, sacá esos wants editando a A, C, D y lx GK. «Clear Wants» también sirve, pero borra los wants de todxs.

## Sprint 3 - Base técnica (hecho)

Objetivo: dejar el código y las herramientas listos para crecer.

- [x] **Ángela:** probarlo con los pasos de abajo.
- [x] **Ángela:** aprobó publicar el backend nuevo (19/11). Claude lo publicó con `npm run backend:release -- "readAll"`: producción pasó de la versión 19 a la 20, con pruebas en la implementación temporal y en producción, y la temporal se borró.
- [x] Búsqueda, filtros y orden de Players y Match en un solo lugar (F2-06.6, RV-15): la lógica en `src/utils/playerListing.ts`, con tests; el estado en `src/hooks/usePlayerListing.ts`, uno por página; los controles y sus estilos en `src/components/PlayerListControls`. Un recorrido grabado por las dos páginas, en teléfono y en escritorio, da el mismo resultado antes y después.
- [x] Los tests de la revisión están en `npm test`: `Code.gs` en Node contra una planilla en memoria y el store de punta a punta contra `Code.gs`. Ninguno puede llegar a la planilla real.
- [x] `npm run backend:release`: tests de `Code.gs`, versión nueva, implementación temporal con pruebas, pase a producción, pruebas otra vez y limpieza. Si una prueba falla antes del pase, producción no cambia; si falla después, vuelve a la versión anterior. No imprime IDs. `npm run backend:release -- --check` solo muestra la versión de producción. Probado con un clasp simulado y usado de verdad para publicar la versión 20 (19/11).
- [x] Una sola lectura al abrir: la acción `readAll` trae jugadorxs y equipos en un pedido. Si la pestaña `Teams` falla, lxs jugadorxs cargan igual. Con un backend sin `readAll` (la versión 19 o anteriores, por ejemplo al volver atrás), la app usa las dos lecturas de antes, después de un pedido de más. En producción, el pedido único tarda un poco menos que las dos lecturas en paralelo.
- [x] `npm audit fix` (RV-16): react-router 7.18.6, vite 7.3.8 y typescript-eslint 8.73; `npm audit` sin vulnerabilidades.
- [x] Borrados `src/assets/react.svg` y `public/vite.svg`, que no se usaban.
- [x] Verificado: lint, tipos, 67 tests, build y pruebas en Edge contra una API local: un pedido al abrir con el backend nuevo, las dos lecturas de antes con la versión 19 y jugadorxs cargadxs con la pestaña `Teams` rota.

Prueba (en https://armaduki.vercel.app, mejor desde el teléfono):

1. Probá la búsqueda, el filtro de rol y los órdenes: todo anda igual que antes. Con privacy mode apagado, probá también el filtro y el orden por score, con la flecha.
2. «Clear» → «Clear Filters» deja todo como al principio.
3. «+ Add Player» → «Extra info»: la lista de equipos carga.
4. La app abre con un solo pedido. En la computadora se ve con F12 → Network, filtrando por `exec`: aparece `readAll` y ya no `read` ni `readTeams`.

## Sprint 3b - Players y Match en una sola pantalla (hecho)

Objetivo: elegir, editar y armar el partido en el mismo lugar, sin acordarse en qué pantalla se está (pedido de Ángela, 19/11).

- [x] **Ángela:** probarlo con los pasos de abajo.
- [x] Una sola pantalla, «Players», en `src/pages/PlayersPage.tsx`: tocar una tarjeta la elige; el lápiz y el tacho de la tarjeta editan y borran (en la computadora aparecen al pasar el mouse; en el teléfono están siempre); el resultado aparece debajo de la lista. Arriba: «+ Add Player», el contador, «Clear» (selección, filtros, wants, avoids y links) y «Generate Teams».
- [x] Con 10 elegidxs, las demás tarjetas no se pueden elegir, pero se pueden editar y borrar.
- [x] Se fueron las pestañas del header; `/match` y cualquier dirección vieja llevan a la pantalla única.
- [x] Donde las dos pantallas eran distintas: grilla de Match, aviso de error de carga arriba de la lista (con «×»), texto de lista vacía de Players y botones con el estilo de siempre.
- [x] Verificado en Edge contra una API local, con clics de mouse en tamaño computadora y toques simulados en tamaño teléfono (no en un teléfono real): elegir, editar y borrar sin elegir, los menús y el pie tapan a las tarjetas, el tope de 10, borrar con 10 elegidxs, generar y ver el resultado debajo, editar unx elegidx borra el resultado viejo, «Clear Selection», `/match` y un solo pedido al abrir.

Prueba (en https://armaduki.vercel.app, mejor desde el teléfono):

1. Tocá algunas tarjetas: se eligen y el contador sube. Tocá el lápiz de otra: se abre la edición sin elegirla. El tacho pide confirmación, como siempre.
2. Elegí 10: las demás tarjetas quedan apagadas, pero su lápiz y su tacho siguen andando.
3. «Generate Teams»: el resultado aparece debajo de la lista.
4. En la computadora, el lápiz y el tacho aparecen al pasar el mouse por la tarjeta.

## Sprint 4 - Clave y privacidad (hecho)

Objetivo: proteger los datos con una clave, con el mismo esquema que VolkosFood.

- [x] **Ángela:** aprobó publicar el backend con la clave (20/11). Claude lo publicó con `npm run backend:release`: producción pasó de la versión 20 a la 21.
- [x] **Ángela:** prendió la clave (20/11): `npm run backend:release -- --check` confirma que producción la pide y que la de `.env.release` es aceptada. Cómo se hace: En el editor de Apps Script del proyecto: Configuración del proyecto (el engranaje) → Propiedades del script → Agregar propiedad de script → nombre `ACCESS_KEY`, valor: la clave → Guardar. Funciona al instante. Para apagarla, borrar la propiedad.
- [x] **Ángela:** probarlo con los pasos de abajo.
- [x] La clave se pide para leer y para guardar (RV-13, F2-12.4): sin ella el backend responde «unauthorized» antes de abrir la planilla. Backend versión 21. Sin la propiedad, todo queda abierto.
- [x] El penal de entrada: un dispositivo sin la clave ve un arco, la pelota y lx arquerx en lugar de la app. Escribir la clave es patear: si está bien, gol y entra; si está mal, lx arquerx ataja; si no hay respuesta, palo. Mientras el backend contesta, la pelota se carga y lx arquerx se mueve en la línea. Rediseñado el 20/11 a pedido de Ángela: más chico y minimalista, sin carteles ni papelitos, con lx arquerx flaquitx y chiquitx del equipo (camiseta roja, mangas y pantalón negros, guantes naranjas). Después de atajar se levanta y la pelota vuelve al punto. Con codos, rodillas y manos con forma de guante; la postura previa al penal (pies bien separados, rodillas apenas flexionadas, brazos abiertos) y la pelota del logo, roja y negra.
- [x] El dispositivo guarda la clave recién cuando el backend la aceptó. Si el backend la rechaza más adelante (por ejemplo, porque cambió), el dispositivo la olvida, borra su copia y vuelve al penal.
- [x] Abre al instante con la última lectura guardada en el dispositivo y actualiza detrás. Con la copia en pantalla se puede elegir enseguida; agregar, editar, borrar y limpiar links esperan a la lectura nueva (dice «Updating from Google Sheets...»). Si la actualización falla, por ejemplo sin señal en la cancha, queda un botón «Saved copy · Refresh» para reintentar. Al llegar la lectura nueva, lo elegido que ya no existe sale de la selección.
- [x] Privacy mode (RV-12): ahora también oculta el total de rating de cada equipo en el análisis.
- [x] `npm run backend:release` manda la clave en sus pruebas (la toma de `.env.release`, que git ignora) y `-- --check` dice si producción pide clave y si la del archivo es aceptada.
- [x] Verificado: lint, tipos, 84 tests, build y pruebas en Edge contra una API local, en tamaño teléfono y computadora (no en un teléfono real): sin clave, clave equivocada, sin respuesta, clave correcta, volver a entrar con la copia guardada y un solo pedido, sin señal sobre la copia guardada, clave cambiada en el backend y backend sin clave.

Prueba (después de prender la clave; en https://armaduki.vercel.app, mejor desde el teléfono):

1. Abrí la app: aparece el penal. Escribí cualquier cosa y tocá «Shoot»: lx arquerx ataja.
2. Escribí la clave: gol, y entra a la app.
3. Cerrá y volvé a abrir: entra directo, con la lista al instante, y a los segundos se actualiza.
4. Para volver a ver el penal: una ventana privada, o borrar los datos del sitio en el navegador.
5. Con privacy mode prendido, generá equipos: en el análisis, la línea «Rating» muestra la diferencia pero no el total de cada equipo.

## Sprint 5 - Rediseño con Fable (hecho)

Objetivo: que la app se vea más moderna, prolija y animada sin cambiar cómo se usa (24/11). Hecho con Claude Fable 5.2 y ajustado con Claude Opus en la rama `sprint-5`; Ángela lo aprobó y pasó a `main`, y de ahí a Vercel, el 25/11. La dirección está en `docs/DESIGN_DIRECTION.md`; lo que cambió y cómo se verificó, en `docs/REDESIGN_REVIEW.md`.

- [x] Dirección de diseño en `docs/DESIGN_DIRECTION.md` (24/11): idea, decisiones, lenguaje visual, la pantalla, el resultado, el modal, el idioma y lo que no cambia.
- [x] **Ángela:** aprobó la dirección (24/11).
- [x] **Ángela:** primera prueba (25/11). Le gustaron el switch y las rayitas de los atributos; pidió cinco cambios, hechos ese día (abajo).
- [x] **Ángela:** probó los cambios y aprobó el sprint (25/11): «terminó el S5».
- [x] **Ángela:** confirmó que el modal nuevo entra bien en su pantalla (25/11).
- [x] Lenguaje visual nuevo en toda la app: colores propios como variables, Barlow y Barlow Condensed servidas desde la app, una sola familia de íconos y estados claros. Se fueron los emojis de los atributos y las etiquetas «Filter: …» y «Sort: …».
- [x] Tarjetas con la foto un poco más grande: 48 px en la computadora y 40 en el teléfono.
- [x] Con lx décimx elegidx, el orden pasa solo a «Sort: Selected» y las tarjetas viajan arriba; al vaciar la selección vuelve el orden que había. Con tests en `playerListing`.
- [x] Switch de idioma: inglés por defecto y castellano rioplatense, con la pelota del logo como perilla, en el header y en el penal. El dispositivo lo recuerda, también si pierde la clave.
- [x] El resultado, debajo de la lista como siempre, rediseñado: los equipos, un resumen de tres datos y el análisis completo plegado.
- [x] Fallback legible: arriba, por qué no se pudo cumplir todo; después, qué regla se rompió y con quién, y qué reglas se mantuvieron. Rojo solo en lo roto. El generador elige igual (2000 selecciones al azar dan lo mismo que en `main`) y además devuelve esos datos, para que la app los muestre y los traduzca.
- [x] Modal de jugadorx: en la computadora, tan alto como su contenido (arriba quién es; abajo cómo juega y, al lado, con quién); en el teléfono, una hoja de pantalla completa. Rehecho el 25/11 (ver abajo).
- [x] Movimiento al nivel del penal: elegir, reordenar, repartir los equipos, abrir el modal y el switch. Todo se apaga con «reducir movimiento».
- [x] El penal ya no se saltea el gol cuando el backend contesta en menos de 0,8 s (apareció al probar; con Apps Script no pasaba).
- [x] Cambios del 25/11, después de la prueba de Ángela:
  - Las pills de rol vuelven a los colores de siempre (gris, verde, ámbar, rojo, violeta), sólidas y con la forma nueva. El puesto elegido en el modal se ve igual.
  - El lápiz y el tacho de la tarjeta, uno sobre el otro, arriba a la derecha: el lápiz arriba y el tacho abajo (en la computadora y en el teléfono).
  - Modal rehecho: el primero se estiraba hasta el alto de la ventana y dejaba mucho espacio vacío, con los campos desparejos. Ahora mide 960 de ancho y entre 550 y 630 de alto, con apodo, nombre y camiseta en una fila, y las listas de wants y avoids del mismo alto que la columna de juego, con dos nombres por fila y scroll por dentro. Sin lugares vacíos para el Sprint 6: sus campos entran cuando lleguen (dónde va cada uno, en la dirección).
  - El análisis completo arranca «En palabras», con una frase por tema (si un equipo no tiene GK, dice quién ataja bien y cuántxs más pueden); las barras van sin números y el score se explica línea por línea, solo con lo que lo movió.
  - La pelota del switch: en inglés, el logo tal cual; en castellano, sus colores se intercambian con un fundido.
- [x] Rojo y Negro en vez de Team 1 y Team 2 (pedido de Ángela, 25/11): ROJO en rojo y NEGRO en negro, sobre una etiqueta gris clara; el Rojo con línea roja y fondo apenas rojo, el Negro con fondo negro; en el análisis, barras rojas hacia el Rojo y negras hacia el Negro. En las frases, ROJO y NEGRO en mayúscula, en su color y sin artículo, sin pill; NEGRO en negro puro, sobre una tarjeta de resultado un toque más clara. Las barras de la comparación, sobre fondo blanco, con ROJO y NEGRO arriba sin pill. El Negro lleva una línea gris arriba, como la roja del Rojo (RED y BLACK en inglés). «Copiar equipos» queda como estaba.
- [x] Verificado: lint, tipos, 104 tests, build y pruebas en Edge contra una API local, en tamaño computadora y teléfono (no en un teléfono real), en los dos idiomas y con privacy mode prendido y apagado: 57 chequeos del rediseño en cada tamaño, más las suites de la pantalla única (Sprint 3b) y del penal (Sprint 4), que siguen pasando, y una corrida a escala real con 61 jugadorxs inventadxs.

Prueba (desde el 25/11, en https://armaduki.vercel.app; antes, en local con la rama `sprint-5`):

1. Abrí https://armaduki.vercel.app. Si entra directo, sin el penal, es porque ese navegador ya tiene la clave guardada: para ver el penal, abrilo en una ventana privada.
2. En el penal, tocá el switch de la esquina: los textos pasan a castellano. Entrá con la clave.
3. Mirá la pantalla: las pills de rol con sus colores de siempre y, al pasar el mouse por una tarjeta, el lápiz arriba y el tacho abajo. Tocá el switch EN / ES del header: la pelota rueda y, en castellano, sus colores se invierten con un fundido. Recargá: sigue en el idioma que elegiste.
4. Elegí 10: con lx décimx suben arriba y el menú de orden dice «Selected». Sacá unx y elegí otrx. «Clear» → «Clear Selection» devuelve el orden que tenías.
5. «Generate Teams»: el Rojo y el Negro se reparten debajo de la lista, cada uno con su color, con el resumen. Abrí «Full Analysis»: arranca «En palabras», las barras no tienen números y el score se explica línea por línea. Probá también «Show Second Option» y «Copy Teams».
6. Para ver el fallback: elegí 10 con 3 GK. Arriba del resultado aparece por qué, qué se rompió y qué se mantuvo, y lo único rojo es lo roto.
7. Tocá «+ Add Player» y después el lápiz de unx jugadorx: el modal nuevo, compacto, con apodo, nombre y camiseta en una fila y las listas de wants y avoids al lado del juego. Guardar escribe en la planilla, como siempre.
8. Privacy mode (tres toques en el ojo del pie): prendido, no se ven ratings, Power ni la diferencia de rating del resumen.
9. Si algo no te cierra, decime qué.

## Sprint 6 - Campos de jugadorx (hecho)

Objetivo: cargar desde el modal los datos que la planilla ya tiene lugar para guardar (resto de la Fase 2) y crear equipos y grupos sin ir a la planilla. Decidido con Ángela el 25/11. Los esquemas están en `apps-script/README.md`; el modal, en `docs/DESIGN_DIRECTION.md`; la cobertura, en `docs/GENERADOR.md`.

- [x] **Segundo puesto** (F2-05.9), opcional: DEF, MID, ATT o GK, distinto del principal, en la columna `secondaryRole`. Se ve en el modal, en las tarjetas y en los equipos armados, al lado del principal, más chico y del mismo color, más suave. Las reglas siguen mirando solo el puesto principal (ver «Cosas por cerrar»).
- [x] Con GK de segundo puesto, «¿Ataja?» no se muestra y se guarda `good`, como con un GK principal. Si se saca GK, vuelve la respuesta que tenía.
- [x] **Cobertura de DEF y ATT**, el híbrido de Ángela: si un equipo se queda sin DEF principal, el score prefiere que tenga a alguien con DEF de segundo puesto, y lo mismo con ATT. Es una preferencia, no una regla, y pesa lo mismo que un want de un solo lado. El análisis lo cuenta en «Puestos»: «NEGRO no tiene DEF: defiende Caro, que también juega de DEF». Unx GK no cubre (está en el arco). Sin segundos puestos, los equipos salen idénticos a los de antes, también con fallback (2000 grupos al azar).
- [x] «¿Ataja?» arranca en `no` al sumar a alguien (ver «Cosas por cerrar»).
- [x] **Activx** (F2-05.10): un switch al lado de la × del modal, solo al editar. Apagado, esa persona no aparece en la lista, sale de lxs elegidxs y no se puede elegir; no se borra nada. El total cuenta solo a lxs activxs. La última opción del filtro de rol, «Inactive» («Inactivxs»), lxs muestra apagadxs, para volver a prenderlxs. Las listas de wants y avoids lxs dejan afuera, salvo que ya estén marcadxs.
- [x] **Notas** internas y opcionales (F2-05.11): texto libre en el modal, al lado de los grupos. En la computadora aparecen al dejar el mouse sobre la tarjeta o sobre lx jugadorx en los equipos armados; en el teléfono, solo en el modal. Privacy mode las oculta, también en el modal, y guardar con privacy mode las deja como estaban.
- [x] **Fecha de nacimiento** (F2-05.8), opcional: día, mes y año; con el año alcanza, y un día sin mes no se puede guardar. Va en la columna nueva `birthDate` (AAAA, AAAA-MM o AAAA-MM-DD), como texto; `birthYear` queda sin uso (se lee solo si `birthDate` está vacía). La edad se ve en el modal y en la tarjeta, debajo del número de camiseta; si falta el día, con «~». Privacy mode la oculta.
- [x] **Grupos** (F2-05.3): fichas en el modal, como los equipos, sin uno principal. Se leen de la pestaña `Groups`, en la misma lectura de siempre. Los días que puede cada unx quedan para más adelante (backlog).
- [x] **Crear equipos y grupos desde el modal:** una ficha punteada «+ New» («+ Nuevo») al final de cada fila. Se escribe el nombre (y, si es un equipo, se eligen sus dos colores: arrancan en el rojo y negro de la pelota); Enter crea y Escape cierra solo la ficha. Se guarda en la planilla y queda marcado. Un nombre que ya existe marca ese mismo. Cambiar nombres o colores y borrar sigue en la planilla; un modal propio queda en el backlog.
- [x] Mostrar el equipo en la tarjeta (F2-05.6): alcanza con los dos colores del equipo principal, en la esquina (25/11).
- [x] Al cerrar: los campos nuevos leen y escriben sin romper a lxs jugadorxs existentes (criterio de cierre de la Fase 2). Una fila sin las columnas nuevas, o editada a mano (un segundo puesto igual al principal, FLEX como segundo puesto, una fecha escrita como fecha), se lee sin problemas.
- [x] Arreglo que apareció al probar: al guardar un cambio, el backend volvía a escribir la fila entera, y la planilla volvía a leer su texto: «1994-03» pasaba a ser el 1/3/1994 y una camiseta «007», un 7. Ahora escribe solo las celdas que cambian, y la fecha, las notas y la camiseta se guardan como texto.
- [x] Backend publicado con `npm run backend:release` (25/11): producción pasó de la versión 21 a la 22, y las pruebas del pase dieron bien antes y después. Su primera lectura sumó la columna `birthDate` al final de la pestaña Players. Con un backend anterior, la app no ofrece fecha, grupos ni «+ New» (los perdería). El publicador se corre desde PowerShell: desde Bash, clasp lee la unidad `c:` en minúscula y frena con un falso «symlink».
- [x] **Ángela:** probó el sprint y anduvo todo bien (25/11).
- [x] Verificado: lint, tipos, 135 tests, build y pruebas en Edge contra una API local que corre `Code.gs` sobre planillas en memoria que, como Google Sheets, convierten en fecha el texto que parece una fecha. Nada tocó la planilla real. En tamaño computadora y teléfono (no en un teléfono real), en los dos idiomas y con privacy mode prendido y apagado:
  - El Sprint 6: unos 35 chequeos en cada tamaño.
  - La app nueva contra el backend de hoy (versión 21): sin fecha, grupos ni «+ New»; el segundo puesto, activx y las notas se guardan.
  - Escala real, con 61 jugadorxs inventadxs con segundo puesto, notas, fechas, 7 equipos y 5 grupos: a 360 px nada se sale de las tarjetas ni de los equipos. En la ventana de Ángela (unos 1100 × 920), con dos equipos y cinco grupos, el modal mide 960 × 740 y no scrollea; a 1280 × 680 su cuerpo scrollea unos 90 px.
  - Las suites de los sprints 3b, 4 y 5 siguen pasando.

Prueba (en https://armaduki.vercel.app):

1. Apagá privacy mode (tres toques en el ojo del pie): las notas, la fecha y la edad solo se ven así.
2. Tocá el lápiz de alguien. Arriba a la derecha, el switch «Active»; en la primera fila, «Born»; debajo de los equipos, los grupos y, al lado, las notas; al lado del puesto, «Second position».
3. Elegí un segundo puesto y guardá: en la tarjeta aparece al lado del principal, más chico. Si elegís GK, «Goalkeeper?» desaparece.
4. Poné solo el mes y el año (por ejemplo 3 y 1994), guardá y recargá la página: el modal tiene que seguir diciendo 3 y 1994, no 1/3/1994. Cambiá otra cosa de esa persona, guardá y recargá otra vez: tiene que seguir igual. La tarjeta muestra «~32 yrs» debajo del número.
5. Escribí una nota y guardá. Dejá el mouse sobre su tarjeta: la nota aparece abajo después de un momento. Con privacy mode prendido no aparece.
6. En los grupos, tocá «+ New», escribí «Segurola 20hs Jueves» y Enter: queda creado y marcado. Hacé lo mismo con un equipo, eligiendo sus dos colores. Guardá y mirá la planilla: aparecen en las pestañas Groups y Teams, y en la columna `birthDate` de Players, la fecha.
7. Apagá el switch de alguien y guardá: desaparece de la lista y de lxs elegidxs. En el filtro «Role», la última opción, «Inactive», lx muestra; desde ahí lx volvés a prender.
8. Elegí 10 con un solo DEF y alguien con DEF de segundo puesto, y generá: abrí «Full Analysis» y en «Positions» dice quién cubre DEF del lado que no tiene.
9. Tocá «+ Add Player»: «Goalkeeper?» arranca en «No».
10. Pasá a castellano: «Activx», «Segundo puesto», «Nacimiento», «Grupos», «+ Nuevo» e «Inactivxs».
11. Si algo no te cierra, decime qué.

## Sprint 7 - Filtros y orden (hecho)

Objetivo: encontrar rápido a quién elegir. Usa la búsqueda unificada del Sprint 3. Decidido con Ángela el 25/11: los equipos y los grupos se cargan de a unx en el modal, y los filtros no se recuerdan al recargar. Solo frontend: no toca la planilla ni el backend.

- [x] **Filtro por equipo** (F2-06.1, F2-06.3): un menú «Team» («Equipo») con cada equipo por nombre y sus dos colores. Aparece todx quien tenga ese equipo, sea o no su principal. Al final, «No team» («Sin equipo»): quienes no tienen ninguno, para ver a quién falta cargarle (un equipo borrado de la planilla cuenta como ninguno).
- [x] **Filtro por grupo** (F2-06.2): un menú «Group» («Grupo»), igual, con «No group» («Sin grupo») al final. El de día/lugar (F2-06.4) espera a los días (backlog).
- [x] Un equipo y un grupo por vez; se combinan entre sí, con el rol, el score, la búsqueda e «Inactive». Cuentan como filtros para «Clear Filters» y para «Showing X of Y players» («X de Y jugadorxs»). Se ven también con privacy mode. Sin equipos o sin grupos en la planilla, ese menú no aparece.
- [x] **El filtro de rol suma el segundo puesto:** «DEF» muestra primero a lxs DEF y después a quienes tienen DEF de segundo puesto (la pill chiquita dice quién es quién), con cualquier orden; solo «Selected» pone antes a lxs elegidxs. Lo mismo con GK, MID y ATT.
- [x] **Orden por camiseta** (F2-06.5): de menor a mayor; el 7 y el 007 empatan y desempata el apodo; sin número, al final.
- [x] **Orden por equipo** (F2-06.5): por el equipo principal, el de los colores de la esquina, en orden alfabético; sin equipo, al final; dentro de cada equipo, por apodo. Si alguien tiene equipos pero ninguno marcado como principal (una fila editada en la planilla), cuenta el primero, como en el modal, y su tarjeta muestra esos colores.
- [x] Sin orden por grupo: quien está en varios grupos no tiene un solo lugar, y el filtro ya lxs junta.
- [x] Dónde van: en el teléfono, rol, score y orden en una fila, y equipo y grupo debajo, a media fila (entra «Segurola 20hs…»); el menú de la derecha abre hacia la izquierda, así un nombre largo no se sale de la pantalla. Desde 960 px de ancho, todo en la fila de la búsqueda. Detalle en `docs/DESIGN_DIRECTION.md`.
- [x] Arreglo que apareció al probar: en un teléfono angosto, con el orden por score, el menú de orden quedaba en «S…» al lado de la flecha de dirección. Pasaba desde antes y no se veía porque con privacy mode no hay orden por score. Ahora dice «Score».
- [x] **Ángela:** probó el sprint y anduvo todo bien (25/11).
- [x] Verificado: lint, tipos, 145 tests, build y pruebas en Edge contra una API local que corre `Code.gs` sobre planillas en memoria (nada tocó la planilla real), en tamaño computadora (también a 1100 y 820 de ancho) y teléfono (también a 360), en los dos idiomas y con privacy mode prendido y apagado:
  - El Sprint 7: 33 chequeos en la compu y 35 en el teléfono, entre ellos que los menús abiertos no se salgan de la pantalla a 360 px y que sin grupos no aparezca su menú.
  - Las suites de los sprints 3b, 4, 5 y 6 siguen pasando, también la de escala real (61 jugadorxs, 7 equipos y 5 grupos).

Prueba (en https://armaduki.vercel.app):

1. Debajo de la búsqueda hay dos menús nuevos, «Team» y «Group» («Equipo» y «Grupo» en castellano). En el teléfono van en una segunda fila; en la compu, en la misma fila que la búsqueda.
2. Abrí «Team»: tus equipos por nombre, cada uno con sus dos colores, y al final «No team». Elegí uno: aparece todx quien lo tiene, sea o no su equipo principal. Debajo de la lista dice cuántxs se ven de cuántxs.
3. Abrí «Group» y elegí un grupo: quedan sus jugadorxs. Combinalo con un equipo o con un rol.
4. Elegí «No group»: son quienes no tienen grupo todavía. Abrí a unx con el lápiz, marcale un grupo y guardá: sale de esa lista. Lo mismo con «No team».
5. En «Role», elegí DEF: primero lxs DEF y después quienes tienen DEF de segundo puesto, con la pill chiquita.
6. En «Sort», probá «Shirt» (por número de camiseta, sin número al final) y «Team» (agrupadxs por equipo principal, con los colores de la esquina juntos).
7. «Clear» → «Clear Filters» deja todo como al principio. Recargá la página: los filtros vuelven a «All».
8. Con privacy mode prendido, «Team» y «Group» siguen; «Score» no.
9. Si algo no te cierra, decime qué.

## Sprint 8 - Wants y avoids con historial (hecho)

Objetivo: elegir relaciones más rápido, empezando por las de siempre. Decidido con Ángela el 25/11, cuando también sumó ocultar los avoids con privacy mode y que cada dispositivo recuerde privacy mode.

- [x] **Historial** (F2-07.1, F2-07.3, F2-07.5): la pestaña `RelationshipHistory`, con el contrato de la v1 (`sourceId`, `targetId`, `wantsCount`, `avoidsCount`, `updatedAt`). El backend suma 1 cada vez que un guardado trae un want o un avoid que esa persona no tenía, también al volver a marcarlo después de limpiarlo. Guarda quién marcó a quién, nunca resta y arranca vacío. «Clear Wants», «Clear Avoids» y «Clear Links» no lo borran: para empezar de cero se borran filas a mano en la pestaña. Un «no quiero» es un avoid. Los ids y la hora se guardan como texto, y si la pestaña fallara, el guardado de lx jugadorx igual queda.
- [x] Backend publicado con `npm run backend:release` (26/11): producción pasó de la versión 22 a la 23, y las pruebas del pase dieron bien antes y después. Desde ahí, cada guardado con un want o un avoid nuevo suma en la pestaña `RelationshipHistory`. Con la versión 22 la app anda igual, sin el historial en el orden.
- [x] **Lectura** (F2-07.2, F2-07.4, F2-07.6): el historial llega en `readAll`, con su propia clave. Vacío, o con un backend anterior, las listas andan igual. La app suma en su copia lo que guarda, así el orden ya lo tiene en cuenta sin recargar.
- [x] **Buscador** (F2-08.1, F2-08.2): uno solo, arriba de las dos listas. Filtra Wants y Avoids a la vez, por apodo o nombre y sin acentos, como el de la lista principal. Si no queda nadie, cada lista dice «Nadie con ese nombre». Escape limpia la búsqueda sin cerrar el modal, y Enter no guarda.
- [x] **Orden de cada lista** (F2-08.3 a F2-08.6), fijo al abrir el modal (buscar o tocar un botón no mueve a los demás):
  1. Lxs que esa persona ya tiene marcadxs, como hoy.
  2. Lxs que hoy la marcan a ella: al abrir a B, si A quiere a B, A aparece arriba en los Wants de B; lo mismo con los avoids. Pedido de Ángela: a veces el want se carga del lado que es más rápido, y en realidad era al revés.
  3. Los de siempre, contando las dos direcciones: que A haya querido a B suma en la lista de A y en la de B. Más veces, más arriba.
  4. La popularidad general: en Wants, lxs que más veces estuvieron en un want, de cualquier lado; en Avoids, lo mismo con los avoids.
  5. El resto, por apodo (antes iban en el orden de la planilla).
- [x] Se nota solo en el orden, sin números ni marcas. Siguen las pistas de quién lx quiere o lx evita (F2-08.7), y lxs inactivxs afuera salvo que ya estén marcadxs.
- [x] **Privacy mode oculta los avoids** (pedido de Ángela, 25/11): en el modal no aparece la lista de avoids y los wants ocupan todo el ancho; guardar deja los avoids como estaban. En el resultado no hay nombres ni cantidades de avoids: el resumen y el análisis hablan solo de wants, y si el reparto rompió o chocó con un avoid, dice «un avoid no se pudo cumplir» o «un avoid choca con los wants mutuos», sin nombres. Los equipos salen iguales: el generador sigue usando los avoids. El porcentaje social los sigue contando, sin decir quién. Si con privacy mode se marca un want con alguien que esa persona evita, el avoid se borra, como siempre.
- [x] **Privacy mode se recuerda** (pedido de Ángela, 25/11): cada dispositivo guarda si lo dejó prendido o apagado, como el idioma, y lo recupera al volver. Un dispositivo nuevo arranca con privacy mode prendido.
- [x] Validado en el teléfono: el buscador a todo el ancho y a 16 px (el iPhone no hace zoom), las listas con scroll y nada se sale de costado (F2-08.8).
- [x] **Ángela:** probó el sprint (26/11).
- [x] Al cerrar: los selectores buscan y ordenan por historial cuando existe (criterio de cierre de la Fase 2).
- [x] Verificado: lint, tipos, 163 tests, build y pruebas en Edge contra una API local que corre `Code.gs` sobre planillas en memoria, que ahora también convierten en fecha un texto con fecha y hora (nada tocó la planilla real), en tamaño computadora (también a 1100 de ancho) y teléfono, en los dos idiomas y con privacy mode prendido y apagado:
  - El Sprint 8: 28 chequeos en la compu y 27 en el teléfono. Entre ellos, que Enter en el buscador no guarde (y, de control, que en el apodo sí), que el historial siga después de «Clear Wants» y que con un backend anterior las listas anden.
  - Las suites de los sprints 3b a 7 siguen pasando, también la de escala real.

Prueba (en https://armaduki.vercel.app, mejor primero en el teléfono):

1. Apagá privacy mode (tres toques en el ojo del pie) y recargá la página: sigue apagado. Prendelo y recargá: sigue prendido. Dejalo apagado para lo que sigue.
2. Abrí a alguien con el lápiz. Arriba de las listas de wants y avoids hay un buscador: escribí el comienzo de un apodo y las dos listas quedan con esa persona. En la compu, Escape limpia la búsqueda sin cerrar el modal, y Enter no guarda.
3. Mirá el orden: primero lxs que esa persona ya tiene marcadxs, después quienes la marcan a ella (con el puntito verde o rojo), después los de siempre y el resto por apodo. El historial arranca vacío, así que los de siempre aparecen a medida que marcás.
4. En A, marcá a B como want y guardá; mejor un par de los de siempre, porque el conteo queda. En la planilla, la pestaña `RelationshipHistory` tiene una fila con los ids de A y de B (no los apodos), un 1 y la hora; en la barra de fórmulas se ve un apóstrofo antes del id y de la hora, y es lo esperado. Abrí a B: A aparece arriba en sus Wants, porque A lx quiere.
5. Volvé a A, desmarcá a B y guardá. Abrí a B otra vez: A sigue arriba, ahora por el historial. Si el par no era de los de siempre, borrá esa fila en la pestaña.
6. Prendé privacy mode y abrí a alguien: no está la lista de avoids y los wants ocupan todo el ancho. Guardá un cambio: sus avoids quedan como estaban (se ven al apagar privacy mode).
7. Elegí 10 con algún avoid entre ellxs y armá equipos con privacy mode prendido: ni el resumen ni el análisis nombran avoids. Apagalo: aparecen («Avoids 1/1», «Separadxs»).
8. Si algo no te cierra, decime qué.

## Sprint 9 - Partidos: armarlos y anotarlos (hecho y probado, falta mirar un ajuste)

Objetivo: anotar los partidos como se jugaron de verdad, con su resultado, sin importar si los armó la app, Ángela u otra persona. Pedido de Ángela (26/11): muchas veces los equipos no salen de la app, porque los arma otra persona (por ejemplo, por el color de las camisetas) o ella los cambia a mano, y quiere llevar los partidos por grupo, fecha y lugar, ver cuánto mide cada equipo y anotar los goles. Lo charlamos el 26/11: Ángela decidió lo de lxs arquerxs y los contadores, y le dio el «dale» al resto de lo propuesto. Las estadísticas van en el Sprint 10.

- [x] **Contrato de los datos** (F2-11.1, F2-11.2), como se propuso (detalle en `apps-script/README.md`): la planilla solo suma columnas.
  - `MatchHistory`, una fila por partido: siguen las columnas de la v1 y se suman `date`, `groupId`, `place`, `team1Goals`, `team2Goals`, `team1KeeperId`, `team2KeeperId`, `origin` y `updatedAt`. `score`, `stage` y `socialSatisfactionPct` guardan lo que medía el partido al anotarlo (vacíos sin análisis); `stage`, solo si los equipos son los de la app sin cambios. `origin` es `app`, `edited` o `manual`. `isTest` queda en `false`. Un arquerx vacío quiere decir que ese equipo rotó.
  - `MatchPlayers`, pestaña nueva: una fila por jugadorx y partido, con su equipo, goles, `conceded` (los que le hicieron), errores y una foto de ese día (puesto, segundo puesto, rating, atributos, si ataja, y sus wants y avoids con lxs del partido). Con la foto, un partido viejo mide lo mismo aunque cambien los ratings, y alguien borradx sigue apareciendo con su apodo.
  - Las dos van aparte de `RelationshipHistory` (F2-11.5). Las fechas, los ids, la hora y el lugar se guardan como texto: un lugar como `5/11` queda así.
- [x] **Backend** (F2-11.3): `saveMatch` guarda el partido entero (lo crea o lo reemplaza, con sus filas de `MatchPlayers`), así un reintento nunca duplica nada; `deleteMatch` lo borra; `readMatches` los trae. Los partidos se leen al abrir «Partidos» o un partido, nunca al abrir la app, y no quedan guardados en el dispositivo. `readAll` avisa que el backend guarda partidos: con uno anterior, «Partidos» y «Anotar partido» no aparecen.
- [x] **Ids que no se repiten** (salió haciendo el sprint): si se borraba a lx jugadorx con el id más alto, lx siguiente nuevx heredaba ese id, y con él su historial de links y ahora sus partidos. El backend recuerda el id más alto que se borró o que jugó un partido (propiedad `HIGHEST_PLAYER_ID` del script, también si la fila se borra a mano en la planilla) y la app nunca lo vuelve a dar.
- [x] **La lista «Partidos»** («Matches» en inglés), con el botón arriba a la derecha, al lado del idioma: del más nuevo al más viejo, cada partido con el día, el grupo, el lugar y el resultado en palabras («Ganó ROJO 5 a 3», «Empate», «Sin resultado»). «+ Nuevo partido» empieza uno, tocar uno lo abre para corregirlo, y el tacho lo borra con confirmación. Desde los partidos, el mismo botón dice «Jugadorxs».
- [x] **Armar a mano:** un buscador por apodo o nombre, sin acentos, ofrece a cada unx con dos botones, ROJO y NEGRO; ⇄ pasa a alguien al otro equipo y × lx saca. Escape limpia la búsqueda sin cerrar el partido y Enter no guarda. Lxs jugadorxs tienen que estar en la lista.
- [x] **Desde el resultado de la app** (F2-11.4): «Anotar partido», al lado de «Copiar equipos», abre el partido con los dos equipos del armado, encima del resultado. Al guardar volvés al resultado como estaba, y el botón pasa a «Ver partido».
- [x] **Fecha, grupo y lugar:** la fecha arranca en hoy (el día del teléfono, también después de las 21) y el lugar con el del grupo; un lugar escrito a mano queda aunque cambies el grupo.
- [x] **Arquerxs** (Ángela, 26/11: van fijxs y, si no hay arquerx, rotan): en cada equipo, «Al arco» arranca con su GK si tiene unx solx, y si no, en «Rotan»; se puede cambiar. Con arquerx fijx, lo que le hicieron sale del resultado: los goles del otro equipo, y el resto de ese equipo queda en 0. Si rotan, cada unx tiene su contador de «Le hicieron». Se vuelve a calcular en cada guardado.
- [x] **Cuánto mide:** el mismo resumen y el mismo análisis completo del resultado, para cualquier par de equipos de 5, con los lados como están (ROJO sigue siendo ROJO). Si el armado rompe reglas, un bloque dice cuáles y con quién, como el del fallback. Con otro tamaño, el partido se guarda sin análisis y una línea dice cuántxs tiene cada equipo.
- [x] **El resultado, con contadores** (Ángela, 26/11): los goles de cada equipo y, por jugadorx, − n + de goles, errores y, si su equipo rota, «Le hicieron». Aparecen cuando hay resultado. Si los goles con nombre no suman el resultado, se guarda igual y una línea gris lo dice.
- [x] **Privacy mode:** en el partido no se ven los ratings ni los errores, y guardar los deja como estaban; el análisis oculta lo mismo que en el resultado.
- [x] **El resultado se puede cargar después** (la propuesta): el partido se anota al armarlo y, cuando termina, se suman los goles; mientras tanto, la lista dice «Sin resultado».
- [x] **El botón atrás** (la propuesta): de «Partidos» vuelve a lxs jugadorxs, y con un partido abierto, lo cierra. Un link a un partido lo abre encima de la lista.
- [x] Backend publicado con `npm run backend:release` (26/11): producción pasó de la versión 23 a la 24, y las pruebas del pase dieron bien antes y después. El primer pedido después del pase le sumó a `MatchHistory` las columnas nuevas y creó `MatchPlayers`; después, una lectura de control confirmó que producción avisa que guarda partidos y que `readMatches` responde (sin partidos todavía). Con la versión 23 la app anda igual, sin «Partidos».
- [x] Verificado: lint, tipos, 202 tests, build y pruebas en Edge contra una API local que corre `Code.gs` sobre planillas en memoria (nada tocó la planilla real), en tamaño computadora y teléfono, también a 360 px, en los dos idiomas y con privacy mode prendido y apagado:
  - El Sprint 9: 74 chequeos en la compu y 77 en el teléfono. Entre ellos, «Anotar partido» y la vuelta al resultado como estaba, el lugar del grupo, arquerx fijx y rotan con los goles que les hicieron, privacy mode sin errores ni nombres de avoids, Escape con un menú abierto, armar a mano con el buscador, las reglas que rompe, app, editado y a mano, borrar, atrás, un link a un partido, y /matches en un dispositivo que todavía necesita la clave.
  - A escala real (61 jugadorxs con fotos y apodos largos), en tu ventana, a 390 y a 360 px: un nombre largo en el buscador ensanchaba el partido en el teléfono, y quedó arreglado.
  - Las suites de los sprints 3b a 8 siguen pasando. Dos chequeos del penal leían la pantalla después de una captura y a veces llegaban tarde, también con la versión anterior; ahora leen antes.
- [x] **Ángela:** probar el sprint (26/11): salió bien. Lo único: al buscar jugadorxs, el partido se agrandaba y se achicaba, y molestaba verlo (el ajuste, abajo).
- [x] **El partido no cambia de tamaño** (Ángela, 26/11, al probarlo). En la compu, el partido tomaba el alto de lo que tenía adentro y quedaba centrado, así que cada búsqueda, cada jugadorx que entraba, los contadores y el análisis lo agrandaban o lo achicaban, y lo movían. Ahora:
  - En la compu tiene siempre el mismo alto (880 px, o lo que entre en la ventana) y lo de adentro se desplaza, como en el teléfono. También mientras carga, así no salta cuando llega el partido. Un aviso corto (un partido que ya no está, sin conexión) tiene un marco a su medida.
  - Los resultados de la búsqueda flotan debajo del buscador, encima de los equipos, como un menú: nada se corre mientras buscás. Tocar afuera los cierra y deja el texto; al volver al buscador, aparecen de nuevo. Escape, también desde un botón ROJO o NEGRO, limpia la búsqueda sin cerrar el partido.
  - El renglón de «Equipos armados a mano», debajo del título, está desde el principio, así la cabecera no crece cuando entra lx primerx.
  - El lugar de la barra de scroll queda reservado, así nada se corre de costado cuando el partido empieza a desplazarse.
  - Un partido nuevo arranca con lugar vacío abajo, que se llena a medida que sumás jugadorxs. Si molesta, la otra opción es que arranque a su medida y crezca solo hacia abajo, sin moverse arriba.
  - Verificado con 15 chequeos nuevos en la compu y 14 en el teléfono, con clicks y toques de verdad; contra la versión anterior fallaban. Cubren tres cosas:
    - El marco y los equipos quedan quietos al buscar, cuando entra lx primerx, con los contadores, con lxs diez y el análisis, y mientras carga el partido.
    - Los resultados flotan encima de los equipos, y tocar afuera los cierra y deja el texto.
    - Escape desde un botón ROJO o NEGRO no cierra el partido.
- [ ] **Ángela:** mirar el ajuste (pasos abajo, después de la prueba del sprint).

Prueba (en https://armaduki.vercel.app, mejor primero en el teléfono):

1. Arriba a la derecha, al lado del idioma, hay un botón «Partidos» («Matches» en inglés). Abrilo: la lista está vacía. El botón atrás del teléfono te devuelve a lxs jugadorxs.
2. Elegí 10 y armá equipos. Al lado de «Copiar equipos» está «Anotar partido»: se abre el partido con los dos equipos, la fecha de hoy y, arriba, «Equipos de la app». La fecha usa el calendario del teléfono, que es nuevo en la app: fijate que se vea bien y que puedas cambiarla. Elegí el grupo: si la pestaña `Groups` tiene su lugar, se llena solo. Guardá: volvés al resultado, y el botón dice «Ver partido».
3. En la planilla, la pestaña `MatchHistory` tiene una fila nueva (las columnas nuevas quedaron a la derecha de las de antes) y la pestaña nueva `MatchPlayers`, una fila por jugadorx. En la barra de fórmulas, la fecha, los ids y la hora llevan un apóstrofo antes; es lo esperado.
4. Abrí «Partidos» y tocá el partido. Cargá el resultado: aparecen los contadores. En un equipo con GK, «Al arco» dice quién ataja; en uno sin GK dice «Rotan», y cada unx tiene «Le hicieron». Sumá algunos goles con «+» y guardá: la lista dice, por ejemplo, «Ganó ROJO 5 a 3».
5. Prendé privacy mode (tres toques en el ojo del pie) y abrí el partido: no se ven los errores ni los ratings. Apagalo: los errores siguen como los dejaste.
6. «+ Nuevo partido»: buscá a cada unx y sumalx con ROJO o NEGRO; ⇄ lx pasa al otro equipo. Con 5 y 5 aparece «Cuánto mide»; si el armado rompe una regla (por ejemplo, dos GK en un equipo), lo dice.
7. El partido del martes: cargalo así, con su resultado y los goles, y mirá cuánto medía. Los partidos que hayas creado solo para probar, borralos con el tacho de la lista (pide confirmación).
8. Si algo no te cierra, decime qué.

Prueba del ajuste (26/11, en https://armaduki.vercel.app):

1. En la compu, «Partidos» → «+ Nuevo partido»: el partido ya abre con todo su alto, con lugar vacío abajo. Buscá y sumá a varixs: los resultados aparecen flotando encima de los equipos y el partido no se mueve.
2. Con los resultados a la vista, tocá afuera (por ejemplo, en el título): se cierran y el texto queda. Tocá el buscador: vuelven.
3. En el teléfono, lo mismo: mientras buscás, los resultados tapan los equipos, y al sumar a alguien se cierran.
4. Si el lugar vacío del partido nuevo te molesta, decime y lo cambio para que arranque a su medida y crezca solo hacia abajo.

## Sprint 10 - Estadísticas

Objetivo: ver cómo van lxs jugadorxs, los grupos y los lugares con los partidos anotados en el Sprint 9. Los detalles se charlan antes de empezar.

- [ ] Por jugadorx: partidos jugados, ganados, empatados y perdidos, goles, los que le hicieron como arquerx y errores (estos, solo sin privacy mode).
- [ ] Lo mismo por grupo, por lugar y entre dos fechas.
- [ ] Cruzar lo que medía cada partido con cómo terminó, y comparar los equipos de la app con los armados a mano. Con varios partidos anotados, eso sirve para ajustar los pesos del score y probar la propuesta de rating y atributos (Sprint 2 y «Cosas por cerrar»).

## Sprint 11 - Bonus por mismo equipo

Objetivo: que lxs que juegan juntxs en un equipo real tiendan a caer juntxs, sin romper reglas. Empieza cuando `teams` esté cargado y probado con datos reales (F2-10.0).

- [ ] Sumar +1 al score por cada pareja del mismo equipo dentro del mismo team (F2-10.1), sin romper avoids ni reglas fuertes (F2-10.2).
- [ ] Mostrar el bonus en el análisis (F2-10.3).
- [ ] Test que muestre que mejora el score sin forzar un reparto imposible (F2-10.4).
- [ ] Revisar si +1 alcanza después de probar con datos reales (F2-10.5).
- [ ] Al cerrar: el bonus aparece en el análisis y no rompe reglas fuertes (criterio de cierre de la Fase 2).

## Cosas por cerrar

- [x] **Prioridad del fallback del generador.** Queda como está: avoids > wants > owner bias > spread ATT/DEF > límites GK/DEF (19/11). Cuando los wants de un solo lado pasen a preferencia, en el segundo lugar quedan solo los mutuos.
- [ ] **Rating y atributos.** **Propuesta:** no tocarlos por ahora. El rating y los atributos miden casi lo mismo, así que el nivel cuenta dos veces. Con resultados de partidos (Sprint 9), probar que los atributos midan solo el estilo (que la velocidad o la defensa no queden todas del mismo lado) y no el nivel. El Power del owner bias no cambia. Decide: Ángela. Default: no tocarlos hasta tener resultados.
- [x] **Formación ideal.** No se agrega: con los roles de hoy no sería un buen criterio (19/11). Se puede repensar con el segundo puesto del Sprint 6.
- [ ] **Cuánto cuesta romper un want de un solo lado.** Hoy, 15 puntos de score, lo mismo que 1,5 puntos de diferencia de rating (`ONE_WAY_WANT_PENALTY`). Más alto respeta más wants y empareja un poco menos; más bajo, al revés. Decide: Ángela. Default: 15.
- [x] **Varios roles: qué cuentan las reglas.** El puesto principal, por ahora (25/11): el máximo de GK y de DEF y los repartos de DEF y de ATT siguen mirando solo ese. El segundo puesto se ve, pero no cambia las reglas.
- [ ] **El puesto que le toca en cada equipo.** Que el generador decida quién juega de qué usando el segundo puesto. Por ejemplo, con 3 GK elegidxs, unx que también juega de DEF jugaría de DEF y no haría falta el fallback. Para revisar más adelante, con resultados de partidos (Sprint 9). Decide: Ángela. Default: no, por ahora.
- [ ] **Qué hacer con FLEX.** Ángela lo creó para quienes juegan de dos cosas (casi nunca de tres), así que con el segundo puesto puede sobrar. Más adelante: mantenerlo, o pasar esas filas a puesto principal más segundo puesto. Mientras tanto, en la cobertura de DEF y ATT (Sprint 6), unx FLEX sin segundo puesto no cubre: un equipo con FLEX y sin DEF cuenta como sin DEF, y el análisis lo dice. Para que cubra, alcanza con marcarle DEF o ATT de segundo puesto. Decide: Ángela. Default: queda como está.
- [x] **Qué es «sort selected».** «Sort: selected» en Match y en Players: deja arriba a lxs elegidxs (19/11).
- [x] **«Fable 2.5».** Era Claude Fable 5.2, el modelo del rediseño de VolkosFood (24/11).
- [x] **Default de arquerx (`gkWillingness`).** `no` en los dos (25/11): el modal crea jugadorxs con `no`, igual que una fila de la planilla sin el dato (RV-14), así lo desconocido no cuenta como arquerx de emergencia. Se hace en el Sprint 6.
- [x] **Qué oculta privacy mode** (RV-12). Se aplicó el default (20/11): oculta también el total de rating de cada equipo en el análisis. La diferencia entre equipos se sigue viendo, porque el score la necesita para entenderse.
- [x] **Wants y avoids: ¿para cada partido o fijos?** Para cada partido: Ángela casi siempre los borra antes de marcar uno nuevo (25/11). El historial sirve, así que el Sprint 8 va completo.
- [x] **Popularidad general en Avoids.** Igual que en Wants (25/11): arriba de la lista de Avoids quedan lxs que más evita todo el mundo, y así se marcan rápido los choques de siempre.
- [x] **Guardar partidos: automático o con botón** (F2-11.4). Con botón (26/11): «Anotar partido» en el resultado de la app y «+ Nuevo partido» en la lista «Partidos». No hay «prueba» ni «partido real»: cuenta todo lo que se guarda, y un partido que no se jugó se borra.
- [x] **Goles: uno por uno o con contadores** (Sprint 9). Con contadores (26/11): Ángela lo confirmó y el Sprint 9 quedó así. Al lado de cada nombre, − n + de goles, errores y, si su equipo rota, «le hicieron»; anotar gol por gol sigue siendo posible más adelante si hace falta saber qué error terminó en qué gol.
- [ ] **Alcance** (F2-12.6): uso personal o abrir a más grupos. Cambia cuánto pesan la clave, los roles y el multi-grupo. Decide: Ángela. Default: uso personal.
- [ ] **Requisitos dudosos de la v1:** «sugerencia #1 no entendida» (F2-12.7) y «pregunta #10 no entendida» (F2-12.8). Decide: Ángela. Default: se descartan si nadie los recuerda.

## Backlog · Nice to have

- [ ] Suplentes: 10 titulares y 1 o 2 suplentes en gris, con una copia clara (F2-12.1).
- [ ] Partidos de otro tamaño sin romper el balanceador (F2-12.2), y equipos de F6, F7, etc. (F2-12.3).
- [ ] Roles para editar (F2-12.4), si el alcance pasa a más grupos. Para el uso personal alcanza la clave del Sprint 4.
- [ ] Un lugar en la app para olvidar la clave en ese dispositivo (hoy: borrar los datos del sitio). **Propuesta.**
- [ ] Frenar los intentos de clave repetidos desde el backend. **Propuesta.**
- [ ] Multi-grupo o multi-liga (F2-12.5).
- [ ] Variedad en el generador: «otro reparto» entre los casi iguales, o no repetir los equipos de la última fecha (con el historial del Sprint 9).
- [ ] Fotos más livianas: las fotos guardadas en la planilla son casi todo lo que baja al abrir la app (medido el 19/11). Achicarlas al guardarlas, o traerlas aparte de la lectura inicial. Se complementa con abrir con la última lectura guardada (Sprint 4). **Propuesta.**
- [ ] Navegación en la URL: el botón atrás cierra el modal y vuelve de pantalla, como en VolkosFood. Puede entrar en el rediseño. **Propuesta.** Desde el Sprint 9 ya pasa con los partidos (la pantalla y el partido abierto); falta el modal de jugadorx.
- [ ] Pedir confirmación al cerrar el modal con cambios sin guardar. **Propuesta.**
- [ ] Borrar desde el modal de edición en vez de la tarjeta. Por ahora no: Ángela prefiere borrar rápido desde la tarjeta (19/11). **Propuesta.**
- [ ] Que «Copy Teams» no se confunda con apodos de más de una palabra. **Propuesta.**
- [ ] Mostrar los escudos (`crest`) de los equipos. **Propuesta.**
- [ ] Accesibilidad de diálogos y menús: el foco queda dentro del diálogo y los menús usan los roles correctos. **Propuesta.**
- [ ] Que el fallback encuentre la causa en más casos. Hoy detecta de antemano algunas (GK o DEF de más, faltan arquerxs de emergencia, cadenas de wants, un avoid dentro de una cadena); si no encuentra ninguna, dice que las reglas chocan cuando se combinan. Encontrar más cambia el generador y lleva tests, así que va aparte del rediseño. **Propuesta.**
- [ ] Los días que puede cada unx (`availability`, F2-05.3) y su filtro (F2-06.4). Por ahora el nombre del grupo dice el día (25/11).
- [ ] Un modal propio para equipos y grupos: crear, cambiar nombre y colores, sumar el escudo y borrar. Por ahora se crean desde el modal de jugadorx y se editan en la planilla (25/11).
- [ ] Algo con las edades, como la edad promedio de cada equipo. Por ahora solo se guardan y se ven en la tarjeta (25/11). **Propuesta.**

## Para otra versión

Ideas de un rediseño grande que Ángela guardó para más adelante (24/11). Por ahora prefiere un cambio moderado (Sprint 5).

- [ ] **La pizarra del DT:** la app como una cancha de noche. La lista es el plantel, elegir es convocar, y al armar los equipos lxs 10 aparecen dibujadxs en la cancha, cada equipo en su mitad y cada unx en su puesto.
- [ ] **El álbum de figuritas:** tarjetas con la foto grande, el apodo y el rol, tres por fila en el teléfono.
- [ ] **La planilla de partido:** una lista sobria con números de camiseta.
- [ ] Una barra fija abajo con las caritas de lxs elegidxs y «7/10 · Generate Teams», a mano con el pulgar (Propuesta del 19/11).
- [ ] El resultado en su propia vista, con «volver» que conserva la selección (Propuesta del 19/11).
