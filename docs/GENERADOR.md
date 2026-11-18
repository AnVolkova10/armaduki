# El generador de equipos

Cómo arma armaduki los dos equipos de 5, cómo era el fallback antes de la revisión de noviembre de 2026 y qué se podría mejorar. El código está en `src/services/teamGenerator.ts` y los tests, en `tests/teamGenerator.test.ts`.

## En una frase

Prueba todos los repartos posibles de las 10 elegidas en dos equipos de 5 (son 126), descarta los que rompen alguna regla y se queda con el más parejo.

## Paso a paso

1. Entran exactamente 10 jugadoras.
2. Se arman los 126 repartos posibles.
3. Cada reparto se controla contra las reglas fuertes:
   - **Avoids:** dos que se evitan no van en el mismo equipo.
   - **Wants:** si una quiere jugar con otra, van juntas. Es estricto aunque el want sea de un solo lado.
   - **GK y DEF:** máximo 1 GK y 2 DEF por equipo. Si hay exactamente 2 DEF, va una a cada lado.
   - **ATT:** la diferencia de ATT entre equipos es como mucho 1.
   - **Arquera de emergencia:** un equipo sin GK necesita al menos 2 jugadoras que atajen (`good` o `low`).
   - **Owner bias:** la dueña de la app (`VITE_OWNER_ID`) va al equipo con menos Power, o con el mismo.
4. A cada reparto que cumple todo se le calcula un score (abajo).
5. El de mayor score es el resultado. El segundo es la «Second Option», con la diferencia contra el primero.
6. Si dos repartos empatan en score, gana el de menor diferencia de rating y después un orden fijo por ids. La misma selección da siempre el mismo resultado.

## El score

Arranca en 100 y resta lo desparejo:

- **Rating:** −10 por cada punto de diferencia entre la suma de ratings de cada equipo.
- **Atributos:** cada jugadora suma por atributo según su nivel (alto / medio / bajo):
  - físicos, pace y stamina: +2 / 0 / −2;
  - técnicos, shooting, control, passing y defense: +1,5 / 0 / −1;
  - mentales, vision y grit: +1 / 0 / −0,5.

  Se resta 5 por cada punto de diferencia, sumando los 8 atributos.
- **Extra:** −10 por punto de diferencia en pace, −8 en stamina y −5 en defense. Estos tres cuentan dos veces a propósito, para que pesen más.
- **Arqueras:** en un equipo sin GK, +4 por cada `good` y −12 por cada arquera que falte para llegar a 2.
- **ATT:** −6 por cada ATT de diferencia. Si hay 5 ATT o más y un equipo tiene más, +6 si ese equipo tiene DEF y −8 si no.

El **Power** de un equipo, que usa el owner bias, es la suma de ratings más la suma de atributos.

El análisis muestra esta cuenta completa, el balance de cada atributo, las arqueras, el reparto de ATT y la **social satisfaction**: el porcentaje de wants y avoids cumplidos. La social satisfaction no suma al score; solo se muestra.

## Cuando ningún reparto cumple todo (fallback)

### Antes de la revisión (v1, hasta el 13/11/2026)

1. **Social-hard.** Buscaba repartos que cumplieran avoids, wants, owner bias y el spread de ATT/DEF, y elegía el de mejor score. Los límites de GK y DEF no se miraban, y la falta de arquera de emergencia solo restaba puntos.
2. **Snake.** Si tampoco había, ordenaba a las 10 por rating + pace + control y las repartía 1-2-2-1, sin mirar ninguna regla, ni siquiera los avoids.

La revisión encontró dos problemas:

- Con 3 GK, podía dejar las 3 en el mismo equipo, porque no comparaba cuántos límites se rompían.
- El snake podía juntar a dos que se evitan aunque hubiera un reparto que los separaba. En una simulación con datos realistas pasó en 351 de 942 fallbacks.

### Ahora

Un solo paso: entre los 126 repartos elige el que rompe menos reglas, en este orden de importancia:

1. avoids;
2. wants;
3. owner bias;
4. spread de ATT/DEF;
5. límites de GK y DEF, y arquera de emergencia.

Si empatan, gana el de mejor score.

- Si existe un reparto social-hard, sigue siendo el elegido, como antes, pero ahora con la menor cantidad posible de límites rotos: con 3 GK reparte 2/1.
- Un avoid solo se rompe si no hay ningún reparto que lo respete.
- El análisis suma un bloque «Fallback» con el motivo (por ejemplo, «3 GK selected» o una cadena de wants de más de 5) y qué regla se rompió, con nombres.

Cuando hay solución estricta, el resultado es idéntico al de antes: se comparó contra la versión anterior en 6000 grupos al azar.

Este orden lo propuso Claude en la revisión y está en «Cosas por cerrar» del TODO.

## Ideas para mejorarlo (Propuestas)

Para charlar en el Sprint 2; ninguna está hecha.

- **Wants de un solo lado.** Hoy pesan igual que los mutuos, así que una cadena de 6 (A quiere a B, B a C…) obliga al fallback. Opción: mutuos estrictos y los de un solo lado como preferencia, con puntos. La v1 tenía modos así sin usar; se quitaron en la revisión.
- **Owner bias.** Hoy es una regla fuerte. Podría restar puntos en vez de prohibir, o tener un switch para apagarla.
- **Pesos del score.** Están elegidos a mano. Con el historial de partidos (Sprint 9) y quién ganó cada uno, se podrían ajustar.
- **Rating y atributos se superponen.** El rating ya resume el nivel y los atributos lo vuelven a sumar. Ver si conviene pesarlos distinto o usar el rating sugerido del modal.
- **Variedad.** La misma selección da siempre el mismo reparto. Opciones: «otro reparto» entre los casi iguales, o evitar repetir los equipos de la última fecha, con el historial.
- **Posiciones.** FLEX y MID no tienen reglas. La segunda posición (Sprint 6) podría servir, por ejemplo para una DEF que también juega de MID.
- **Social satisfaction.** Podría desempatar entre repartos igual de parejos.
- **Bonus por mismo equipo:** ya está planeado en el Sprint 10.
- **Suplentes y otros tamaños** (backlog): con 12 o 14 jugadoras hay más repartos para probar, pero sigue siendo rápido.
