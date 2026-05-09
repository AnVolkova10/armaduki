# Armaduki Phase 2 TODO

Estado: super TODO de Fase 2, ordenado para ejecutar de a un paso chico.

## Reglas de ejecucion

- [ ] Tomar solo 1 item por iteracion.
- [ ] No tocar otros modulos salvo dependencias directas del item.
- [ ] Al cerrar un item, probar en local antes de pasar al siguiente.
- [ ] Al cerrar cambios de codigo, anotar pasos cortos y simples de prueba manual.
- [ ] Disenar y validar siempre con enfoque mobile-first: layout, interacciones y legibilidad.
- [ ] Si un item requiere Sheet/App Script, actualizar primero el contrato de datos y confirmar backward compatibility.
- [ ] Mantener la UI mayormente en ingles por ahora.
- [ ] Antes de tocar el generador, dejar `npm run lint`, `npm run build` y prueba manual definida.

## Fase 0 - Baseline tecnico

- [x] F2-00.1 Arreglar lint de hooks en `PersonForm`: memoizacion de inverse wants/avoids.
- [x] F2-00.2 Arreglar lint de hooks en `PersonForm`: evitar `setState` sincronico en effect para GK.
- [x] F2-00.3 Arreglar lint de hooks en `PeoplePage`: dependencia faltante de `fetchPeople`/`people.length`.
- [x] F2-00.4 Arreglar lint de hooks en `PeoplePage` y `MatchPage`: privacidad sin `setState` sincronico en effect.
- [x] F2-00.5 Corregir encoding roto visible en footer y botones de atributos.
- [x] F2-00.6 Correr `npm run lint` y `npm run build`.
- [x] F2-00.7 Asegurar que el footer siempre quede visible abajo, incluso con poco contenido.
- [x] F2-00.8 Permitir cerrar modales con tecla Escape.

## Fase 1 - Reglas reales del generador

- [x] F2-01.1 Auditar README vs generador: stages de wants, regla emergency GK, max ATT, 3 GK y fallback.
- [x] F2-01.2 Decidir y documentar la regla real de emergency GK: cantidad requerida y si cuenta `low`.
- [x] F2-01.3 Decidir y documentar la regla real para 3 GK seleccionados.
- [x] F2-01.4 Alinear README con el comportamiento real confirmado.
- [x] F2-01.5 Ajustar semantica de goalkeeper: `good` suma plus porque le gusta atajar, `low` ataja pero mal, `no` no ataja.
- [x] F2-01.6 Incluir el plus/penalidad de goalkeeper en el score y en el analisis.
- [x] F2-01.7 Ajustar owner bias para usar `Power` y ATT con spread hard `abs(T1 ATT - T2 ATT) <= 1`.

### Auditoria F2-01.1 - README vs generador actual

- Wants stages: README describe `STRICT`, `RELAXED_UNILATERAL` y `RELAXED_MUTUAL`, pero `generateTeams` solo ejecuta `strict`; los modos relajados existen en helpers/tipos pero hoy son inalcanzables.
- Emergency GK: la auditoria original detecto que README decia `3` jugadores `gkWillingness: yes`; el codigo exige `2` jugadores capaces. Desde F2-01.5 cuenta `good + low` y lee datos legacy `yes` como `good`.
- Max ATT: la auditoria original detecto que README declaraba max `2 ATT` por team. El codigo no tiene hard max `2 ATT`; desde F2-01.7 exige spread hard `abs(T1 ATT - T2 ATT) <= 1` y mantiene ajuste soft para ordenar opciones validas.
- 3 GK seleccionados: el codigo valida max `1` GK por team. Con 3 GK de rol no puede existir split estricto valido en 2 equipos, entonces cae a fallback.
- Fallback: README dice fallback si fallan staged constraints; en codigo hay dos niveles: primero un fallback social-hard que conserva avoids + wants strict y relaja reglas no sociales, despues un snake split por power que ignora constraints si no existe split social-hard.
- Scoring: README dice que el score numerico usa rating + atributos, pero el codigo tambien suma ajustes soft de GK y ATT.

### Decisiones F2-01.2 / F2-01.3 - Reglas confirmadas

- Wants queda estricto. Si no hay solucion estricta, el algoritmo no debe relajar wants automaticamente antes de fallback.
- Emergency GK mantiene el algoritmo actual: si un team no tiene GK real, necesita jugadores capaces de ese lado. `good` y `low` cuentan como capaces; `no` no cuenta.
- `good`: cuenta como capaz y suma un plus chico porque ademas ataja bien o le gusta atajar.
- `low`: cuenta como capaz de emergencia, pero no suma plus y por ahora no penaliza.
- `no`: no cuenta como opcion de arquero.
- Si un team tiene GK real, la regla de emergency GK no aplica para ese team. En el resumen debe decir algo tipo "GK real presente, emergency keepers not needed" en vez de mezclar o contar posibles innecesariamente.
- Si un team no tiene GK real, el resumen debe mostrar claramente cuantos capaces tiene y si pasa/falla la regla.
- Si se seleccionan 3 GK de rol, no bloquear. Generar igual con warning claro porque es raro pero posible, y explicar si se uso fallback.
- ATT queda sin hard max `2 ATT`, pero con spread hard: diferencia maxima `1` entre equipos. Ejemplos: con `4 ATT` debe ser `2/2`; con `5 ATT` puede ser `2/3`.
- Owner bias usa `Power` (`rating + atributos ponderados`), no solo rating total.
- Fallback queda asi: primero social-hard con owner bias y ATT/DEF spread, despues snake split si no hay alternativa.
- Bonus por mismo equipo queda para mas adelante, despues de tener el campo `teams` cargado y visible.

## Fase 2 - Limpieza UX inmediata

- [x] F2-03.1 Reemplazar opcion `Clear All` por `Clear Links` en People.
- [x] F2-03.2 Reemplazar opcion `Clear All` por `Clear Links` en Match.
- [x] F2-03.3 Reemplazar confirmacion `Clear all links?` por copy consistente con `Clear Links`.
- [x] F2-03.4 Mantener `Clear Wants`, `Clear Avoids`, `Clear Filters` y `Clear Selection` sin cambiar comportamiento.
- [x] F2-03.5 Agregar el icono de la pelota rojo en la UI donde corresponda.
- [x] F2-03.6 Agregar indicador visual de color cuando la seleccion llega a 10/10.
- [x] F2-03.7 En lineups/resultados, mostrar la puntuacion de cada jugadora solo cuando el ojito/privacy mode esta apagado.
- [x] F2-09.1 Al generar equipos, crear un ref al bloque de resultado.
- [x] F2-09.2 Cuando aparece `generatedTeams`, hacer `scrollIntoView` hasta el resultado.
- [x] F2-09.3 Validar que el scroll no dispare si hay error o si se limpia la seleccion.

## Fase 3 - Nuevos campos de jugador

- [ ] F2-04.1 Agregar a tipos `shirtNumber?: string`, `teams: string[]`, `availability: string[]`.
- [ ] F2-04.2 Actualizar parser de Sheets para leer `shirtNumber`, `teams` y `availability` aunque falten columnas.
- [ ] F2-04.3 Actualizar payloads `add`/`update` para enviar campos nuevos.
- [ ] F2-04.4 Documentar columnas nuevas requeridas en Sheet/App Script.
- [ ] F2-05.1 Agregar `numero de camiseta` al modal.
- [ ] F2-05.2 Agregar `equipo` con multiples valores al modal.
- [ ] F2-05.3 Agregar `dia/lugar` con multiples valores al modal.
- [x] F2-05.4 Actualizar labels del modal de arquero a `good`, `low`, `no`.
- [ ] F2-05.5 Mostrar camiseta en tarjeta sin romper privacidad ni mobile.
- [ ] F2-05.6 Mostrar equipo en tarjeta.
- [ ] F2-05.7 Mostrar equipo con circulo/swatch de dos colores.

## Fase 4 - Filtros y orden

- [ ] F2-06.1 Agregar filtro por `equipo` en People.
- [ ] F2-06.2 Agregar filtro por `dia/lugar` en People.
- [ ] F2-06.3 Agregar filtro por `equipo` en Match.
- [ ] F2-06.4 Agregar filtro por `dia/lugar` en Match.
- [ ] F2-06.5 Agregar orden por camiseta/equipo/dia-lugar donde sume.
- [ ] F2-06.6 Revisar duplicacion de filtros entre People y Match; extraer helper solo si simplifica.

## Fase 5 - Historial de wants/noWants

- [ ] F2-07.1 Definir contrato de pestana `RelationshipHistory`.
- [ ] F2-07.2 Columnas: `sourceId`, `targetId`, `wantsCount`, `avoidsCount`, `updatedAt`.
- [ ] F2-07.3 Modelar `noWants` como `avoids` para mantener el lenguaje actual del app.
- [ ] F2-07.4 Agregar cliente `action=readRelationshipHistory`.
- [ ] F2-07.5 Documentar cambio requerido en App Script: al agregar un nuevo want/avoid, incrementar contador historico.
- [ ] F2-07.6 Definir comportamiento si el historial no existe todavia: selector funciona igual con historial vacio.

## Fase 6 - Selector searchable de relaciones

- [ ] F2-08.1 Agregar buscador al selector de Wants.
- [ ] F2-08.2 Agregar buscador al selector de Avoids.
- [ ] F2-08.3 Ordenar seleccionados primero.
- [ ] F2-08.4 Luego ordenar por historial del par `currentPlayer -> target`.
- [ ] F2-08.5 Si no hay historial del par, ordenar por popularidad global.
- [ ] F2-08.6 Si empatan, ordenar alfabeticamente por nickname.
- [ ] F2-08.7 Mantener hints de relaciones inversas actuales.
- [ ] F2-08.8 Validar mobile: listas scrolleables y botones legibles.

## Fase 7 - Bonus soft por equipo (mas adelante)

- [ ] F2-10.0 No iniciar esta fase hasta tener el campo `teams` cargado, visible y probado con datos reales.
- [ ] F2-10.1 Agregar scoring soft `+1` por cada pareja del mismo equipo dentro del mismo team.
- [ ] F2-10.2 No permitir que el bonus rompa avoids ni constraints fuertes.
- [ ] F2-10.3 Incluir el bonus en el breakdown de analisis.
- [ ] F2-10.4 Agregar test de mismo equipo que verifica que mejora score sin forzar split imposible.
- [ ] F2-10.5 Revisar si el peso `+1` es suficiente despues de probar datos reales.

## Fase 8 - Historial de partidos

- [ ] F2-11.1 Definir contrato de pestana `MatchHistory`.
- [ ] F2-11.2 Guardar fecha, seleccionados, team1, team2, score, stage y social satisfaction.
- [ ] F2-11.3 Agregar accion App Script para guardar historial al confirmar/generar.
- [ ] F2-11.4 Decidir si guardar automaticamente al generar o con boton explicito.
- [ ] F2-11.5 Mantener este historial separado de `RelationshipHistory`.

## Backlog posterior

- [ ] F2-12.1 Soporte de suplentes: 10 titulares + 1 o 2 suplentes en gris y salida/copia clara.
- [ ] F2-12.2 Permitir partidos con tamano variable sin romper balanceador.
- [ ] F2-12.3 Aplicacion para equipos de F6, F7, etc.
- [ ] F2-12.4 Auth/roles para edicion.
- [ ] F2-12.5 Preparar app para multi-grupo/multi-liga.
- [ ] F2-12.6 Definir alcance a mediano plazo: uso personal o abrir a mas grupos.
- [ ] F2-12.7 Agregar edades.
- [ ] F2-12.8 Permitir dos posiciones como alternativa a FLEX.
- [ ] F2-12.9 Aclarar requisito pendiente "sugerencia #1 no entendida" y convertirlo en item tecnico concreto.
- [ ] F2-12.10 Aclarar requisito pendiente "pregunta #10 no entendida" y convertirlo en item tecnico concreto.

## Criterios de cierre de Phase 2

- [ ] `npm run lint` pasa.
- [ ] `npm run build` pasa.
- [ ] QA manual de los cambios principales queda definido y probado.
- [ ] Campos nuevos leen y escriben contra Sheet sin romper jugadores existentes.
- [ ] Selector de Wants/Avoids es buscable y ordena por historial cuando existe.
- [ ] Generar equipos scrollea al resultado.
- [ ] Bonus de mismo equipo aparece en analisis y no rompe reglas fuertes.
- [ ] Footer queda siempre visible abajo.
- [ ] Modales cierran con Escape.
