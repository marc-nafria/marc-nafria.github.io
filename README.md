# Acordes · guitarra y piano

Web de práctica para el móvil: un acorde a pantalla completa, sus posiciones de
guitarra y sus inversiones de piano, con sonido. Sin nombre, sin cuentas, sin
backend y sin dependencias: HTML, CSS y JavaScript planos.

## Publicar en GitHub Pages

```bash
git init
git add .
git commit -m "feat: add chord practice web app for guitar and piano"
git branch -M main
git remote add origin https://github.com/USUARIO/REPO.git
git push -u origin main
```

Después, en el repositorio: **Settings → Pages → Source: Deploy from a branch →
Branch: `main` / `(root)`**. En un par de minutos queda en
`https://USUARIO.github.io/REPO/`.

El afinador (cuando se añada) necesita HTTPS para acceder al micrófono; GitHub
Pages ya sirve por HTTPS, así que funciona. En local, `file://` vale para todo
menos para el micrófono: para eso arranca un servidor,
`python -m http.server 8000`.

## Qué hay ahora

`index.html` — una sola pantalla, en tres capas:

**Arriba, fijo: el acorde, que además es el mando.** Está partido en dos piezas
pulsables: la **fundamental** en blanco y la **extensión** en beige. Cada una
abre su propio panel deslizante, con las opciones entrando en cascada. Cualquier
cambio — acorde, extensión o inversión — **sale y entra desenfocado**.
Como el acorde mayor no lleva sufijo, su hueco de extensión se pinta como
**fantasma** (`may` al 32%): se lee como campo editable, no como parte del nombre.

**En medio: el instrumento, a pantalla completa.** Se pasa de guitarra a piano
**deslizando en horizontal**, con enganche por panel; con el teclado, flechas
izquierda y derecha, y en el escritorio pulsando las dos barritas de abajo. No
hay scroll vertical: todo cabe en pantalla, y el diagrama ocupa todo el hueco
libre. La profundidad no la da ningún adorno: el plano que se desliza es un poco
más claro que el fondo y lleva su propia luz, las capas fijas son cristal oscuro
desenfocado, y cada una proyecta su sombra sobre lo que pasa por debajo.

- **Guitarra**: solo la figura del acorde, lo más grande que quepa —
  digitación (1 índice · 2 medio · 3 anular · 4 meñique), **cejilla como barra**
  cuando un mismo dedo pisa varias cuerdas, `×` en las silenciadas, `○` en las
  que van al aire (en beige si son la fundamental), traste de partida y los
  nombres de las seis cuerdas.
- **Piano**: un teclado **por mano**, y cada mano hace su papel, como al tocar
  de verdad. La **izquierda** lleva el bajo de la inversión con su patrón —
  bajo y octava en las tríadas, bajo y séptima (el *shell* del jazz) en los
  acordes de séptima, bajo y quinta en los power chords. La **derecha** lleva
  el acorde, reducido a lo que cabe en una mano: si sobran notas suelta la
  fundamental (que ya suena abajo), la quinta y la novena, por ese orden. La
  digitación va dentro de cada círculo (`L5 L1` · `R1 R2 R3 R5`, 1 pulgar …
  5 meñique) y el nombre de la nota debajo de cada tecla.
- Tocar un diagrama suena; en el piano, cada tecla por separado.

**Abajo, fijo: la posición.** En guitarra recorre todas las formas conocidas
(abierta primero, luego las cejillas de menor a mayor traste); en piano, las
**inversiones**. Y ahí es donde aparece el **cifrado con bajo**, que es lo que
una inversión es de verdad: `C` → `C/E` → `C/G`. En guitarra se calcula a partir
de la cuerda más grave que suena en cada posición.

Recuerda el último acorde y el instrumento. Con el manifest incluido se puede
**añadir a la pantalla de inicio** y se abre sin barras del navegador.

## Estructura

```
index.html          aplicación de práctica (la que se publica)
manifest.webmanifest  para añadir a la pantalla de inicio
icon.svg            icono
css/practice.css    tema neutro: negro, blanco cálido y beige
js/theory.js        modelo musical: notas, escalas, acordes, cifrado
js/audio.js         síntesis Web Audio (piano y guitarra), clics, tonos
js/piano.js         teclado SVG
js/fretboard.js     mástil SVG y diagramas de acorde
js/shapes.js        posiciones abiertas + plantillas móviles (cejillas/CAGED)
js/practice.js      la pantalla de práctica

data/chords.json    LOS DATOS: acordes, formas y reglas, editable en GitHub
js/config.js        carga y valida el archivo de datos
tests/              tests en Node, sin dependencias

curso.html          APARCADO: curso de teoría de 2 h (12 módulos)
css/styles.css      APARCADO: tema del curso (pendiente de rehacer)
js/lessons*.js      APARCADO: contenido del curso
js/app.js           APARCADO: router y vistas del curso
js/chordbook.js     APARCADO: diccionario de acordes del curso
js/guide.js         APARCADO: chuleta de teoría
js/tuner.js         APARCADO: afinador por micrófono
js/metronome.js     APARCADO: metrónomo
js/chordpro.js      APARCADO: editor de cifrados
```

Lo aparcado no se carga desde `index.html`: está escrito y probado, esperando
que retomemos el curso. `curso.html` todavía usa el tema anterior.

## Los datos: data/chords.json

Todo el material musical vive en [data/chords.json](data/chords.json) y se
puede **editar directamente en GitHub** sin tocar código: los 28 tipos de
acorde (fórmula, sufijo y nombre), todas las posiciones de guitarra (abiertas
y transportables, con digitación) y las reglas de piano (patrones de mano
izquierda, orden de descarte de la derecha y tablas de digitación). El propio
archivo lleva un `readme` con el formato de cada campo.

Si una edición rompe la sintaxis, la app lo dice en pantalla en lugar de
quedarse en negro. Y cualquier cambio queda vigilado por el validador:
fórmulas por partida doble, ninguna nota ajena al acorde, fundamental
presente, posiciones abarcables y digitaciones físicamente posibles
(mismo dedo = mismo traste, nada al aire debajo de una cejilla, dedos
ordenados por trastes).

## Tests

Sin dependencias: se ejecutan con Node contra un DOM mínimo.

```bash
node tests/theory-shapes.js   # teoría + data/chords.json: ~4000 comprobaciones,
                              # 464 posiciones de guitarra revisadas físicamente
node tests/practice-ui.js     # la pantalla y las manos de piano: ~18000 comprobaciones
```
