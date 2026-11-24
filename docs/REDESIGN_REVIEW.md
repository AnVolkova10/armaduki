# Revisión del rediseño

Fecha: 24/11/2026. Rama `sprint-5`, sin pasar a `main` ni a Vercel hasta que Ángela la pruebe. La dirección está en [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md).

## Qué cambió

- **Lenguaje visual.** Colores propios como variables en `src/index.css`. Barlow y Barlow Condensed servidas desde la app (`public/fonts`, cinco archivos de unos 22 kB). Una sola familia de íconos (`src/components/Icon.tsx`). Se fueron los emojis de los atributos, los colores de fábrica en los roles, las etiquetas «Filter: …» y «Sort: …», el desenfoque detrás del diálogo de confirmación y los colores escritos a mano en el modal.
- **Pantalla.** Mismo lugar para cada cosa. El logo pasa a Barlow Condensed. El contador muestra «7/10» con diez puntitos. «+ Add Player» es un botón de borde; el rojo queda para «Generate Teams».
- **Tarjetas.** Foto de 48 px en la computadora y 40 en el teléfono. La elegida lleva borde rojo, un fondo apenas teñido y una marca sobre la foto.
- **Las 10 suben solas.** Con la décima, el orden pasa a «Sort: Selected» y las tarjetas viajan a su lugar. Al vaciar la selección vuelve el orden que había, salvo que se haya cambiado a mano. La regla está en `sortAfterSelectionChange` (`src/utils/playerListing.ts`), con tests.
- **Idioma.** Inglés por defecto y castellano rioplatense con el switch de la pelota, en el header y en el penal. Cada dispositivo recuerda su elección, también si pierde la clave. Los textos están en `src/i18n/en.ts` y `es.ts`.
- **Resultado.** Los equipos con foto (en el teléfono, sin foto, para que entre un apodo largo), rol y, sin privacy mode, rating y Power; un resumen de tres datos (parejo, social, reglas); el análisis completo plegado, con la comparación de atributos en barras; y la segunda opción, que marca quién cambia de equipo.
- **Fallback.** Un bloque arriba del resultado: por qué, qué se rompió y con quién (lo único en rojo), qué se mantuvo y el orden en que ceden las reglas. Sin una causa única, empieza por lo que se rompió.
- **Generador.** Elige igual que antes. Además del texto de siempre, devuelve el análisis como datos (`report`), y la app arma las frases con ellos en el idioma elegido.
- **Modal de jugadora.** Tres columnas en la computadora (identidad, juego, relaciones) y una hoja de pantalla completa en el teléfono, con «Cancel» y «Save» siempre a la vista. Los atributos se eligen con tres rayitas. Los equipos son fichas; la pelota marca el principal. Las relaciones marcadas aparecen primero; en el teléfono, cada lista va en su caja y scrollea por dentro.
- **Movimiento.** Tocar una tarjeta, reordenar, repartir los equipos, abrir el modal y el switch. Con «reducir movimiento» se apaga todo, también lo que arrancan los scripts (los viajes de las tarjetas y los scrolls suaves).

## Un arreglo que apareció al probar

- **El penal se salteaba el gol si el backend contestaba en menos de 0,8 s.** La puerta se iba antes de que la pelota entrara. Con Apps Script no pasa, porque tarda más, pero quedó corregido: ahora espera al gol.

## Lo que no cambió

- La pantalla única, el penal (misma escena y misma arquera), privacy mode y lo que oculta, el backend y la planilla.
- Qué equipos elige el generador y el texto que arma: 2000 selecciones al azar dan lo mismo que en `main`, y los datos nuevos coinciden con ese texto.
- Lo que copia «Copy Teams»: una línea de apodos por equipo.

## Validación

- `npm run lint`, `npx tsc -b` y `npm run build` sin errores. `npm test`: 100 pruebas (eran 84).
- Navegador (Edge sin ventana) sobre el build, contra una API local que corre `Code.gs` sobre planillas en memoria. Nada tocó la planilla real. Tamaños: 1280 × 900 y 390 × 844; el modal, además, a 1280 × 680 y el header a 360 px en castellano. No se probó en un teléfono real.
  - Rediseño: 54 chequeos en cada tamaño. Fuentes cargadas, búsqueda, filtro y orden, la décima, fallback con causa y sin causa única, rojo solo en lo roto, privacy mode prendido y apagado en los dos idiomas, «Copy Teams», segunda opción, castellano completo, modal, guardar una edición en la planilla de prueba, borrar con confirmación y «reducir movimiento».
  - Pantalla única (Sprint 3b): 26 y 24 chequeos con mouse y toques reales. La suite se actualizó solo donde cambiaron nombres a propósito.
  - Penal (Sprint 4): 18 chequeos en cada tamaño, sin tocar la suite. Más 6 del penal en castellano y del idioma después de perder la clave.
- A escala real, con datos inventados: 61 jugadoras con foto, apodos de hasta 16 letras, atributos distintos y 7 equipos; 9 chequeos, a 360 px en castellano con privacy mode apagado, a 390 px y en computadora. Esa corrida encontró dos problemas que los datos chicos no mostraban, ya corregidos: los equipos del resultado se pisaban a 360 px y el modal del teléfono medía más de cuatro pantallas.
- El modal entra sin scroll a 1280 × 680, también con 60 jugadoras en las relaciones y 7 equipos. Con bloques de prueba puestos donde van los campos del Sprint 6, sigue entrando mientras las fichas de equipos ocupen hasta dos filas (unos 4 equipos).

## Límites conocidos

- El tamaño de 1280 × 680 para el modal es una suposición: falta saber la resolución de la computadora de Ángela.
- Cuando lleguen los campos del Sprint 6: con más de dos filas de fichas de equipos (7 equipos ocupan cinco), la columna de identidad va a scrollear por dentro a 1280 × 680. Hoy, sin esos campos, no scrollea.
- Las descripciones largas de las tarjetas se cortan en dos líneas.
- La lista de relaciones muestra a todas las jugadoras; el buscador llega en el Sprint 8.
- Un aviso de error que ya está en pantalla queda en el idioma en que se escribió. El detalle técnico que manda el backend dentro de un aviso queda en inglés.
- Las tarjetas viajan solo cuando la lista se reordena con las mismas jugadoras; al buscar o filtrar, aparecen sin viaje.
- La segunda opción puede marcar a casi todas como «cambia de equipo» cuando en realidad los dos equipos intercambiaron el nombre. Ya pasaba antes; ahora se nota más porque se marca.
- Que el fallback encuentre la causa en más casos sigue pendiente (backlog del [TODO](../TODO.md)).
