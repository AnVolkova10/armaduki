# TODO - armaduki

Tablero vivo de la app (v2): qué se hizo, qué sigue y en qué orden. La v1 (Fase 2, febrero a noviembre de 2026) está archivada en `docs/TODO - v1.md`, con sus decisiones y esquemas.

## Cómo usar este TODO

- [x] Se lee y se ejecuta de arriba hacia abajo, de a un ítem por vez. Un ítem no toca otros módulos salvo lo que necesita.
- [x] Los sprints son por objetivo, no por fecha. Al cerrar cada uno, Ángela lo revisa antes de seguir.
- [x] Cuando Ángela dice «hacé el Sprint N», Claude lo implementa, lo verifica (lint, tests, build y una prueba en navegador contra una API local), hace commit y push a `main`, que publica en Vercel, y le pasa dónde y cómo probarlo. El sprint se cierra cuando ella lo prueba. El rediseño (Sprint 5) fue la excepción: se hizo en la rama `sprint-5` y pasó a `main` cuando Ángela lo aprobó (25/11).
- [x] Primero la base (Sprints 1 a 5), después las funciones nuevas (Sprints 6 a 10).
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

- [x] Backend: Google Sheets + Apps Script, publicado con `clasp` (`npm run backend:release`). Producción usa la versión 21 (20/11/2026); la 20 queda para volver atrás.
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
- [x] De los criterios de cierre de la Fase 2 ya se cumplían lint, build, el scroll al resultado (F2-09), el footer abajo (F2-00.7) y Escape en los modales (F2-00.8). Los demás son objetivo de los Sprints 6, 8 y 10.

## Sprint 1 - Lo que anotaste en Notion (hecho)

Objetivo: los pedidos chicos que anotaste en Notion. Solo frontend. El tercero, «Terminar Fase 2», quedó repartido en los Sprints 6 a 10.

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

## Sprint 6 - Campos de jugadorx

Objetivo: cargar desde el modal los datos que la planilla ya tiene lugar para guardar (resto de la Fase 2) y crear equipos y grupos sin ir a la planilla. Decidido con Ángela el 25/11. Los esquemas están en `apps-script/README.md`.

- [ ] **Segundo puesto** (F2-05.9), opcional: DEF, MID, ATT o GK, distinto del principal, en la columna `secondaryRole`. Se ve en el modal, en las tarjetas y en los equipos armados, al lado del principal, más chico y más apagado. Las reglas siguen mirando solo el puesto principal (ver «Cosas por cerrar»).
- [ ] Con GK de segundo puesto, «¿Ataja?» no se muestra y queda en `good`, como pasa hoy con un GK principal.
- [ ] **Cobertura de DEF y ATT**, el híbrido de Ángela: si un equipo se queda sin DEF principal, el score prefiere que tenga a alguien con DEF de segundo puesto, y lo mismo con ATT. Es una preferencia, no una regla, y pesa lo mismo que un want de un solo lado. El análisis lo cuenta: «NEGRO no tiene DEF: defiende Caro, que también juega de DEF». Para MID, FLEX y GK no hace falta (el arco ya tiene a lxs arquerxs de emergencia).
- [ ] «¿Ataja?» arranca en `no` al sumar a alguien (ver «Cosas por cerrar»).
- [ ] **Activx** (F2-05.10): un switch arriba del modal. Apagado, esa persona no aparece en la lista ni se puede elegir, pero no se borra nada: quedan sus datos, sus wants y sus avoids. El filtro suma «Inactivxs» para verla y volver a activarla.
- [ ] **Notas** internas y opcionales (F2-05.11): texto libre en el modal. En la computadora aparecen al pasar el mouse sobre la tarjeta y sobre lx jugadorx en los equipos armados; en el teléfono, solo en el modal. Privacy mode las oculta. La tarjeta no lleva marca y el generador no las usa.
- [ ] **Fecha de nacimiento** (F2-05.8), opcional: día, mes y año, y con el año alcanza. Va en una columna nueva, `birthDate` (AAAA, AAAA-MM o AAAA-MM-DD); `birthYear` queda sin uso. La edad se ve en el modal y en la tarjeta, como el número de camiseta; si falta el día, es aproximada. Privacy mode la oculta. Por ahora no se usa para nada más.
- [ ] **Grupos** (F2-05.3): fichas en el modal, como los equipos, sin uno principal. Como los grupos se arman por cancha, por equipo, por amistad o por día, el nombre lo dice todo: «Segurola 20hs Jueves». Se leen de la pestaña `Groups`. Los días que puede cada unx quedan para más adelante (backlog).
- [ ] **Crear equipos y grupos desde el modal:** una ficha «+ Nuevo» al final de cada fila. Se escribe el nombre (y, si es un equipo, se eligen sus dos colores), se guarda en la planilla y queda marcado. Cambiar nombres o colores y borrar sigue en la planilla; un modal propio queda en el backlog.
- [x] Mostrar el equipo en la tarjeta (F2-05.6): alcanza con los dos colores del equipo principal, en la esquina (25/11).
- [ ] Al cerrar: los campos nuevos leen y escriben sin romper a lxs jugadorxs existentes (criterio de cierre de la Fase 2).

## Sprint 7 - Filtros y orden

Objetivo: encontrar rápido a quién elegir. Usa la búsqueda unificada del Sprint 3.

- [ ] Filtro por equipo (F2-06.1, F2-06.3).
- [ ] Filtro por grupo (F2-06.2). El de día/lugar (F2-06.4) espera a los días (backlog).
- [ ] Orden por camiseta, equipo o grupo donde sume (F2-06.5).

## Sprint 8 - Wants y avoids con historial

Objetivo: elegir relaciones más rápido, empezando por las de siempre.

- [ ] Confirmar el contrato de la pestaña `RelationshipHistory` (F2-07.1). Un «no quiero» se guarda como avoid (F2-07.3).
- [ ] Apps Script: al agregar un want o un avoid nuevo, sumar 1 a su contador (F2-07.5).
- [ ] Leer el historial con la acción `readRelationshipHistory` y valores por defecto si está vacío (F2-07.2, F2-07.4). Sin historial, el selector funciona igual (F2-07.6).
- [ ] Buscador en los selectores de Wants y Avoids (F2-08.1, F2-08.2).
- [ ] Orden del selector: seleccionadxs primero, después el historial del par, después la popularidad general y, si empatan, alfabético (F2-08.3 a F2-08.6).
- [ ] Mantener las pistas de relación inversa (F2-08.7) y validar en el teléfono: listas con scroll y botones legibles (F2-08.8).
- [ ] Al cerrar: los selectores buscan y ordenan por historial cuando existe (criterio de cierre de la Fase 2).

## Sprint 9 - Historial de partidos

Objetivo: guardar los partidos que se jugaron.

- [ ] Confirmar el contrato de la pestaña `MatchHistory` (F2-11.1), separado de `RelationshipHistory` (F2-11.5).
- [ ] Acción del Apps Script para guardar un partido (F2-11.3): fecha e id, seleccionadxs, Team 1, Team 2, score, etapa y social satisfaction (F2-11.2).
- [ ] Guardar desde el resultado. Ver «Cosas por cerrar» (F2-11.4).
- [ ] Guardar también el resultado de cada partido (quién ganó y por cuánto), para ajustar los pesos del score y probar la propuesta de rating y atributos (Sprint 2).

## Sprint 10 - Bonus por mismo equipo

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
- [ ] **Qué hacer con FLEX.** Ángela lo creó para quienes juegan de dos cosas (casi nunca de tres), así que con el segundo puesto puede sobrar. Más adelante: mantenerlo, o pasar esas filas a puesto principal más segundo puesto. Decide: Ángela. Default: queda como está.
- [x] **Qué es «sort selected».** «Sort: selected» en Match y en Players: deja arriba a lxs elegidxs (19/11).
- [x] **«Fable 2.5».** Era Claude Fable 5.2, el modelo del rediseño de VolkosFood (24/11).
- [x] **Default de arquerx (`gkWillingness`).** `no` en los dos (25/11): el modal crea jugadorxs con `no`, igual que una fila de la planilla sin el dato (RV-14), así lo desconocido no cuenta como arquerx de emergencia. Se hace en el Sprint 6.
- [x] **Qué oculta privacy mode** (RV-12). Se aplicó el default (20/11): oculta también el total de rating de cada equipo en el análisis. La diferencia entre equipos se sigue viendo, porque el score la necesita para entenderse.
- [ ] **Guardar partidos: automático o con botón** (F2-11.4). Decide: Ángela. Default: botón explícito, con «prueba» o «partido real».
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
- [ ] Navegación en la URL: el botón atrás cierra el modal y vuelve de pantalla, como en VolkosFood. Puede entrar en el rediseño. **Propuesta.**
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
