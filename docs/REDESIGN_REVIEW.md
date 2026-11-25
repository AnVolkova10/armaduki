# Revisión del rediseño

Fecha: 24/11/2026, con los ajustes del 25/11 después de las pruebas de Ángela, que lo aprobó ese día: pasó de la rama `sprint-5` a `main` y a Vercel. La dirección está en [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md).

## Qué cambió

- **Lenguaje visual.** Colores propios como variables en `src/index.css`. Barlow y Barlow Condensed servidas desde la app (`public/fonts`, cinco archivos de unos 22 kB). Una sola familia de íconos (`src/components/Icon.tsx`). Se fueron los emojis de los atributos, las etiquetas «Filter: …» y «Sort: …», el desenfoque detrás del diálogo de confirmación y los colores escritos a mano en el modal.
- **Pantalla.** Mismo lugar para cada cosa. El logo pasa a Barlow Condensed. El contador muestra «7/10» con diez puntitos. «+ Add Player» es un botón de borde; el rojo queda para «Generate Teams».
- **Tarjetas.** Foto de 48 px en la computadora y 40 en el teléfono. La elegida lleva borde rojo, un fondo apenas teñido y una marca sobre la foto. El lápiz y el tacho, arriba a la derecha, uno sobre el otro. Las pills de rol, sólidas, con los colores de siempre.
- **Las 10 suben solas.** Con la décima, el orden pasa a «Sort: Selected» y las tarjetas viajan a su lugar. Al vaciar la selección vuelve el orden que había, salvo que se haya cambiado a mano. La regla está en `sortAfterSelectionChange` (`src/utils/playerListing.ts`), con tests.
- **Idioma.** Inglés por defecto y castellano rioplatense con el switch de la pelota, en el header y en el penal. Cada dispositivo recuerda su elección, también si pierde la clave. Los textos están en `src/i18n/en.ts` y `es.ts`.
- **Resultado.** El Rojo y el Negro, cada uno con su color, con foto (en el teléfono, sin foto, para que entre un apodo largo), rol y, sin privacy mode, rating y Power; un resumen de tres datos (parejo, social, reglas); el análisis completo plegado, que arranca en palabras; y la segunda opción, que marca quién cambia de equipo.
- **Fallback.** Un bloque arriba del resultado: por qué, qué se rompió y con quién (lo único en rojo), qué se mantuvo y el orden en que ceden las reglas. Sin una causa única, empieza por lo que se rompió.
- **Generador.** Elige igual que antes. Además del texto de siempre, devuelve el análisis como datos (`report`), y la app arma las frases con ellos en el idioma elegido.
- **Modal de jugadora.** En la computadora, tan alto como su contenido: arriba quién es (foto, apodo, nombre y camiseta en una fila, y los equipos), abajo cómo juega y, al lado, con quién, con las dos listas del mismo alto que la columna de juego y scroll por dentro. En el teléfono, una hoja de pantalla completa. «Cancel» y «Save» siempre a la vista. Los atributos se eligen con tres rayitas.
- **Movimiento.** Tocar una tarjeta, reordenar, repartir los equipos, abrir el modal y el switch, cuya pelota invierte sus colores con un fundido en castellano. Con «reducir movimiento» se apaga todo, también lo que arrancan los scripts (los viajes de las tarjetas y los scrolls suaves).

## Después de la primera prueba (25/11)

Ángela probó la rama en su computadora. Le gustaron el switch, las rayitas de los atributos y el resto; pidió cinco cambios, hechos el mismo día:

1. **Pills de rol con los colores de siempre.** Vuelven el gris, verde, ámbar, rojo y violeta de antes, sólidos, con la forma nueva. El puesto elegido en el modal se ve igual que su pill.
2. **Lápiz y tacho, uno sobre el otro, arriba a la derecha:** el lápiz arriba y el tacho abajo, en la computadora y en el teléfono.
3. **Modal rehecho.** El primero (tres columnas de 1060 px) se estiraba hasta el alto de la ventana por las listas de relaciones y dejaba mucho espacio vacío, con los campos desparejos. Ahora mide 960 px de ancho y entre 550 (con privacy mode) y 630 px de alto, los campos están en una grilla, las listas de relaciones muestran dos nombres por fila y no hay lugares vacíos reservados para el Sprint 6.
4. **Análisis con palabras.** Arranca con «En palabras», una frase por tema; las barras no llevan números y el score se explica línea por línea, mostrando solo lo que lo movió.
5. **La pelota del switch:** en inglés, el logo tal cual; en castellano, los colores se intercambian (rojo a negro, negro a rojo) con un fundido mientras rueda.

Después, en una segunda vuelta, le gustaron estos cambios y pidió uno de concepto:

6. **Rojo y Negro en vez de Team 1 y Team 2.** Los nombres van en una etiqueta gris clara, ROJO en rojo y NEGRO en negro: NEGRO en negro sobre el fondo oscuro no se leía. El Rojo lleva una línea roja arriba y un fondo apenas rojo; el Negro, fondo negro. En el análisis, las barras hacia el Rojo son rojas y hacia el Negro, negras con un borde claro. En las frases, ROJO y NEGRO van en mayúscula, en su color y sin artículo («ROJO suma 2 puntos más de rating»), sin pill: ROJO en rojo y NEGRO en negro puro. Para que NEGRO se lea, la tarjeta del resultado pasó a un gris un toque más claro (#232327); el borde gris que tuvo primero no le gustó. Las barras de la comparación van sobre un fondo blanco, así las rojas y las negras se ven sin bordes, y arriba dicen ROJO y NEGRO en su color, sin pill. El Negro lleva arriba una línea gris, como la roja del Rojo (en inglés, RED y BLACK). «Copiar equipos» sigue copiando solo los apodos, como pidió Ángela.

## Un arreglo que apareció al probar

- **El penal se salteaba el gol si el backend contestaba en menos de 0,8 s.** La puerta se iba antes de que la pelota entrara. Con Apps Script no pasa, porque tarda más, pero quedó corregido: ahora espera al gol.

## Lo que no cambió

- La pantalla única, el penal (misma escena y misma arquera), privacy mode y lo que oculta, el backend y la planilla.
- Qué equipos elige el generador y el texto que arma: 2000 selecciones al azar dan lo mismo que en `main`, y los datos nuevos coinciden con ese texto.
- Lo que copia «Copy Teams»: una línea de apodos por equipo.

## Validación

- `npm run lint`, `npx tsc -b` y `npm run build` sin errores. `npm test`: 100 pruebas (eran 84).
- Navegador (Edge sin ventana) sobre el build, contra una API local que corre `Code.gs` sobre planillas en memoria. Nada tocó la planilla real. Tamaños: 1280 × 900 y 390 × 844; el modal, además, a 1280 × 680 y el header a 360 px en castellano. No se probó en un teléfono real.
  - Rediseño: 57 chequeos en cada tamaño. Fuentes cargadas, búsqueda, filtro y orden, la décima, fallback con causa y sin causa única, rojo solo en lo roto, privacy mode prendido y apagado en los dos idiomas, «Copy Teams», segunda opción, castellano completo, el análisis en palabras (y que el score línea por línea sume el total), modal compacto (campos en una fila, juego y relaciones del mismo alto, sin franja vacía), el puesto elegido con el color de su pill, guardar una edición en la planilla de prueba, borrar con confirmación y «reducir movimiento».
  - Pantalla única (Sprint 3b): 26 y 24 chequeos con mouse y toques reales. La suite se actualizó solo donde cambiaron nombres a propósito.
  - Penal (Sprint 4): 18 chequeos en cada tamaño, sin tocar la suite. Más 6 del penal en castellano y del idioma después de perder la clave, y 4 de la pelota del switch: el logo en inglés, el fundido y los colores invertidos en castellano.
- A escala real, con datos inventados: 61 jugadoras con foto, apodos de hasta 16 letras, atributos distintos y 7 equipos; 9 chequeos, a 360 px en castellano con privacy mode apagado, a 390 px y en computadora. Esa corrida encontró dos problemas que los datos chicos no mostraban, ya corregidos: los equipos del resultado se pisaban a 360 px y el modal del teléfono medía más de cuatro pantallas.
- El modal nuevo mide 960 × 632 a 1280 × 680 y no scrollea, también con 60 jugadoras en las relaciones (las listas scrollean por dentro). Con 7 equipos, la franja de arriba suma una fila de fichas y el cuerpo scrollea 24 px.

## Límites conocidos

- Por su captura, la ventana de Ángela parece de unos 1100 × 920 (falta que lo confirme): ahí el modal entra de sobra, y con privacy mode cada lista de relaciones muestra 12 nombres a la vez (antes, 5). En una ventana de menos de 680 px de alto, su cuerpo scrollea.
- Cuando lleguen los campos del Sprint 6, el modal va a crecer: con unos 170 px más, a 1280 × 680 su cuerpo va a scrollear un poco.
- Las descripciones largas de las tarjetas se cortan en dos líneas.
- La lista de relaciones muestra a todas las jugadoras; el buscador llega en el Sprint 8.
- Un aviso de error que ya está en pantalla queda en el idioma en que se escribió. El detalle técnico que manda el backend dentro de un aviso queda en inglés.
- Las tarjetas viajan solo cuando la lista se reordena con las mismas jugadoras; al buscar o filtrar, aparecen sin viaje.
- La segunda opción puede marcar a casi todas como «cambia de equipo» cuando en realidad los dos equipos intercambiaron el nombre. Ya pasaba antes; ahora se nota más porque se marca.
- Que el fallback encuentre la causa en más casos sigue pendiente (backlog del [TODO](../TODO.md)).
