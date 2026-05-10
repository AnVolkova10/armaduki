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

## Fase 3 - Contrato unico de Sheets y nuevos campos

- [x] F2-04.0 Auditar App Script actual contra headers reales de `db`: `id`, `name`, `nickname`, `role`, `rating`, `avatar`, `gkWillingness`, `wantsWith`, `avoidsWith`, `attributes`.
- [x] F2-04.0.1 Definir schema unico de `db` para no tocar Excel dos veces: campos actuales + `shirtNumber`, `primaryTeam`, `teams`, `groups`, `availability`, `birthYear`, `secondaryRole`, `active`, `notes`.
- [x] F2-04.0.1.1 Migrar nombre de pestana `db` a `Players` desde App Script: si existe `Players` usarla, si solo existe `db` renombrarla, si no existe ninguna crear `Players`. Codigo local preparado en `apps-script/Code.gs`; deploy/run probado contra Apps Script.
- [x] F2-04.0.2 Definir schema de pestana `Teams`: `teamId`, `name`, `color1`, `color2`, `crest`.
- [x] F2-04.0.2.1 Definir schema de pestana `Groups`: `groupId`, `name`, `place`, `notes`.
- [x] F2-04.0.3 Definir schema de pestana `RelationshipHistory`: `sourceId`, `targetId`, `wantsCount`, `avoidsCount`, `updatedAt`.
- [x] F2-04.0.4 Definir schema de pestana `MatchHistory`: `matchId`, `createdAt`, `selectedIds`, `team1Ids`, `team2Ids`, `score`, `stage`, `socialSatisfactionPct`, `isTest`.
- [x] F2-04.0.5 Actualizar App Script con helper `ensureSchema()` que cree pestanas faltantes y agregue columnas faltantes automaticamente sin borrar datos existentes.
- [x] F2-04.0.6 Agregar accion App Script `action=migrateSchema` para correr migracion controlada desde URL/script antes de depender de columnas nuevas.
- [x] F2-04.0.7 Corregir App Script para que `update` preserve valores existentes si el payload no trae una columna nueva, en vez de vaciar celdas faltantes.
- [x] F2-04.0.8 Corregir App Script para buscar la columna `id` por header normalizado y no asumir que siempre es la primera columna.
- [x] F2-04.0.9 Mantener backward compatibility: si faltan columnas/pestanas, la app sigue leyendo jugadores actuales y usa defaults seguros.
- [ ] F2-04.0.10 Documentar paso de deploy de App Script despues de cambiar el codigo del web app.
- [ ] F2-04.1 Agregar a tipos `shirtNumber?: string`, `primaryTeam?: string`, `teams: string[]`, `groups: string[]`, `availability: string[]`, `birthYear?: string`, `secondaryRole?: Role`, `active?: boolean`, `notes?: string`.
- [ ] F2-04.2 Actualizar parser de Sheets para leer campos nuevos aunque falten columnas.
- [ ] F2-04.3 Actualizar payloads `add`/`update` para enviar campos nuevos sin romper datos viejos.
- [ ] F2-04.4 Documentar columnas nuevas requeridas en Sheet/App Script.
- [ ] F2-05.1 Agregar `numero de camiseta` al modal.
- [ ] F2-05.2 Agregar `equipo` con multiples valores al modal.
- [ ] F2-05.3 Agregar `grupo/cancha habitual` y `dia/lugar` con multiples valores al modal.
- [x] F2-05.4 Actualizar labels del modal de arquero a `good`, `low`, `no`.
- [ ] F2-05.5 Mostrar camiseta en tarjeta sin romper privacidad ni mobile.
- [ ] F2-05.6 Mostrar equipo en tarjeta.
- [ ] F2-05.7 Mostrar equipo con circulo/swatch de dos colores.
- [ ] F2-05.8 Agregar `anio de nacimiento` o edad calculada al modal solo si aporta al armado de partidos.
- [ ] F2-05.9 Agregar `segunda posicion` al modal como campo opcional.
- [ ] F2-05.10 Agregar `active` para ocultar jugadoras inactivas sin borrarlas.
- [ ] F2-05.11 Agregar `notes` como campo opcional de uso interno.

### Auditoria F2-04.0 - App Script y headers actuales

- Headers reales vistos en `db`: `id`, `name`, `nickname`, `role`, `rating`, `avatar`, `gkWillingness`, `wantsWith`, `avoidsWith`, `attributes`.
- Los headers actuales coinciden con el contrato que lee el frontend. `normalizeKey` en App Script y frontend permite que `gkWillingness` llegue como `gkwillingness`.
- `gkWillingness` todavia tiene valores legacy `yes` en la Sheet; el frontend ya los lee como `good`, asi que no bloquea.
- `doGet` actual siempre lee `db`; para Phase 2 va a hacer falta soportar acciones/pestanas nuevas como `readTeams`, `readRelationshipHistory` y eventualmente `readMatchHistory`.
- `doPost update` arma una fila completa desde headers y pone `""` si el payload no trae una columna. Riesgo: al agregar columnas nuevas, un update viejo puede vaciar datos no enviados.
- `delete` y `update` buscan el id con `row[0]`; funciona hoy porque `id` esta en la primera columna, pero conviene buscar la columna `id` por header normalizado.
- No existe migracion automatica de schema: hoy si falta una columna o pestana hay que tocar Sheets manualmente.
- Proximo paso tecnico antes de campos nuevos: implementar App Script idempotente con `ensureSchema()` + `migrateSchema`, preservar valores existentes en updates y crear columnas/pestanas faltantes sin borrar datos.

### Schema F2-04.0.1 - `db`

- Nombre canonico de la pestana: `Players`. La pestana legacy `db` queda solo como alias de migracion.
- Orden canonico de columnas: `id`, `name`, `nickname`, `role`, `rating`, `avatar`, `gkWillingness`, `wantsWith`, `avoidsWith`, `attributes`, `shirtNumber`, `primaryTeam`, `teams`, `groups`, `availability`, `birthYear`, `secondaryRole`, `active`, `notes`.
- La migracion de App Script debe agregar columnas faltantes al final y no reordenar columnas existentes para evitar riesgo sobre la Sheet actual.
- `id`: requerido, string/numerico estable. No se renumera cuando se borra o agrega gente.
- `name`: opcional, texto libre con tildes preservadas.
- `nickname`: requerido para que la fila sea valida.
- `role`: requerido, enum `GK | FLEX | DEF | MID | ATT`; default seguro `FLEX`.
- `rating`: requerido, numero `1..10`; default seguro `5`.
- `avatar`: opcional, URL o data URL.
- `gkWillingness`: enum `good | low | no`; legacy `yes` se lee como `good`; default seguro `no`.
- `wantsWith`: opcional, IDs separados por pipe, ejemplo `10|14|22`; vacio significa sin wants.
- `avoidsWith`: opcional, IDs separados por pipe; vacio significa sin avoids.
- `attributes`: JSON string con `shooting`, `control`, `passing`, `defense`, `pace`, `vision`, `grit`, `stamina`; cada valor es `high | mid | low`; si falta o es invalido, default `mid`.
- `shirtNumber`: opcional, string para permitir numeros especiales o vacio; no participa del algoritmo.
- `primaryTeam`: opcional, un solo `teamId` que representa el equipo principal actual de la jugadora. Si esta vacio, no hay equipo principal.
- `teams`: opcional, `teamId`s separados por pipe, ejemplo `armaduki|femix|las-pibas`; depende de la pestana `Teams`. Una jugadora puede no tener equipo, puede tener mas de dos equipos, y `primaryTeam` deberia estar incluido en `teams` cuando exista.
- `groups`: opcional, `groupId`s separados por pipe, ejemplo `segurola|palermo`; representa grupos/canchas habituales donde suele jugar. Una jugadora puede no tener grupo.
- `availability`: opcional, tokens/labels separados por pipe para dia/lugar, ejemplo `martes|jueves-noche`; sirve para disponibilidad, no para identidad del grupo/cancha.
- `birthYear`: opcional, string de 4 digitos; se prefiere anio de nacimiento antes que edad fija para no quedar desactualizado.
- `secondaryRole`: opcional, enum `GK | FLEX | DEF | MID | ATT`; vacio significa sin segunda posicion.
- `active`: opcional, boolean/string; default `true` si esta vacio o falta para no ocultar jugadoras existentes.
- `notes`: opcional, texto libre interno; no se muestra en cards ni afecta generador por ahora.

### Migracion F2-04.0.1.1 - `db` a `Players`

- App Script debe reemplazar `SHEET_NAME = 'db'` por constantes por pestana: `PLAYERS_SHEET_NAME = 'Players'`, `LEGACY_PLAYERS_SHEET_NAME = 'db'`, `TEAMS_SHEET_NAME = 'Teams'`, `GROUPS_SHEET_NAME = 'Groups'`, `RELATIONSHIP_HISTORY_SHEET_NAME = 'RelationshipHistory'`, `MATCH_HISTORY_SHEET_NAME = 'MatchHistory'`.
- `getPlayersSheet()` debe resolver asi: usar `Players` si existe; si no existe y existe `db`, renombrar `db` a `Players`; si no existe ninguna, crear `Players` con headers canonicos.
- La app/frontend no deberia depender del nombre de la pestana, solo de las respuestas del App Script.
- Despues de migrar, no volver a crear ni escribir en `db`.

### Schema F2-04.0.2 - `Teams`

- Nombre canonico de la pestana: `Teams`.
- Orden canonico de columnas: `teamId`, `name`, `color1`, `color2`, `crest`.
- `teamId`: requerido, string estable en kebab-case o slug simple, ejemplo `armaduki`, `femix`, `las-pibas`. Es el valor que se guarda en `Players.teams`.
- `name`: requerido, nombre visible del equipo, con tildes preservadas si corresponde.
- `color1`: opcional, color principal en hex, ejemplo `#e9252a`; default visual si falta: rojo Armaduki.
- `color2`: opcional, color secundario en hex para swatch/circulo de dos colores; si falta, se usa `color1`.
- `crest`: opcional, URL/data URL/emoji corto para escudo o identificador visual del equipo.
- `Players.primaryTeam` guarda el `teamId` principal actual, y `Players.teams` guarda multiples `teamId` separados por pipe, ejemplo `armaduki|femix|las-pibas`.
- Si un `teamId` aparece en `Players.teams` pero no existe en `Teams`, la app debe mostrar el id como texto simple y no romper filtros ni cards.
- La migracion de App Script debe crear `Teams` con headers si no existe, pero no necesita cargar equipos iniciales automaticamente.
- Todas las columnas salvo `teamId` y `name` son opcionales para empezar simple.
- Posibles columnas futuras si hacen falta: `shortName`, `category`, `homePlace`, `notes`, `sortOrder`, `active`.

### Schema F2-04.0.2.1 - `Groups`

- Nombre canonico de la pestana: `Groups`.
- Orden canonico de columnas: `groupId`, `name`, `place`, `notes`.
- `groupId`: requerido, string estable en kebab-case o slug simple, ejemplo `segurola`, `palermo`, `villa-urquiza`.
- `name`: requerido, nombre visible del grupo/cancha habitual, ejemplo `Canchita de Segurola`.
- `place`: opcional, texto libre para ubicacion/cancha habitual. Varios grupos pueden compartir el mismo lugar.
- `notes`: opcional, texto libre interno.
- `Players.groups` guarda multiples `groupId` separados por pipe, ejemplo `segurola|palermo`.
- Una jugadora puede pertenecer a varios grupos. `Groups` existe principalmente para filtrar jugadoras por grupo/cancha habitual en People y Match.
- Si un `groupId` aparece en `Players.groups` pero no existe en `Groups`, la app debe mostrar el id como texto simple y no romper filtros ni cards.
- `Groups` representa pertenencia/habito de juego, no disponibilidad. Ejemplo: suele jugar en `Canchita de Segurola`; para dias/horarios sigue existiendo `Players.availability`.
- La migracion de App Script debe crear `Groups` con headers si no existe, pero no necesita cargar grupos iniciales automaticamente.
- Posibles columnas futuras si hacen falta: `shortName`, `city`, `zone`, `sortOrder`, `active`.

### Schema F2-04.0.3 - `RelationshipHistory`

- Nombre canonico de la pestana: `RelationshipHistory`.
- Orden canonico de columnas: `sourceId`, `targetId`, `wantsCount`, `avoidsCount`, `updatedAt`.
- `sourceId`: requerido, `Players.id` de la jugadora que define la relacion.
- `targetId`: requerido, `Players.id` de la jugadora relacionada.
- El par `sourceId -> targetId` es dirigido. `10 -> 14` y `14 -> 10` son relaciones historicas distintas.
- Debe haber como maximo una fila por par dirigido `sourceId + targetId`.
- `wantsCount`: entero >= 0; default `0` si falta o esta vacio.
- `avoidsCount`: entero >= 0; default `0` si falta o esta vacio. `noWants` se modela como `avoids` para mantener el lenguaje actual de la app.
- `updatedAt`: timestamp ISO/string de la ultima vez que se incremento `wantsCount` o `avoidsCount`.
- `RelationshipHistory` es historial acumulado, no fuente de verdad de relaciones actuales. Las relaciones actuales siguen viviendo en `Players.wantsWith` y `Players.avoidsWith`.
- App Script debe incrementar el contador solo cuando en un `update`/`add` aparece una relacion nueva que antes no estaba para ese `sourceId`.
- Si una relacion se elimina, no se decrementa el contador historico.
- Si una relacion cambia de want a avoid, se incrementa `avoidsCount` si ese avoid es nuevo; el `wantsCount` historico queda como estaba.
- Si la pestana no existe o esta vacia, el selector de Wants/Avoids debe funcionar igual con historial vacio.
- La migracion de App Script debe crear `RelationshipHistory` con headers si no existe, pero no debe generar filas historicas falsas desde el estado actual.

### Schema F2-04.0.4 - `MatchHistory`

- Nombre canonico de la pestana: `MatchHistory`.
- Orden canonico de columnas: `matchId`, `createdAt`, `selectedIds`, `team1Ids`, `team2Ids`, `score`, `stage`, `socialSatisfactionPct`, `isTest`.
- `matchId`: requerido, id unico del registro. Puede ser timestamp ISO compacto o UUID generado por App Script/frontend.
- `createdAt`: requerido, timestamp ISO/string de cuando se guardo el partido.
- `selectedIds`: requerido, `Players.id`s seleccionados separados por pipe, ejemplo `10|14|22|31|40|...`.
- `team1Ids`: requerido, IDs de Team 1 separados por pipe, en el orden mostrado/copied.
- `team2Ids`: requerido, IDs de Team 2 separados por pipe, en el orden mostrado/copied.
- `score`: requerido si existe resultado generado; numero del score de analisis guardado.
- `stage`: requerido si existe resultado generado; enum actual `STRICT | RELAXED_UNILATERAL | RELAXED_MUTUAL | FALLBACK`.
- `socialSatisfactionPct`: requerido si existe resultado generado; numero `0..100`.
- `isTest`: boolean/string; `true` para pruebas de armado, `false` para partido real/final. Default seguro `true` si falta, para no contar pruebas como partidos reales por accidente.
- `MatchHistory` es historico de equipos generados, separado de `RelationshipHistory`.
- Guardar historial no debe cambiar el generador ni las relaciones actuales.
- Decision pendiente para F2-11.4: como resolver en UI si se guarda automaticamente como test, con boton explicito, o con acciones tipo `Save as test` / `Save as real match`.
- La migracion de App Script debe crear `MatchHistory` con headers si no existe, pero no debe crear filas iniciales.

### Implementacion F2-04.0.5 - `ensureSchema()`

- `apps-script/Code.gs` define headers canonicos para `Players`, `Teams`, `Groups`, `RelationshipHistory` y `MatchHistory`.
- `ensureSchema()` crea pestanas faltantes y agrega columnas faltantes al final de cada header.
- No reordena columnas existentes y no borra datos existentes.
- `readPlayers()` y `doPost()` llaman `ensureSchema()` antes de leer/escribir para mantener backward compatibility.
- Para que el schema nuevo no provoque perdida de datos, tambien se implemento F2-04.0.7/F2-04.0.8: `update` preserva celdas existentes no enviadas y `delete/update` buscan `id` por header normalizado.
- Validacion manual pendiente al deployar Apps Script: correr `?action=migrateSchema`, confirmar que existen las pestanas nuevas y que `Players` conserva sus datos con columnas nuevas al final. Despues correr `?action=read` para confirmar que la app sigue devolviendo jugadoras.

### Implementacion F2-04.0.6 - `migrateSchema`

- `apps-script/Code.gs` expone `action=migrateSchema` por GET y POST.
- La accion corre `ensureSchema()` de forma explicita y devuelve un JSON con `ok`, `action` y nombres de pestanas resultantes.
- Esta accion es el paso manual recomendado despues de deployar App Script y antes de depender de columnas nuevas desde la UI.

### Implementacion F2-04.0.9 - backward compatibility

- `apps-script/Code.gs` mantiene compatibilidad con Sheet vieja: si falta `Players` usa/renombra `db`; si faltan pestanas o columnas nuevas, las crea/agrega sin borrar datos.
- `src/store/useAppStore.ts` parsea filas viejas aunque falten columnas opcionales y aplica defaults seguros: `role = FLEX`, `rating = 5`, `gkWillingness = no`, `wantsWith = []`, `avoidsWith = []`, `attributes = mid`.
- `gkWillingness = yes` sigue leyendo como `good` para datos legacy.
- Las filas sin `nickname` valido se siguen salteando para evitar jugadoras rotas en UI/generador.
- Los campos nuevos de Phase 2 todavia no se leen/escriben en frontend; eso queda para F2-04.1/F2-04.2/F2-04.3.

## Fase 4 - Filtros y orden

- [ ] F2-06.1 Agregar filtro por `equipo` en People.
- [ ] F2-06.2 Agregar filtro por `grupo/cancha habitual` y `dia/lugar` en People.
- [ ] F2-06.3 Agregar filtro por `equipo` en Match.
- [ ] F2-06.4 Agregar filtro por `grupo/cancha habitual` y `dia/lugar` en Match.
- [ ] F2-06.5 Agregar orden por camiseta/equipo/grupo/dia-lugar donde sume.
- [ ] F2-06.6 Revisar duplicacion de filtros entre People y Match; extraer helper solo si simplifica.

## Fase 5 - Historial de wants/noWants

- [ ] F2-07.1 Confirmar contrato de pestana `RelationshipHistory` definido en F2-04.0.3.
- [ ] F2-07.2 Crear lectura normalizada de `RelationshipHistory` con defaults si esta vacia.
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

- [ ] F2-11.1 Confirmar contrato de pestana `MatchHistory` definido en F2-04.0.4.
- [ ] F2-11.2 Guardar fecha/id, seleccionados, team1, team2, score, stage y social satisfaction.
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
- [ ] F2-12.7 Aclarar requisito pendiente "sugerencia #1 no entendida" y convertirlo en item tecnico concreto.
- [ ] F2-12.8 Aclarar requisito pendiente "pregunta #10 no entendida" y convertirlo en item tecnico concreto.

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
