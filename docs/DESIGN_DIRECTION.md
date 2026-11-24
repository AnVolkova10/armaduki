# armaduki — Camiseta nueva

Dirección vigente desde el 24/11/2026: Ángela la aprobó ese día y se implementó en la rama `sprint-5`, que pasa a `main` cuando ella la prueba. Cómo quedó y cómo se verificó: [REDESIGN_REVIEW.md](REDESIGN_REVIEW.md). Parte de lo que eligió el 24/11: un cambio moderado y no radical, la identidad de armaduki, la app más linda, profesional y animada, y que no parezca hecha por IA.

## Idea

Mismo club, camiseta nueva. armaduki sigue siendo la misma pantalla: la lista de jugadoras, tocar para elegir 10, armar los equipos y verlos abajo. Cambia la terminación: letra de camiseta, un rojo usado con criterio, superficies prolijas, movimiento que explica lo que pasa y un resultado que se entiende de un vistazo, sobre todo cuando el generador no pudo cumplir todas las reglas.

El recorrido: tocás 10 tarjetas → suben solas y la pantalla vuelve al contador → «Generate Teams» → los equipos se reparten debajo de la lista → «Copy Teams». Si hubo fallback, lo primero que se lee es por qué.

Referencia: las placas de estadísticas de una transmisión de fútbol. Números grandes y angostos, barras finas, fondo negro y poco color. No un tablero de software.

## Decisiones

- **Evolución, no revolución.** Cada cosa queda donde está: el header, los controles, la lista, el lápiz y el tacho en la tarjeta, y el resultado debajo. No hay que volver a aprender la app.
- **Que no parezca hecha por IA.** La calidad sale del detalle (la letra, la alineación, el espaciado parejo y los estados claros), no de los efectos. Se van las marcas de plantilla que tiene hoy:
  - los colores de fábrica de Tailwind en los roles, con un violeta saturado para FLEX;
  - los emojis 🔴🟡🟢 como botones de los atributos;
  - las etiquetas «Filter: all roles» y «Sort: none»;
  - los colores escritos a mano en el modal;
  - la letra del sistema: hoy no carga ninguna, porque «Inter» nunca llega;
  - el análisis entero en rojo cuando hay fallback.

  Tampoco entra nada de lo típico: degradados, brillos, sombras de neón, vidrio esmerilado, chispitas, emojis ni tarjetas infladas con bordes muy redondos.
- **El rojo se gana.** El rojo de la pelota marca solo lo elegido, la acción principal, lo que se rompió y lo que borra. Lo que se cumplió nunca va en rojo. Por eso «+ Add Player» pasa a ser un botón de borde: el rojo queda para «Generate Teams».
- **La foto, un poco más grande.** 48 px en la computadora y 40 en el teléfono (hoy, 40 y 32). La grilla sigue igual: dos por fila en el teléfono.
- **Las 10 suben solas.** Cada vez que la selección llega a 10, el orden pasa solo a «Sort: selected», que se ve en el menú y se puede cambiar: las elegidas quedan primero, con el orden de siempre dentro de cada grupo, y la pantalla sube al contador, como hoy. La búsqueda y los filtros siguen valiendo. Si sacás una, baja a su lugar entre las demás; la próxima que elijas sube. Cuando la selección queda vacía, vuelve el orden que había antes de la décima, salvo que lo hayas cambiado a mano. Esto cierra el pedido de Notion de ver las seleccionadas en el navbar.
- **El resultado se lee de arriba hacia abajo:** los equipos, un resumen de tres datos y el análisis completo plegado.
- **El fallback dice primero por qué.** Después, qué se rompió y con quién, y qué se mantuvo. Rojo solo en lo roto.
- **Inglés, con un switch al castellano.** Inglés por defecto; la pelota del logo hace de perilla para pasar a castellano rioplatense.
- **El modal de jugadora, en tres columnas** (identidad, juego y relaciones), con lugar para los campos del Sprint 6, así se diseña una sola vez.
- **Movimiento al nivel del penal:** fluido, corto y sin rebotes. Cada animación cuenta algo que pasó.

## Lenguaje visual

- **Color.** Fondo negro casi puro, con dos o tres escalones de gris apenas más claros para tarjetas, menús y el modal, y bordes finos. Texto en un blanco un poco cálido, con dos grises para lo secundario. El rojo es el de la pelota del logo (`#dc2626`) y no cambia. Verde apagado para lo cumplido y para los wants; ámbar para los avisos. Los roles conservan su color de hoy (GK gris, DEF verde, MID ámbar, ATT rojo, FLEX violeta), en tonos propios y más apagados; ATT se corre hacia el coral para no confundirse con el rojo de la marca. Todo el texto con contraste AA. Los colores viven como variables en `index.css`; ningún componente escribe un color a mano, salvo los de los equipos, que vienen de la planilla, y la escena del penal.
- **Letra.** Barlow Condensed (semibold y bold) para el logo, los títulos, el contador y los números; Barlow (regular, medium y semibold) para todo lo demás. Números tabulares, para que no bailen al cambiar. Las etiquetas chicas, en mayúsculas y con un poco de aire entre letras, como en la espalda de una camiseta. Las dos se sirven desde la app, como en VolkosFood (solo latín y solo los pesos que se usan), sin depender de Google.
- **Formas.** Radios chicos y parejos: 6 px en tarjetas, botones y campos; 12 px en el modal. Bordes de 1 px. Sombra solo en lo que flota (menús y modal). Espaciado en múltiplos de 4.
- **Íconos.** Una sola familia de trazo, la de hoy (lápiz, tacho, ojo, lupa), con el mismo grosor y tamaño. Ningún emoji.
- **Movimiento.**
  - Tocar una tarjeta: se hunde apenas y aparece el borde rojo (150 ms).
  - La décima: las tarjetas viajan a su lugar nuevo (300 ms) mientras la pantalla sube.
  - Generar: los equipos aparecen y las jugadoras se reparten de a una, alternando Team 1 y Team 2, como cartas (menos de un segundo en total).
  - El modal entra con un fundido y una subida corta (200 ms); en el teléfono, la hoja sube desde abajo.
  - El switch: la pelota rueda hasta el otro idioma (300 ms).
  - «Copy Teams» confirma con un ✓ por un momento.

  Con «reducir movimiento» nada se desplaza: los cambios son instantáneos o con un fundido corto. Sin librerías nuevas: CSS y la Web Animations API del navegador.

## La pantalla

- **Header.** El logo a la izquierda (`armaduki`, en minúscula y rojo, ahora en Barlow Condensed, con la pelota) y el switch de idioma a la derecha.
- **Arriba de la lista.** «Players», «+ Add Player», el contador, «Clear» y «Generate Teams», en los mismos lugares. El contador va en números grandes («7/10») con diez puntitos que se llenan de a uno; con 10, «Generate Teams» se enciende con un destello, una sola vez. En el teléfono, el número va sobre sus puntitos, sin la palabra, para que entren «Clear» y «Generate Teams» en la misma fila.
- **Controles.** Búsqueda, rol, score y orden, como hoy. Los menús muestran un nombre chico arriba y el valor abajo («Role» / «All», «Sort» / «Selected»); el orden de siempre se llama «Default».
- **Tarjeta.** La misma información en el mismo orden: foto y número, apodo, nombre, rol y rating (oculto con privacy mode), y el marcador del equipo en la esquina. Elegida: borde rojo, fondo apenas teñido y una marca chica sobre la foto. Con 10 elegidas, las demás se apagan, pero el lápiz y el tacho siguen andando; en la computadora aparecen al pasar el mouse, como hoy.
- **Estados.** La pelota que se llena sigue siendo la carga. «Updating from Google Sheets...» y «Saved copy · Refresh» pasan a una línea de estado discreta. Los errores van en una franja con el estilo del resto, con «Retry» y «×».

## El resultado

Debajo de la lista, como hoy, en tres partes:

1. **Los equipos.** Team 1 y Team 2 lado a lado, también en el teléfono, marcados como pecheras: clara y oscura. Cada jugadora con su foto chica (en el teléfono, sin foto, para que entre un apodo largo), el apodo y el rol, ordenadas por puesto como hoy. Debajo de cada equipo, su Power (oculto con privacy mode). «Copy Teams» queda abajo, a mano.
2. **El resumen.** Tres datos en una fila:
   - **Parejo:** la etiqueta del score (highly balanced, balanced…) y, sin privacy mode, la diferencia de rating y a qué equipo favorece.
   - **Social:** el porcentaje y los wants cumplidos.
   - **Reglas:** «todas se cumplen» o «fallback: se rompió 1».
3. **El análisis completo**, plegado: la comparación de atributos como en una placa de TV, con la barra de cada uno inclinada hacia el equipo que favorece; las arqueras de emergencia y los ATT; los links cumplidos y rotos; y la fórmula del score, chica, al final.

«Show Second Option» sigue plegada, con la misma estética, y marca quién cambia de equipo.

Con privacy mode, el resumen muestra la etiqueta y el score, sin números de rating, como el header de hoy; el análisis completo muestra la diferencia pero no el total de cada equipo, como se decidió en el Sprint 4. Se prueba en los dos idiomas.

### Cuando hay fallback

El resultado sale igual y, arriba del resumen, aparece un bloque que se entiende de un vistazo (los ejemplos van en castellano; en inglés dicen lo mismo):

- **Por qué**, en una línea y más grande: «Hay 3 GK elegidas y el máximo es 1 por equipo».
- **Qué se rompió**, y con quién: «Límite de GK: el Equipo 1 quedó con 2» o «Wants mutuos: A y B quedaron separadas». Es lo único en rojo.
- **Qué se mantuvo**, en gris y con ✓: avoids, wants mutuos, owner bias y reparto de ATT y DEF.
- Al pie, chico, el orden en que ceden las reglas, que no cambia: avoids > wants > owner bias > reparto de ATT y DEF > límites de GK y DEF.

Si el generador no encuentra una causa única, el bloque empieza por lo que se rompió y lo aclara en una línea chica: «No hay una sola causa: las reglas chocan cuando se combinan». Que encuentre la causa en más casos es otro trabajo (está en el backlog del TODO).

El resto del resultado se ve normal: ningún otro texto se pone rojo.

Para esto, el generador entrega, además del texto de hoy, los datos de cada regla (cumplida o rota, y con quién) y las causas que detecta. Elige el reparto igual que antes, y los tests lo cuidan. Con esos datos, la app arma las frases en el idioma elegido.

## El modal de jugadora

Uno solo para sumar y para editar.

- **En la computadora**, ancho y en tres columnas. Entra sin scroll en una ventana de 1280 × 680 o más grande, medido con los lugares del Sprint 6 ocupados; si la ventana es más chica, scrollea cada columna por dentro, nunca la página.
  - **Identidad:** la foto más grande (tocarla la cambia), apodo, nombre o descripción, número de camiseta y equipos como fichas, con la pelota para marcar el principal. Lugar reservado para el Sprint 6: la fecha de nacimiento (con la edad) al lado del número de camiseta, «activa» a la derecha del título de la columna, y las notas abajo.
  - **Juego:** el rol, ¿ataja? (good, low, no), el rating del 1 al 10 con la sugerencia marcada con un punto (oculto con privacy mode) y los 8 atributos, cada uno con un control de tres rayitas, como la señal del teléfono, en lugar de los emojis. Lugar reservado para el Sprint 6: «también juega», para los varios roles (el rol de hoy pasa a ser el principal, que es el que cuentan las reglas mientras no se decida otra cosa), y grupos y día o lugar.
  - **Relaciones:** «Wants to play with» y «Avoids», con las marcadas primero y las pistas de relación inversa de hoy. La lista scrollea por dentro; arriba queda el lugar del buscador del Sprint 8.
  - Abajo, siempre a la vista: «Cancel» y «Save». Enter guarda y Escape cierra, como hoy.
- **En el teléfono**, una hoja de pantalla completa: las tres partes una debajo de la otra, el apodo y la × arriba, y «Cancel» y «Save» fijos abajo. Cada lista de relaciones va en su caja y scrollea por dentro, para que la hoja no se haga eterna.
- «Extra info» deja de hacer falta en la computadora, porque todo tiene su lugar; en el teléfono puede seguir plegado.

## El idioma

- Inglés por defecto. El switch lo pasa a castellano rioplatense y cada dispositivo recuerda lo que eligió. No se adivina por el idioma del navegador.
- El switch: «EN» de un lado, «ES» del otro y la pelota del logo como perilla, que rueda (gira mientras se desplaza) hacia el idioma elegido. El activo en blanco y el otro en gris. Está a la derecha del header y en una esquina del penal, porque el penal tapa el header y sus textos también se traducen.
- Castellano con voseo y en femenino: «Sumar jugadora», «7/10 elegidas», «Armar equipos», «Equipo 1», «Copiar equipos», «Otra opción». En el penal: «Hacé el gol para entrar», «Gol», «Atajada. Esa no es la clave.», «Palo. No hubo respuesta, probá de nuevo.».
- Los atributos, como se dicen en la cancha: remate, control, pase, marca, velocidad, visión, garra y aire.
- Los roles quedan con sus códigos (GK, DEF, MID, ATT, FLEX) en los dos idiomas: son los de la planilla y los que ya se usan.
- No se traduce lo que viene de la planilla: apodos, nombres y notas.
- Los avisos de error se escriben en el idioma que había cuando pasaron: uno que ya está en pantalla no cambia al tocar el switch.

## No cambia

- Una sola pantalla: tocar la tarjeta la elige; editar y borrar, en la tarjeta (borrar, con confirmación); el resultado, debajo de la lista.
- El penal de entrada: la misma escena y la misma arquera. Solo se traduce, suma el switch y sus textos toman la letra nueva.
- Privacy mode: el ojo escondido del pie, que se prende con tres toques, y lo que oculta.
- El fondo oscuro y el diseño pensado primero para el teléfono.
- El backend, la planilla, las reglas y cómo elige el generador.
- Las ideas de un rediseño grande (la pizarra del DT, el álbum de figuritas, la planilla de partido, la barra fija abajo y el resultado en su propia vista) quedan en el TODO, en «Para otra versión».
