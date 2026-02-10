# V3 TODO - armaduki

Estado: lista nueva (prefijos reiniciados), ordenada por prioridad.

## Reglas de ejecucion

- [ ] Tomar solo 1 item por iteracion.
- [ ] No tocar otros modulos salvo dependencias directas del item.
- [ ] Al cerrar un item, probar en local antes de pasar al siguiente.
- [ ] Disenar y validar siempre con enfoque mobile-first (layout, interacciones y legibilidad).

## Prioridad / Primeros

- [ ] N-01 Agregar `numero de camiseta` en modal, store, sheet y tarjeta. (requiere Sheet/App Script)
- [ ] N-02 Agregar `equipo` + `dia/lugar` (multiples valores) en modal, store, sheet y tarjeta. (requiere Sheet/App Script)
- [ ] N-03 En la tarjeta, mostrar `equipo` con circulo de dos colores. (requiere Sheet/App Script)
- [ ] N-04 Agregar filtros para campos nuevos (`equipo`, `dia/lugar` y otros que se sumen). (requiere Sheet/App Script)
- [ ] N-05 Agregar orden para campos nuevos (`equipo`, `dia/lugar` y otros que se sumen). (requiere Sheet/App Script)

## Siguientes

- [ ] N-06 Guardar historial de equipos/partidos en otra pestana del Sheet (investigar complejidad tecnica). (requiere Sheet/App Script)

## Backlog

- [ ] N-B01 Soporte de suplentes: 10 titulares + 1 o 2 suplentes (en gris) y salida/copia clara.
- [ ] N-B02 Permitir partidos con tamano variable sin romper balanceador (con y sin suplentes).
- [ ] N-B03 Auth/roles para edicion.
- [ ] N-B04 Preparar app para multi-grupo/multi-liga.
- [ ] N-B05 Definir alcance a mediano plazo (seguir personal o abrir a mas grupos).
