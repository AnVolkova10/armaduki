# MEGA TODO - armaduki

Estado: ordenado de facil a dificil para avanzar paso a paso, sin cambios en cascada.

## Regla de ejecucion

- [ ] Tomar solo 1 item por iteracion.
- [ ] No tocar otros modulos salvo dependencias directas del item.
- [ ] Al cerrar un item, probar en local antes de pasar al siguiente.
- [ ] Disenar y validar siempre con enfoque mobile-first (layout, interacciones y legibilidad).

## Fase 1 - Facil

- [x] F1-01 Quitar "Relationship Score" del resultado y mostrar solo Social Satisfaction (%).
- [x] F1-01b En el Analysis, detallar Social Satisfaction con nombres (quien con quien).
- [x] F1-01c Mover Analysis debajo de Copy Teams y mostrarlo en 2 columnas en desktop (mobile-first).
- [x] F1-02 En Social Satisfaction mostrar tambien dislikes cumplidos (met dislikes / total dislikes).
- [x] F1-02b Agregar met dislikes links y separar el Analysis en bloques visuales claros.
- [x] F1-03 En `People` mostrar quienes estan seleccionados en `Match`.
- [x] F1-04 Cambiar label del modal: "Name" -> "Name or description".
- [x] F1-04b Hover de delete: icono + fondo en rojo.
- [x] F1-05 En People: agregar botones para limpiar todas las relaciones, solo positivas y solo negativas.
- [x] F1-06 Reemplazar `confirm/alert` por modal de confirmacion simple reutilizable (accept/cancel).
- [x] F1-07 Mejorar el titulo "Attributes" (ocultarlo o version mas compacta).
- [x] F1-08 Aumentar glow debajo de los emojis de atributos.
- [x] F1-09 Mantener triple click de privacidad, pero quitar pistas visuales (sin opacidad hover y sin cursor pointer).
- [x] F1-10 Limpiar dependencias no usadas (`papaparse`, `xlsx`) si no se usan en runtime.
- [x] F1-11 Reemplazar README template por README propio del proyecto.
- [x] F1-12 Robustecer parseo de filas de Sheets para que un dato malformado no rompa toda la carga.

## Fase 2 - Media

- [x] F2-01 Si la app abre en `/match`, cargar jugadores desde Sheets tambien (local y deploy).
- [x] F2-02 Arreglar bug 404 en Vercel para rutas SPA (`/match`) con rewrites.
- [x] F2-03 Agregar metadatos para compartir (Open Graph + Twitter): icono, titulo y descripcion.
- [x] F2-04A Buscador prefijo por `nickname/name` en People + Match (`a`, `ab`, etc), case-insensitive.
- [x] F2-04B UI base mobile-first de controles (search + filter + sort), minimalista y compacta.
- [x] F2-04C Ordenar por score (`asc/desc`).
- [x] F2-04D Ordenar por posicion (`GK > FLEX > DEF > MID > ATT`).
- [x] F2-04E Filtrar por posicion (single-select + opcion `all`).
- [x] F2-04F Filtrar por score (modo inicial simple: `score exacto`, ej. `6`).
- [x] F2-04G Combinacion estable: aplicar `search -> filters -> sort` sin romper seleccion actual.
- [ ] F2-04H Boton `Reset controls` para limpiar buscador, filtros y orden.
- [ ] F2-10 Mejorar guardado optimista: estado de sync, error claro y opcion de reintento cuando falle Apps Script.
- [ ] F2-11 Rating default automatico desde atributos cuando el rating manual no fue editado (definir puntos y restas).
- [ ] F2-12 Hacer variable el sesgo de owner (`OWNER_ID`) para que no quede hardcodeado.

## Fase 2 - Postergado (cambios en Sheet/App Script)

- [ ] P2-01 (antes F2-04) Agregar `pronombres` en modal, store, sheet y tarjeta.
- [ ] P2-02 (antes F2-05) Agregar `numero de camiseta` en modal, store, sheet y tarjeta.
- [ ] P2-03 (antes F2-06) Agregar `equipo` + `dia/lugar` (multiples valores) en modal, store, sheet y tarjeta.
- [ ] P2-04 (antes F2-07) En la tarjeta, mostrar `equipo` con circulo de dos colores.

## Fase 3 - Dificil

- [ ] F3-01 Balance tactico DEF/ATT: si hay 2 DEF o 2 ATT, intentar 1 por equipo como regla fuerte.
- [ ] F3-02 Soporte de suplentes: 10 titulares + 1 o 2 suplentes (en gris) y salida/copia clara.
- [ ] F3-03 Regla social avanzada: avoid mutuo = restriccion dura, avoid unilateral = penalizacion blanda.
- [ ] F3-04 En modal, mostrar relaciones inversas (quien te quiere / quien te evita) con estilo de baja opacidad.
- [ ] F3-05 Generar segunda opcion de armado (Plan B) con explicacion completa y UI debajo de `Copy Teams`.
- [ ] F3-06 Permitir partidos con tamano variable sin romper balanceador (con y sin suplentes).
- [ ] F3-07 Guardar historial de equipos/partidos en otra pestana del Sheet (investigar complejidad tecnica).

## Backlog (low priority)

- [ ] B-01 Auth/roles para edicion (por ahora no prioritario).
- [ ] B-02 Tests automaticos del generador/store (por ahora backlog).
- [ ] B-03 Preparar app para multi-grupo/multi-liga (hoy uso personal).
- [ ] B-04 Definir alcance a mediano plazo (seguir personal o abrir a mas grupos).
- [ ] B-05 Aclarar requisito pendiente "sugerencia #1 no entendida" y convertirlo en item tecnico concreto.
- [ ] B-06 Aclarar requisito pendiente "pregunta #10 no entendida" y convertirlo en item tecnico concreto.
