# armaduki — Camiseta nueva

Dirección vigente desde el 24/11/2026: Ángela la aprobó ese día, se implementó en la rama `sprint-5`, se ajustó el 25/11 después de sus pruebas y ese mismo día pasó a `main`. Cómo quedó y cómo se verificó: [REDESIGN_REVIEW.md](REDESIGN_REVIEW.md). Parte de lo que eligió el 24/11: un cambio moderado y no radical, la identidad de armaduki, la app más linda, profesional y animada, y que no parezca hecha por IA.

## Idea

Mismo club, camiseta nueva. armaduki sigue siendo la misma pantalla: la lista de jugadorxs, tocar para elegir 10, armar los equipos y verlos abajo. Cambia la terminación: letra de camiseta, un rojo usado con criterio, superficies prolijas, movimiento que explica lo que pasa y un resultado que se entiende de un vistazo, sobre todo cuando el generador no pudo cumplir todas las reglas.

El recorrido: tocás 10 tarjetas → suben solas y la pantalla vuelve al contador → «Generate Teams» → los equipos se reparten debajo de la lista → «Copy Teams». Si hubo fallback, lo primero que se lee es por qué.

Referencia: las placas de estadísticas de una transmisión de fútbol. Números grandes y angostos, barras finas, fondo negro y poco color. No un tablero de software.

## Decisiones

- **Evolución, no revolución.** Cada cosa queda donde está: el header, los controles, la lista, el lápiz y el tacho en la tarjeta, y el resultado debajo. No hay que volver a aprender la app.
- **Que no parezca hecha por IA.** La calidad sale del detalle (la letra, la alineación, el espaciado parejo y los estados claros), no de los efectos. Se van las marcas de plantilla que tiene hoy:
  - los emojis 🔴🟡🟢 como botones de los atributos;
  - las etiquetas «Filter: all roles» y «Sort: none»;
  - los colores escritos a mano en el modal;
  - la letra del sistema: hoy no carga ninguna, porque «Inter» nunca llega;
  - el análisis entero en rojo cuando hay fallback.

  Tampoco entra nada de lo típico: degradados, brillos, sombras de neón, vidrio esmerilado, chispitas, emojis ni tarjetas infladas con bordes muy redondos.
- **El rojo se gana.** El rojo de la pelota marca solo lo elegido, la acción principal, lo que se rompió y lo que borra. Lo que se cumplió nunca va en rojo. Por eso «+ Add Player» pasa a ser un botón de borde: el rojo queda para «Generate Teams». La excepción son las pills de rol, que usan sus colores de siempre, incluido el rojo de ATT.
- **La foto, un poco más grande.** 48 px en la computadora y 40 en el teléfono (hoy, 40 y 32). La grilla sigue igual: dos por fila en el teléfono.
- **Lxs 10 suben solxs.** Cada vez que la selección llega a 10, el orden pasa solo a «Sort: selected», que se ve en el menú y se puede cambiar: lxs elegidxs quedan primero, con el orden de siempre dentro de cada grupo, y la pantalla sube al contador, como hoy. La búsqueda y los filtros siguen valiendo. Si sacás unx, baja a su lugar entre lxs demás; lx próximx que elijas sube. Cuando la selección queda vacía, vuelve el orden que había antes de lx décimx, salvo que lo hayas cambiado a mano. Esto cierra el pedido de Notion de ver lxs seleccionadxs en el navbar.
- **El resultado se lee de arriba hacia abajo:** los equipos, un resumen de tres datos y el análisis completo plegado.
- **ROJO y NEGRO, no Team 1 y Team 2** (25/11): los equipos se llaman por el color de la pechera, que se entiende más rápido. En las frases van en mayúscula, en su color y sin artículo: «ROJO suma 2 puntos más de rating». En inglés, RED y BLACK.
- **El fallback dice primero por qué.** Después, qué se rompió y con quién, y qué se mantuvo. Rojo solo en lo roto.
- **Inglés, con un switch al castellano.** Inglés por defecto; la pelota del logo hace de perilla para pasar a castellano rioplatense.
- **El modal de jugadorx, compacto:** tan alto como su contenido, sin lugares vacíos reservados. Arriba, quién es; abajo, cómo juega y con quién (25/11).
- **Movimiento al nivel del penal:** fluido, corto y sin rebotes. Cada animación cuenta algo que pasó.

## Lenguaje visual

- **Color.** Fondo negro casi puro, con dos o tres escalones de gris apenas más claros para tarjetas, menús y el modal, y bordes finos. Texto en un blanco un poco cálido, con dos grises para lo secundario. El rojo es el de la pelota del logo (`#dc2626`) y no cambia. Verde apagado para lo cumplido y para los wants; ámbar para los avisos. Los roles conservan los colores de siempre (GK gris, DEF verde, MID ámbar, ATT rojo, FLEX violeta), como pills sólidas con la forma nueva: así lo eligió Ángela el 25/11. Todo el texto con contraste AA. Los colores viven como variables en `index.css`; ningún componente escribe un color a mano, salvo los de los equipos, que vienen de la planilla, y la escena del penal.
- **Letra.** Barlow Condensed (semibold y bold) para el logo, los títulos, el contador y los números; Barlow (regular, medium y semibold) para todo lo demás. Números tabulares, para que no bailen al cambiar. Las etiquetas chicas, en mayúsculas y con un poco de aire entre letras, como en la espalda de una camiseta. Las dos se sirven desde la app, como en VolkosFood (solo latín y solo los pesos que se usan), sin depender de Google.
- **Formas.** Radios chicos y parejos: 6 px en tarjetas, botones y campos; 12 px en el modal. Bordes de 1 px. Sombra solo en lo que flota (menús y modal). Espaciado en múltiplos de 4.
- **Íconos.** Una sola familia de trazo, la de hoy (lápiz, tacho, ojo, lupa), con el mismo grosor y tamaño. Ningún emoji.
- **Movimiento.**
  - Tocar una tarjeta: se hunde apenas y aparece el borde rojo (150 ms).
  - Lx décimx: las tarjetas viajan a su lugar nuevo (300 ms) mientras la pantalla sube.
  - Generar: los equipos aparecen y lxs jugadorxs se reparten de a unx, alternando el Rojo y el Negro, como cartas (menos de un segundo en total).
  - El modal entra con un fundido y una subida corta (200 ms); en el teléfono, la hoja sube desde abajo.
  - El switch: la pelota rueda hasta el otro idioma (300 ms) y, al pasar al castellano, sus colores se intercambian con un fundido.
  - «Copy Teams» confirma con un ✓ por un momento.

  Con «reducir movimiento» nada se desplaza: los cambios son instantáneos o con un fundido corto. Sin librerías nuevas: CSS y la Web Animations API del navegador.

## La pantalla

- **Header.** El logo a la izquierda (`armaduki`, en minúscula y rojo, ahora en Barlow Condensed, con la pelota) y el switch de idioma a la derecha.
- **Arriba de la lista.** «Players», «+ Add Player», el contador, «Clear» y «Generate Teams», en los mismos lugares. El contador va en números grandes («7/10») con diez puntitos que se llenan de a uno; con 10, «Generate Teams» se enciende con un destello, una sola vez. En el teléfono, el número va sobre sus puntitos, sin la palabra, para que entren «Clear» y «Generate Teams» en la misma fila.
- **Controles.** Búsqueda, rol, score y orden, como hoy. Los menús muestran un nombre chico arriba y el valor abajo («Role» / «All», «Sort» / «Selected»); el orden de siempre se llama «Default».
- **Sprint 8 en el modal.** Un buscador arriba de las dos listas de wants y avoids, del ancho de las dos, que las filtra a la vez por apodo o nombre; si no queda nadie, cada lista dice «Nobody by that name». Escape lo limpia antes de cerrar el modal y Enter no lo guarda. Las listas se ordenan al abrir: lxs marcadxs, quienes marcan a esa persona, los de siempre (el historial, en las dos direcciones), lxs más linkeadxs y el resto por apodo; nada se mueve al tocar ni al buscar. No se ven números del historial: solo cambia el orden. Con privacy mode no aparece la lista de avoids y los wants ocupan todo el ancho.
- **Sprint 7 en los controles.** Dos menús más, «Team» y «Group», iguales a los otros: «All» arriba, después cada equipo o grupo por nombre (los equipos con sus dos colores, partidos en diagonal como la esquina de la tarjeta) y al final «No team» o «No group». En el teléfono, y en ventanas de menos de 960 px, la búsqueda va sola en su fila; debajo, rol, score y orden en tercios (en mitades con privacy mode), y debajo, equipo y grupo en mitades, para que entre más de un nombre largo; el menú de la derecha abre hacia la izquierda. Desde 960 px, todo en una fila, con la búsqueda a la izquierda. Un menú sin equipos o sin grupos no aparece. En un teléfono angosto, con el orden por score, el menú de orden pierde su flechita para que entre «Score» al lado de la flecha de dirección.
- **Tarjeta.** La misma información en el mismo orden: foto y número, apodo, nombre, rol y rating (oculto con privacy mode), y el marcador del equipo en la esquina. Elegida: borde rojo, fondo apenas teñido y una marca chica sobre la foto. Con 10 elegidxs, las demás tarjetas se apagan, pero el lápiz y el tacho siguen andando. Los dos van arriba a la derecha, uno sobre el otro: el lápiz arriba y el tacho abajo (25/11). En la computadora aparecen al pasar el mouse, como hoy.
- **Sprint 6 en la tarjeta.** El segundo puesto va al lado del principal, más chico y del mismo color, más suave. La edad va debajo del número de camiseta, como él (con «~» si falta el día). En la computadora, al dejar el mouse sobre la tarjeta aparece su nota debajo, después de un momento. La edad y la nota no se ven con privacy mode. Lxs inactivxs no aparecen; con el filtro «Inactive», sus tarjetas se ven apagadas y no se pueden elegir.
- **Estados.** La pelota que se llena sigue siendo la carga. «Updating from Google Sheets...» y «Saved copy · Refresh» pasan a una línea de estado discreta. Los errores van en una franja con el estilo del resto, con «Retry» y «×».

## El resultado

Debajo de la lista, como hoy, en tres partes:

1. **Los equipos.** El Rojo y el Negro lado a lado, también en el teléfono, cada uno con su color: el Rojo con una línea roja arriba y el fondo apenas teñido de rojo; el Negro, con fondo negro y una línea gris arriba (negra no se vería). La tarjeta del resultado es un toque más clara que el resto, para que NEGRO en negro se lea en las frases. Los nombres van en una etiqueta gris clara, ROJO en rojo y NEGRO en negro (sobre el fondo oscuro el negro no se leería). Cada jugadorx con su foto chica (en el teléfono, sin foto, para que entre un apodo largo), el apodo, el rol y su segundo puesto si tiene, ordenadxs por puesto como hoy; en la computadora, su nota aparece al pasar el mouse. Debajo de cada equipo, su Power (oculto con privacy mode). «Copy Teams» queda abajo, a mano.
2. **El resumen.** Tres datos en una fila:
   - **Parejo:** la etiqueta del score (highly balanced, balanced…) y, sin privacy mode, la diferencia de rating y a qué equipo favorece.
   - **Social:** el porcentaje y los wants cumplidos.
   - **Reglas:** «todas se cumplen» o «fallback: se rompió 1».
3. **El análisis completo**, plegado, con más palabras que números (25/11):
   - **En palabras:** una frase por tema, con su palabra al frente: parejo (y el score), rating (cuánto más suma un equipo), atributos (quién es mejor en qué), arquerxs (si un equipo no tiene GK, quién ataja bien y cuántxs más pueden), ATT, puestos (si un equipo no tiene DEF o ATT, quién lo cubre de segundo puesto; Sprint 6) y links (cuántos se cumplieron, con las parejas).
   - **ROJO vs NEGRO:** las barras, sin números, sobre un fondo blanco: rojas hacia ROJO y negras hacia NEGRO. Arriba, ROJO y NEGRO en su color, sin pill. Una línea explica cómo leerlas.
   - **Cómo se calcula el score:** arranca en 100 y cada línea dice qué resta o suma y por qué. Solo aparece lo que movió el score; lo demás se nombra en una frase.

«Show Second Option» sigue plegada, con la misma estética, y marca quién cambia de equipo.

Con privacy mode, el resumen muestra la etiqueta y el score, sin números de rating, como el header de hoy; el análisis completo muestra la diferencia pero no el total de cada equipo, como se decidió en el Sprint 4. Se prueba en los dos idiomas.

### Cuando hay fallback

El resultado sale igual y, arriba del resumen, aparece un bloque que se entiende de un vistazo (los ejemplos van en castellano; en inglés dicen lo mismo):

- **Por qué**, en una línea y más grande: «Hay 3 GK elegidxs y el máximo es 1 por equipo».
- **Qué se rompió**, y con quién: «Límites de GK y DEF: ROJO quedó con 2 GK» o «Wants mutuos: A y B quieren jugar juntxs y quedaron separadxs». Es lo único en rojo.
- **Qué se mantuvo**, en gris y con ✓: avoids, wants mutuos, owner bias y reparto de ATT y DEF.
- Al pie, chico, el orden en que ceden las reglas, que no cambia: avoids > wants > owner bias > reparto de ATT y DEF > límites de GK y DEF.

Si el generador no encuentra una causa única, el bloque empieza por lo que se rompió y lo aclara en una línea chica: «No hay una sola causa: las reglas chocan cuando se combinan». Que encuentre la causa en más casos es otro trabajo (está en el backlog del TODO).

El resto del resultado se ve normal: ningún otro texto se pone rojo.

Para esto, el generador entrega, además del texto de hoy, los datos de cada regla (cumplida o rota, y con quién) y las causas que detecta. Elige el reparto igual que antes, y los tests lo cuidan. Con esos datos, la app arma las frases en el idioma elegido.

## El modal de jugadorx

Uno solo para sumar y para editar. Rehecho el 25/11: el primero, ancho y con columnas estiradas, dejaba mucho espacio vacío.

- **En la computadora**, de 960 px de ancho y tan alto como su contenido (unos 550 px con privacy mode y 630 sin él, con dos equipos cargados):
  - **Arriba, quién es:** la foto (tocarla la cambia) y, en una fila, apodo, nombre o descripción y camiseta; debajo, los equipos como fichas, con la pelota para marcar el principal.
  - **Abajo a la izquierda, cómo juega:** el puesto (el elegido, como su pill), ¿ataja? (good, low, no), el rating del 1 al 10 con la sugerencia marcada con un punto (oculto con privacy mode) y los 8 atributos con sus tres rayitas.
  - **Abajo a la derecha, con quién:** «Wants to play with» y «Avoids» lado a lado, con dos nombres por fila, lxs marcadxs primero y las pistas de relación inversa. Ocupan el mismo alto que la columna de juego y scrollean por dentro, así nunca estiran el modal.
  - Abajo, siempre a la vista: «Cancel» y «Save». Enter guarda y Escape cierra, como hoy.
- **En el teléfono**, una hoja de pantalla completa: las partes una debajo de la otra, el apodo y la × arriba, y «Cancel» y «Save» fijos abajo. El número y los equipos siguen plegados en «Más datos». Cada lista de relaciones va en su caja y scrollea por dentro.
- **Los campos del Sprint 6** entraron sin lugares vacíos y el modal creció lo justo:
  - «Activx», un switch al lado de la ×; solo al editar.
  - La fecha de nacimiento, en la fila de arriba (día, mes y año; con el año alcanza), con la edad al lado de su nombre.
  - Debajo de los equipos, los grupos como fichas; a su derecha, las notas, en una línea que crece con el texto.
  - Equipos y grupos terminan en una ficha punteada «+ New» que se abre ahí mismo: nombre (y los dos colores, si es un equipo), Enter crea y Escape cierra solo esa ficha.
  - El segundo puesto, al lado del puesto, en el mismo color pero más suave. Con GK ahí, «¿Ataja?» no se muestra, como con un GK principal.
  - Con privacy mode no se ven la fecha ni las notas, como el rating.
  - En la ventana de Ángela (unos 1100 × 920), con dos equipos y cinco grupos, mide 960 × 740 y no scrollea; a 1280 × 680, su cuerpo scrollea unos 90 px. En el teléfono, la fecha, los grupos y las notas van en «Más datos».
  - Los días que puede cada unx quedaron para más adelante: el nombre del grupo dice el día.

## El idioma

- Inglés por defecto. El switch lo pasa a castellano rioplatense y cada dispositivo recuerda lo que eligió. No se adivina por el idioma del navegador.
- El switch: «EN» de un lado, «ES» del otro y la pelota del logo como perilla, que rueda (gira mientras se desplaza) hacia el idioma elegido. En inglés es el logo tal cual, roja con negro; en castellano los colores se intercambian con un fundido: lo rojo pasa a negro y lo negro a rojo (25/11). El activo en blanco y el otro en gris. Está a la derecha del header y en una esquina del penal, porque el penal tapa el header y sus textos también se traducen.
- Castellano con voseo y con x para nombrar personas, porque en los grupos juegan personas de distintas identidades (pedido de Ángela, 25/11): «Sumar jugadorx», «7/10 elegidxs», «arquerxs de emergencia», «juegan juntxs»; «Armar equipos», «ROJO» y «NEGRO», «Copiar equipos», «Otra opción». En el penal: «Hacé el gol para entrar», «Gol», «Atajada. Esa no es la clave.», «Palo. No hubo respuesta, probá de nuevo.».
- Los atributos, como se dicen en la cancha: remate, control, pase, marca, velocidad, visión, garra y aire.
- Los roles quedan con sus códigos (GK, DEF, MID, ATT, FLEX) en los dos idiomas: son los de la planilla y los que ya se usan.
- No se traduce lo que viene de la planilla: apodos, nombres y notas.
- Los avisos de error se escriben en el idioma que había cuando pasaron: uno que ya está en pantalla no cambia al tocar el switch.

## No cambia

- Una sola pantalla: tocar la tarjeta la elige; editar y borrar, en la tarjeta (borrar, con confirmación); el resultado, debajo de la lista.
- El penal de entrada: la misma escena y lx mismx arquerx. Solo se traduce, suma el switch y sus textos toman la letra nueva.
- Privacy mode: el ojo escondido del pie, que se prende con tres toques, y lo que oculta.
- El fondo oscuro y el diseño pensado primero para el teléfono.
- El backend, la planilla, las reglas y cómo elige el generador.
- Las ideas de un rediseño grande (la pizarra del DT, el álbum de figuritas, la planilla de partido, la barra fija abajo y el resultado en su propia vista) quedan en el TODO, en «Para otra versión».
