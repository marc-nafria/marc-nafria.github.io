# Acordes · guitarra y piano

Web de práctica para el móvil: un acorde a pantalla completa, sus posiciones de
guitarra y sus inversiones de piano. Sin nombre, sin cuentas, sin
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

**Al desplegar cambios de CSS o JS**: sube el número `?v=` de los assets en
`index.html` (todos a la vez). GitHub Pages y los móviles cachean fuerte; sin
ese número, un despliegue a medias mezcla JS nuevo con CSS viejo y la página
sale descolocada hasta que caduque la caché. El archivo de datos
(`data/chords.json`) no lo necesita: se pide siempre revalidado.

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

**Eines**: el carrusel té quatre plans — afinador | guitarra | piano |
tempo — i les capes fixes es dissolen amb desenfocament en entrar a les eines.

- **Afinador** (pla de l'esquerra): micròfon + autocorrelació, nota gegant que
  es torna beix quan estàs afinat, regla de cents i avís tensa/afluixa. El
  micròfon s'engega en arribar al pla i s'allibera en marxar. Necessita HTTPS
  (GitHub Pages ja en dona).
- **Tempo** (pla de la dreta): tocar el número l'engega o l'atura; arrossegar-lo
  (o la roda) el puja o baixa; **picar al ritme sobre l'espai buit del pla**
  ajusta el BPM (tap tempo sense cap control extra, amb el número fent un batec
  a cada toc). El compàs s'obre com els selectors d'acords: 3/4 i 4/4 en gran,
  2/4, 5/4 i 6/8 en petit. El clic va planificat sobre el rellotge d'àudio i
  **segueix sonant encara que tornis a l'instrument**, per practicar-hi a sobre.
  És l'únic so de tota la web.

**Abajo, fijo: la posición.** En guitarra recorre todas las formas conocidas
(abierta primero, luego las cejillas de menor a mayor traste); en piano, las
**inversiones**. Y ahí es donde aparece el **cifrado con bajo**, que es lo que
una inversión es de verdad: `C` → `C/E` → `C/G`. En guitarra se calcula a partir
de la cuerda más grave que suena en cada posición.

**Pianet lliure**: la icona de tres tecles (a dalt a la dreta) converteix el
mòbil sencer en un piano — a pantalla completa, girat 90° si el tens en
vertical, amb una creu discreta per sortir. Quatre octaves (C2–C6): el teclat
es mou arrossegant per la franja dels Do (cada Do porta el seu indicador
d'octava) o per l'aire de sobre i de sota, amb una línia de posició beix que
apareix mentre arrossegues. El cos de la tecla **polsa** — s'encén en blanc,
s'enfonsa un pèl i sona mentre la mantens, amb un coixí suau tipus pad —;
**lliscar-la cap avall la deixa fixada sonant en beix** i lliscar-la cap amunt
la deixa anar. Les negres alcades van amb vora negra perquè no es perdin. Va
bé per comprovar com sona un acord o si has tret el to d'una cançó.

**Apaïsat**: en horitzontal el layout s'adapta — les dues mans del piano van
costat a costat (l'esquerra a l'esquerra) i el diagrama de guitarra s'ajeu,
amb la celleta a l'esquerra i la 6a corda a baix, com veus el màstil en tocar.

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

## Entrar l'acord

Al pla del piano, un **fil dissimulat entre els dos teclats**. Arrossega'l i
**tu decideixes quan entra cada nota** (de la més greu a la més aguda, les
dues mans) — so de pad que es queda sonant —, i enrere surten en ordre invers.
És continu: la barra segueix el dit i cada nota entra en creuar la seva
fracció del recorregut. En deixar anar, el que sona es queda. Les notes que
falten esperen com a **anells fantasma** i es marquen de ple quan entren.
Canviar d'acord, d'inversió o de pla ho fa callar tot.

## La roda d'inversions

Les inversions (piano) i les posicions (guitarra) no van en fletxes ni en
punts: cada secció duu la seva **roda** just sota l'instrument, així que és
seva i hi llisca. La peça del mig es llegeix neta; les del costat es fan
petites, s'enfonsen i es desdibuixen, com una roda que gira. Es mou
arrossegant-la, o tocant-ne una del costat. Aquí baix no hi ha animació de
blur: la roda ja diu ella mateixa on ets.

## El pianet posa nom al que sona

Deixa tres o més notes fixades al pianet lliure i, si formen un acord del
diccionari, **el símbol surt a la barra de dalt** (C, Am7, F/A si el baix no
és la fonamental). Es prova cada nota com a fonamental, primer el baix.

## Pràctica d'oïda

L'anell de dalt a la dreta obre una pantalla pròpia amb **tres jocs** que es
canvien lliscant (el títol i la descripció de cada joc respiren un moment i
s'esvaeixen). Sense punts: només orella.

1. **Construeix l'acord** — sona un acord i el busques al piano. Només valen
   les **tecles que sonen de debò** (cap octavada), i el teclat s'ancora a
   l'acord perquè sempre hi càpiga. Botons muts: l'**orella** (un cercle que
   es buida de beix mentre sona; cada toc el reomple, així que si el vas
   tocant no calla mai), les **tres tecletes** (escoltar la teva selecció),
   **?** (la resposta) i **→** (un de nou).
2. **Quina nota sona?** — la referència, pintada i sonant; després una nota
   misteriosa: troba-la.
3. **Pinta el grau** — des de la referència, et demanen un grau (3a menor,
   5a justa…) i l'has de pintar. Prova de cantar-la abans.

## Quinacord — el joc diari (`/quinacord`)

Cada dia **sona un acord** (el mateix per a tothom, per mode) i l'has de
trobar al piano: la fonamental ve donada, cada tecla encertada **es queda en
verd**, cada errada omple una de les **4 caselles** — i si s'omplen totes,
es revela i demà més. Tres modes: **3, 5 i 7 notes** (tríades, novenes,
tretzenes), cadascun amb el seu puzle i la seva **ratxa**. En acabar:
**comparteix** la graella (🟩🟥, sense espòiler) i el compte enrere fins al
següent. El puzle és determinista per data local; el nucli té els seus tests
(`node tests/quinacord.js`).

## App de debò (PWA)

L'app funciona **100% fora de línia**: un service worker (`sw.js`) guarda tots
els fitxers i les lletres a la primera visita. A l'iPhone: Safari →
Compartir → **Afegir a la pantalla d'inici** — s'obre a pantalla completa,
amb la seva icona, sense navegador. Quan hi ha versió nova, surt un avís
petit a baix ("versió nova · toca per actualitzar").

**Ritual de publicació**: apuja el `?v=N` d'`index.html` **i** la `V` de
`sw.js` (dos números, el mateix valor). La pantalla es manté **encesa**
mentre el tempo sona o l'afinador escolta (Wake Lock).

## Mode clar i so a l'iPhone

El rètol **clar/fosc** de dalt a l'esquerra canvia la paleta i es recorda. Els
diagrames es tornen a dibuixar amb els colors del mode: paper càlid, tinta
negra i l'accent en ocre (un beix clar no es llegiria sobre blanc), amb una
anella fina a les bombolles clares perquè no es perdin sobre tecla clara.

**Si a l'iPhone no se sent res**: el commutador de silenci del costat del
telèfon emmudeix el Web Audio de tots els navegadors de l'iPhone (tots són
WebKit per dins). L'app demana la sessió d'àudio `playback` a iOS 16.4+, que
ho arregla; si el teu iOS és anterior, treu el silenci o puja el volum de
timbre. L'àudio també es desbloqueja amb el primer toc a la pàgina, sigui on
sigui, i es reprèn en tornar de segon pla.
