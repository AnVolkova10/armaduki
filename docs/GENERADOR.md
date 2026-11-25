# El generador de equipos

Cómo arma armaduki los dos equipos de 5, cómo era el fallback antes de la revisión de noviembre de 2026 y qué se podría mejorar. El código está en `src/services/teamGenerator.ts` y los tests, en `tests/teamGenerator.test.ts`.

## En una frase

Prueba todos los repartos posibles de lxs 10 elegidxs en dos equipos de 5 (son 126), descarta los que rompen alguna regla y se queda con el más parejo.

## Paso a paso

1. Entran exactamente 10 jugadorxs.
2. Se arman los 126 repartos posibles.
3. Cada reparto se controla contra las reglas fuertes:
   - **Avoids:** dos que se evitan no van en el mismo equipo.
   - **Wants mutuos:** si dos se quieren mutuamente, van juntxs. Los wants de un solo lado no son regla sino preferencia (ver el score).
   - **GK y DEF:** máximo 1 GK y 2 DEF por equipo. Si hay exactamente 2 DEF, va unx a cada lado.
   - **ATT:** la diferencia de ATT entre equipos es como mucho 1.
   - **Arquerx de emergencia:** un equipo sin GK necesita al menos 2 jugadorxs que atajen (`good` o `low`).
   - **Owner bias:** la dueña de la app (`VITE_OWNER_ID`) va al equipo con menos Power, o con el mismo.
4. A cada reparto que cumple todo se le calcula un score (abajo).
5. El de mayor score es el resultado. El segundo es la «Second Option», con la diferencia contra el primero.
6. Si dos repartos empatan en score, gana el de mayor social satisfaction, después el de menor diferencia de rating y por último un orden fijo por ids. La misma selección da siempre el mismo resultado.

## El score

Arranca en 100 y resta lo desparejo:

- **Rating:** −10 por cada punto de diferencia entre la suma de ratings de cada equipo.
- **Atributos:** cada jugadorx suma por atributo según su nivel (alto / medio / bajo):
  - físicos, pace y stamina: +2 / 0 / −2;
  - técnicos, shooting, control, passing y defense: +1,5 / 0 / −1;
  - mentales, vision y grit: +1 / 0 / −0,5.

  Se resta 5 por cada punto de diferencia, sumando los 8 atributos.
- **Extra:** −10 por punto de diferencia en pace, −8 en stamina y −5 en defense. Estos tres cuentan dos veces a propósito, para que pesen más.
- **Arquerxs:** en un equipo sin GK, +4 por cada `good` y −12 por cada arquerx que falte para llegar a 2.
- **ATT:** −6 por cada ATT de diferencia. Si hay 5 ATT o más y un equipo tiene más, +6 si ese equipo tiene DEF y −8 si no.
- **Wants de un solo lado:** −15 por cada uno que queda en equipos distintos (lo mismo que 1,5 puntos de diferencia de rating). El número es la constante `ONE_WAY_WANT_PENALTY`.

El **Power** de un equipo, que usa el owner bias, es la suma de ratings más la suma de atributos.

Desde el Sprint 5, el generador devuelve el análisis también como datos (`report`, además del texto de siempre), y la app arma las frases con ellos, en inglés o en castellano. El análisis empieza con frases y muestra la cuenta línea por línea, solo con lo que movió el score (lo que no sumó ni restó se nombra en una frase); muestra también el balance de cada atributo, lxs arquerxs, el reparto de ATT y la **social satisfaction**: el porcentaje de wants y avoids cumplidos. La social satisfaction no suma al score, pero desempata. Si hay wants de un solo lado, el análisis dice cuántos se respetaron y cuáles se rompieron. La etiqueta «balanced» mira solo lo parejo de los equipos y no descuenta los wants rotos.

## Cuando ningún reparto cumple todo (fallback)

### Antes de la revisión (v1, hasta el 13/11/2026)

1. **Social-hard.** Buscaba repartos que cumplieran avoids, wants, owner bias y el spread de ATT/DEF, y elegía el de mejor score. Los límites de GK y DEF no se miraban, y la falta de arquerx de emergencia solo restaba puntos.
2. **Snake.** Si tampoco había, ordenaba a lxs 10 por rating + pace + control y lxs repartía 1-2-2-1, sin mirar ninguna regla, ni siquiera los avoids.

La revisión encontró dos problemas:

- Con 3 GK, podía dejar las 3 en el mismo equipo, porque no comparaba cuántos límites se rompían.
- El snake podía juntar a dos que se evitan aunque hubiera un reparto que lxs separaba. En una simulación con datos realistas pasó en 351 de 942 fallbacks.

### Ahora

Un solo paso: entre los 126 repartos elige el que rompe menos reglas, en este orden de importancia:

1. avoids;
2. wants mutuos;
3. owner bias;
4. spread de ATT/DEF;
5. límites de GK y DEF, y arquerx de emergencia.

Si empatan, gana el de mejor score.

- Si existe un reparto social-hard, sigue siendo el elegido, como antes, pero ahora con la menor cantidad posible de límites rotos: con 3 GK reparte 2/1.
- Un avoid solo se rompe si no hay ningún reparto que lo respete.
- El análisis suma un bloque «Fallback» con el motivo (por ejemplo, «3 GK selected» o una cadena de wants mutuos de más de 5) y qué regla se rompió, con nombres. En pantalla (Sprint 5) va arriba del resultado: primero por qué, después qué se rompió y con quién, y qué reglas se mantuvieron. Si no hay una causa única, empieza por lo que se rompió.

Cuando hay solución estricta, el resultado es idéntico al de antes de la revisión: se comparó contra la versión anterior en 6000 grupos al azar.

Desde el Sprint 2 (19/11/2026), los wants de un solo lado no traban: una cadena de 6 de un solo lado ya no lleva al fallback. Sin wants de un solo lado, el resultado es idéntico al de antes del Sprint 2, en estricto y en fallback (comparado en 4500 grupos al azar).

Este orden lo propuso Claude en la revisión y Ángela lo aprobó el 19/11/2026.

## Ideas para mejorarlo

Charladas con Ángela el 19/11/2026. Lo que se hace está en el Sprint 2 del TODO; lo que espera decisión, en «Cosas por cerrar».

- **Wants de un solo lado: hecho (Sprint 2).** Antes pesaban igual que los mutuos, así que una cadena de 6 (A quiere a B, B a C…) obligaba al fallback. Ahora los mutuos siguen estrictos y los de un solo lado restan 15 puntos si se rompen. El 15 se puede ajustar.
- **Social satisfaction como desempate: hecho (Sprint 2).** Con los wants de un solo lado ya en el score, cambia pocos resultados.
- **Owner bias: sigue como está,** como regla fuerte y con Power.
- **Pesos del score: con resultados.** Están elegidos a mano; se ajustan cuando el historial guarde quién ganó cada partido (Sprint 9).
- **Rating y atributos: propuesta pendiente.** Los ratings coinciden con el sugerido por los atributos, así que el nivel cuenta dos veces: en el rating y en los atributos. La propuesta es esperar los resultados y entonces probar que los atributos midan solo el estilo (que la velocidad o la defensa no queden todas del mismo lado). Sin resultados se pueden comparar fórmulas, pero no saber cuál arma mejores partidos.
- **Posiciones.** FLEX es comodín: defiende, ataca y a veces ataja. MID juega en el medio, más defensiva que ofensiva. Lo ideal por equipo suele ser GK, DEF, 2 MID y ATT.
  - **Formación ideal: no se agrega (19/11).** Con los roles de hoy no sería un buen criterio. Se puede repensar con los varios roles.
  - **Varios roles por jugadorx en vez de FLEX: Sprint 6.** Antes hay que decidir si las reglas cuentan el rol principal o el puesto que le toca en el equipo.
- **Variedad: más adelante** (backlog): «otro reparto» entre los casi iguales, o no repetir los equipos de la última fecha.
- **Bonus por mismo equipo:** Sprint 10.
- **Suplentes y otros tamaños** (backlog): con 12 o 14 jugadorxs hay más repartos para probar, pero sigue siendo rápido.
