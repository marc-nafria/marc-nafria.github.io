/* ============================================================
   lessons-1.js - Módulos 1 a 6: fundamentos.
   ============================================================ */
(function () {
  'use strict';

  Lessons.add([

  /* ---------------------------------------------------------- 1 */
  {
    id: 1,
    minutes: 8,
    title: 'Las 12 notas y nada más',
    subtitle: 'El material con el que se construye toda la música occidental',
    goal: 'Saber que solo existen 12 notas y localizarlas en el piano y en la guitarra.',
    blocks: [
      { k: 'p', html: 'Bienvenido. Este curso dura unas <strong>dos horas</strong> y está pensado para hacerse con el instrumento delante (o sin él: todos los diagramas suenan si los tocas con el dedo).' },
      { k: 'tip', title: 'Cómo usar la página', html: 'Arriba tienes el selector <strong>Piano / Guitarra / Ambos</strong>. Cámbialo cuando quieras: los diagramas de toda la página se adaptan. Si eliges <strong>Ambos</strong> verás siempre la misma idea explicada en los dos instrumentos, que es la forma más rápida de entender la teoría de verdad.' },
      { k: 'h', text: 'Solo hay 12 notas' },
      { k: 'p', html: 'La música occidental usa <strong>12 sonidos</strong> que se repiten una y otra vez, más agudos o más graves. Se llaman con siete letras y cinco alteraciones:<br><span class="mono">C · C# · D · D# · E · F · F# · G · G# · A · A# · B</span> y vuelta a empezar.' },
      { k: 'p', html: 'En España se aprenden con los nombres latinos. Son <em class="term">exactamente lo mismo</em>:' },
      {
        k: 'table',
        head: ['Cifrado (inglés)', 'Latino', 'Grado en Do mayor'],
        rows: [
          ['<b>C</b>', 'Do', '1'], ['<b>D</b>', 'Re', '2'], ['<b>E</b>', 'Mi', '3'],
          ['<b>F</b>', 'Fa', '4'], ['<b>G</b>', 'Sol', '5'], ['<b>A</b>', 'La', '6'],
          ['<b>B</b>', 'Si', '7']
        ]
      },
      { k: 'p', html: 'El resto son notas alteradas: <strong>#</strong> (sostenido) sube un semitono y <strong>b</strong> (bemol) lo baja. Por eso <span class="mono">C#</span> y <span class="mono">Db</span> son la misma tecla: eso se llama <em class="term">enarmonía</em>.' },
      {
        k: 'compare',
        title: 'Las 12 notas en tu instrumento',
        piano: {
          widget: 'piano', from: 48, keys: 8, labels: 'note',
          scale: { root: 'C', type: 'chromatic' },
          note: 'Cada tecla, blanca o negra, es una nota distinta. Las <strong>blancas</strong> son las siete letras; las <strong>negras</strong>, las cinco alteradas. Al llegar otra vez a C, empieza el mismo ciclo más agudo.',
          play: { kind: 'scale', root: 'C', type: 'chromatic', baseMidi: 48, label: 'Oír las 12 notas' }
        },
        guitar: {
          widget: 'fret', fromFret: 0, toFret: 12, stringsSubset: [0], labels: 'note',
          scale: { root: 'C', type: 'chromatic' },
          note: 'Esta es la <strong>6ª cuerda</strong> (la más gruesa, E). Cada traste es una nota nueva. En el traste <strong>12</strong> vuelve a aparecer E: has recorrido las 12 notas y empieza el ciclo.',
          play: { kind: 'notes', midis: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52], label: 'Oír las 12 notas' }
        }
      },
      { k: 'note', title: 'La gran diferencia', html: 'En el piano cada nota está en <strong>un solo sitio</strong> por octava. En la guitarra la misma nota aparece en <strong>varios sitios</strong> (cuerdas distintas). El piano es más claro para entender; la guitarra es más cómoda para transportar. Por eso conviene mirar los dos.' },
      {
        k: 'quiz',
        q: '¿Cuántas notas diferentes existen antes de que el ciclo se repita?',
        options: ['7', '12', '8', '5'],
        answer: 1,
        explain: 'Doce. Las siete letras (C D E F G A B) más las cinco alteradas (C# D# F# G# A#).'
      },
      { k: 'exercise', title: 'Práctica (1 minuto)', html: 'Toca el diagrama de arriba nota a nota diciendo el nombre en voz alta. En la guitarra, busca <strong>todos los C</strong> que encuentres en el mástil; en el piano, localiza el C que queda justo a la izquierda de cada grupo de <strong>dos teclas negras</strong>.' }
    ]
  },

  /* ---------------------------------------------------------- 2 */
  {
    id: 2,
    minutes: 10,
    title: 'Tono y semitono: el mapa',
    subtitle: 'La unidad de medida que lo explica todo',
    goal: 'Medir distancias y entender por qué el piano tiene teclas negras y la guitarra no.',
    blocks: [
      { k: 'p', html: 'El <em class="term">semitono</em> es la distancia más pequeña entre dos notas. Un <em class="term">tono</em> son dos semitonos. Con solo esto se explican escalas, acordes y tonalidades.' },
      {
        k: 'compare',
        title: 'Un semitono',
        piano: {
          widget: 'piano', from: 48, keys: 8, labels: 'note',
          midiMarks: [
            { midi: 48, label: 'C', role: 'root' },
            { midi: 49, label: 'C#', role: 'mark' }
          ],
          note: 'Un semitono es pasar a la <strong>tecla de al lado</strong>, contando también las negras. De C a C# hay un semitono.',
          play: { kind: 'notes', midis: [48, 49], label: 'Oír el semitono' }
        },
        guitar: {
          widget: 'fret', fromFret: 0, toFret: 5, stringsSubset: [0], labels: 'note',
          midiMarks: [
            { midi: 40, label: 'E', role: 'root' },
            { midi: 41, label: 'F', role: 'mark' }
          ],
          note: 'Un semitono es <strong>un traste</strong>. Siempre. Esta es la ventaja brutal de la guitarra: la distancia es visual y constante.',
          play: { kind: 'notes', midis: [40, 41], label: 'Oír el semitono' }
        }
      },
      { k: 'h', text: 'Los dos sitios sin tecla negra' },
      { k: 'p', html: 'Entre casi todas las letras hay un tono (dos trastes). Pero hay <strong>dos excepciones</strong>: entre <span class="mono">E–F</span> y entre <span class="mono">B–C</span> solo hay un <strong>semitono</strong>. En el piano se ve porque ahí no hay tecla negra. En la guitarra están pegadas.' },
      {
        k: 'compare',
        title: 'E–F y B–C están pegadas',
        piano: {
          widget: 'piano', from: 48, keys: 8, labels: 'note',
          midiMarks: [
            { midi: 52, label: 'E', role: 'root' }, { midi: 53, label: 'F', role: 'mark' },
            { midi: 59, label: 'B', role: 'root' }, { midi: 60, label: 'C', role: 'mark' }
          ],
          note: 'Mira los huecos: no hay negra entre E y F, ni entre B y C. Ese detalle es el que hace que la escala mayor de Do sean justo las teclas blancas.',
          play: { kind: 'notes', midis: [52, 53, 59, 60], label: 'Oír E-F y B-C' }
        },
        guitar: {
          widget: 'fret', fromFret: 0, toFret: 5, stringsSubset: [0, 1], labels: 'note',
          extra: [{ note: 'E', role: 'root' }, { note: 'F', role: 'mark' },
                  { note: 'B', role: 'root' }, { note: 'C', role: 'mark' }],
          note: 'En la guitarra no hay pista visual: E y F son trastes contiguos igual que C y C#. Hay que <strong>saberlo</strong>. Este es el único punto donde el piano enseña mejor la teoría.',
          play: { kind: 'notes', midis: [40, 41, 47, 48], label: 'Oír E-F y B-C' }
        }
      },
      { k: 'h', text: 'Por qué la guitarra está afinada así' },
      { k: 'p', html: 'Las cuerdas al aire son <span class="mono">E A D G B E</span>. De una cuerda a la siguiente hay <strong>5 semitonos</strong> (una cuarta)… excepto de <strong>G a B</strong>, donde hay solo <strong>4</strong> (una tercera).' },
      { k: 'note', title: 'La consecuencia práctica', html: 'Cualquier figura o forma que cruce la <strong>2ª cuerda (B)</strong> se desplaza un traste. Por eso el acorde de C tiene esa forma torcida y por eso las octavas cambian de patrón al pasar a la B. No es magia: es ese semitono de diferencia.' },
      {
        k: 'compare',
        title: 'La afinación al aire',
        piano: {
          widget: 'piano', from: 40, keys: 15, labels: 'note',
          midiMarks: [
            { midi: 40, label: 'E', role: 'root' }, { midi: 45, label: 'A', role: 'chord' },
            { midi: 50, label: 'D', role: 'chord' }, { midi: 55, label: 'G', role: 'chord' },
            { midi: 59, label: 'B', role: 'mark' }, { midi: 64, label: 'E', role: 'root' }
          ],
          note: 'Las seis cuerdas de la guitarra, dibujadas en el piano. Cuenta las teclas: 5, 5, 5, <strong>4</strong>, 5.',
          play: { kind: 'notes', midis: [40, 45, 50, 55, 59, 64], label: 'Oír las 6 cuerdas' }
        },
        guitar: {
          widget: 'fret', fromFret: 0, toFret: 5, labels: 'note',
          midiMarks: [
            { midi: 40, label: 'E', role: 'root' }, { midi: 45, label: 'A', role: 'chord' },
            { midi: 50, label: 'D', role: 'chord' }, { midi: 55, label: 'G', role: 'chord' },
            { midi: 59, label: 'B', role: 'mark' }, { midi: 64, label: 'E', role: 'root' }
          ],
          note: 'Al aire, de la 6ª a la 1ª. Truco clásico: el traste <strong>5</strong> de una cuerda suena igual que la cuerda siguiente al aire… salvo entre la 3ª y la 2ª, donde el truco es el traste <strong>4</strong>.',
          play: { kind: 'notes', midis: [40, 45, 50, 55, 59, 64], label: 'Oír las 6 cuerdas' }
        }
      },
      {
        k: 'quiz',
        q: '¿Cuántos semitonos hay entre B y C?',
        options: ['Ninguno, es la misma nota', 'Uno', 'Dos', 'Tres'],
        answer: 1,
        explain: 'Uno. B–C y E–F son los dos únicos pares de letras consecutivas separados por un semitono.'
      },
      { k: 'link', href: '#/herramientas/afinador', label: 'Afinar la guitarra ahora', hint: 'El afinador usa el micrófono del móvil.' }
    ]
  },

  /* ---------------------------------------------------------- 3 */
  {
    id: 3,
    minutes: 12,
    title: 'La escala mayor',
    subtitle: 'Un patrón de siete notas que ordena toda la armonía',
    goal: 'Construir cualquier escala mayor y entender de dónde salen los sostenidos.',
    blocks: [
      { k: 'p', html: 'La escala mayor es el sonido de <span class="mono">do-re-mi-fa-sol-la-si-do</span>. No es una lista de notas que haya que memorizar: es un <strong>patrón de distancias</strong> que puedes aplicar empezando donde quieras.' },
      { k: 'p', html: 'El patrón, en tonos (T) y semitonos (S), es:<br><strong class="mono">T · T · S · T · T · T · S</strong>' },
      {
        k: 'compare',
        title: 'Do mayor: el patrón sobre C',
        piano: {
          widget: 'piano', from: 48, keys: 8, labels: 'note',
          scale: { root: 'C', type: 'major' },
          note: 'Empezando en C, el patrón cae exactamente en las <strong>teclas blancas</strong>. Por eso Do mayor es la primera tonalidad que se aprende al piano.',
          play: { kind: 'scale', root: 'C', type: 'major', baseMidi: 48, label: 'Oír Do mayor' }
        },
        guitar: {
          widget: 'fret', fromFret: 0, toFret: 12, stringsSubset: [1], labels: 'note',
          scale: { root: 'C', type: 'major' },
          note: 'Sobre la <strong>5ª cuerda (A)</strong>: la raíz C está en el traste 3, y desde ahí sigues 2-2-1-2-2-2-1 trastes. La escala no está en las cuerdas al aire, está en el <strong>patrón</strong>.',
          play: { kind: 'notes', midis: [48, 50, 52, 53, 55, 57, 59, 60], label: 'Oír Do mayor' }
        }
      },
      { k: 'h', text: 'Los grados: la numeración que lo cambia todo' },
      { k: 'p', html: 'A cada nota de la escala se le llama <em class="term">grado</em> y se numera del 1 al 7. Hablar en grados en vez de en notas es lo que permite tocar la misma canción en cualquier tonalidad.' },
      {
        k: 'compare',
        title: 'La misma escala, en grados',
        piano: {
          widget: 'piano', from: 48, keys: 8, labels: 'degree',
          scale: { root: 'C', type: 'major' },
          note: 'El <strong>1</strong> es la casa (la tónica). El <strong>5</strong> es la nota que más tira hacia ella. El <strong>7</strong> es el que más tensión crea.'
        },
        guitar: {
          widget: 'fret', fromFret: 0, toFret: 12, labels: 'degree',
          scale: { root: 'C', type: 'major' },
          note: 'Todo el mástil, en grados de Do mayor. Fíjate en cómo el mismo grado aparece por todos lados: eso es lo que te permitirá improvisar sin pensar en nombres.'
        }
      },
      { k: 'h', text: 'Cambiar de tonalidad: de dónde sale el F#' },
      { k: 'p', html: 'Aplica el mismo patrón empezando en <strong>G</strong>: G–A–B–C–D–E–…  Para que el último salto sea un semitono, la séptima nota tiene que ser <strong>F#</strong>, no F. Ahí nace la armadura de Sol mayor: <strong>un sostenido</strong>.' },
      {
        k: 'compare',
        title: 'Sol mayor',
        piano: {
          widget: 'piano', from: 55, keys: 8, labels: 'note',
          scale: { root: 'G', type: 'major' },
          note: 'Aparece una <strong>tecla negra</strong> (F#). Al piano cada tonalidad se siente distinta bajo los dedos: por eso hay que estudiarlas una a una.',
          play: { kind: 'scale', root: 'G', type: 'major', baseMidi: 55, label: 'Oír Sol mayor' }
        },
        guitar: {
          widget: 'fret', fromFret: 0, toFret: 12, labels: 'degree',
          scale: { root: 'G', type: 'major' },
          note: 'La escala de Sol mayor es <strong>el mismo dibujo</strong> que la de Do mayor movido de sitio. Aquí gana la guitarra: aprendes un patrón y sirve para las 12 tonalidades.',
          play: { kind: 'scale', root: 'G', type: 'major', baseMidi: 55, label: 'Oír Sol mayor' }
        }
      },
      { k: 'tip', title: 'Regla de oro', html: 'Piano: la teoría se <strong>ve</strong>, la técnica cambia con cada tonalidad.<br>Guitarra: la teoría se <strong>esconde</strong>, pero la técnica se repite igual en todas.' },
      {
        k: 'quiz',
        q: 'Aplicas T-T-S-T-T-T-S empezando en F. ¿Qué nota alterada aparece?',
        options: ['F#', 'Bb', 'C#', 'Ninguna'],
        answer: 1,
        explain: 'F–G–A–<b>Bb</b>–C–D–E–F. El cuarto grado tiene que estar a un semitono del tercero, así que es Bb. Fa mayor tiene un bemol.'
      },
      { k: 'exercise', title: 'Práctica (3 minutos)', html: 'Toca la escala mayor <strong>ascendiendo y descendiendo</strong> en Do y en Sol. Al piano, con la digitación que te salga. A la guitarra, sobre una sola cuerda primero y luego usando varias. Di el <strong>grado</strong> en voz alta, no el nombre de la nota.' }
    ]
  },

  /* ---------------------------------------------------------- 4 */
  {
    id: 4,
    minutes: 10,
    title: 'Intervalos: la distancia manda',
    subtitle: 'El color de la música está en las distancias, no en las notas',
    goal: 'Reconocer de oído terceras, quintas y séptimas, y verlas como forma en cada instrumento.',
    blocks: [
      { k: 'p', html: 'Un <em class="term">intervalo</em> es la distancia entre dos notas, medida en semitonos. Cada distancia tiene un carácter propio, y ese carácter no cambia aunque cambies de tonalidad.' },
      { k: 'intervalTable' },
      { k: 'h', text: 'La tercera: mayor o menor, alegre o triste' },
      { k: 'p', html: 'El intervalo más importante para empezar es la <strong>tercera</strong>. Cuatro semitonos suenan luminosos (tercera mayor); tres semitonos suenan oscuros (tercera menor). Toda la diferencia entre un acorde mayor y uno menor es <strong>esa única nota</strong>.' },
      {
        k: 'compare',
        title: 'Tercera mayor contra tercera menor',
        piano: {
          diagrams: [
            {
              widget: 'piano', from: 48, keys: 8, labels: 'note', caption: 'Tercera mayor: C → E (4 semitonos)',
              midiMarks: [{ midi: 48, label: 'C', role: 'root' }, { midi: 52, label: 'E', role: 'chord' }]
            },
            {
              widget: 'piano', from: 48, keys: 8, labels: 'note', caption: 'Tercera menor: C → Eb (3 semitonos)',
              midiMarks: [{ midi: 48, label: 'C', role: 'root' }, { midi: 51, label: 'Eb', role: 'mark' }]
            }
          ],
          note: 'Al piano cuentas <strong>teclas</strong>: 4 para mayor, 3 para menor. Incluye las negras al contar.',
          play: { kind: 'notes', midis: [48, 52, 48, 51], label: 'Mayor y luego menor' }
        },
        guitar: {
          widget: 'fret', fromFret: 0, toFret: 6, stringsSubset: [1, 2], labels: 'note',
          midiMarks: [
            { midi: 48, label: 'C', role: 'root' },
            { midi: 52, label: 'E', role: 'chord' },
            { midi: 51, label: 'Eb', role: 'mark' }
          ],
          note: 'A la guitarra un intervalo es una <strong>forma</strong>: raíz en la 5ª cuerda traste 3, tercera mayor en la 4ª traste 2, tercera menor un traste por debajo. Esa forma no cambia nunca.',
          play: { kind: 'notes', midis: [48, 52, 48, 51], label: 'Mayor y luego menor' }
        }
      },
      { k: 'h', text: 'La quinta: el esqueleto' },
      { k: 'p', html: 'Siete semitonos. Suena sólida y hueca; no dice si la música es alegre o triste. Es la base de los <strong>power chords</strong> del rock y del acompañamiento de mano izquierda al piano.' },
      {
        k: 'compare',
        title: 'La quinta justa',
        piano: {
          widget: 'piano', from: 48, keys: 8, labels: 'degree',
          midiMarks: [{ midi: 48, label: '1', role: 'root' }, { midi: 55, label: '5', role: 'chord' }],
          note: 'Mano izquierda: 1 y 5. Es el acompañamiento más simple y limpio que existe al piano.',
          play: { kind: 'notes', midis: [48, 55], label: 'Oír la quinta' }
        },
        guitar: {
          widget: 'chordbox', symbols: ['C5'], size: 'md',
          note: 'La misma quinta como power chord: raíz y quinta, sin tercera. Dos dedos, cualquier traste, funciona en toda la guitarra.',
          play: { kind: 'chord', root: 'C', q: 'pow', baseMidi: 48, label: 'Oír el power chord' }
        }
      },
      {
        k: 'quiz',
        q: 'Tocas C y G a la vez. ¿Qué intervalo es y qué te dice?',
        options: ['Tercera mayor: alegre', 'Quinta justa: ni alegre ni triste', 'Cuarta aumentada: tensión', 'Séptima menor: bluesy'],
        answer: 1,
        explain: 'De C a G hay 7 semitonos: quinta justa. Es neutra, por eso el power chord sirve igual para un tema alegre que para uno oscuro.'
      },
      { k: 'exercise', title: 'Oído (2 minutos)', html: 'Toca C y luego E; después C y Eb. Repítelo varias veces con los ojos cerrados hasta que <strong>oigas</strong> cuál es mayor y cuál menor sin mirar. Es la habilidad que más rendimiento te va a dar.' }
    ]
  },

  /* ---------------------------------------------------------- 5 */
  {
    id: 5,
    minutes: 12,
    title: 'Tríadas: así nace un acorde',
    subtitle: 'Tres notas, cuatro sabores',
    goal: 'Construir acordes mayores, menores, disminuidos y aumentados desde la escala.',
    blocks: [
      { k: 'p', html: 'Un <em class="term">acorde</em> es un conjunto de notas que suenan juntas. El más básico es la <em class="term">tríada</em>: tres notas, los grados <strong>1 · 3 · 5</strong> de una escala.' },
      { k: 'p', html: 'Sobre la escala de Do mayor (C D E F G A B), tomando 1-3-5 sale <strong>C – E – G</strong>: el acorde de Do mayor.' },
      {
        k: 'compare',
        title: 'Do mayor = 1 + 3 + 5',
        piano: {
          widget: 'piano', from: 48, keys: 8, labels: 'degree',
          chord: { root: 'C', q: 'maj' },
          note: 'Tres notas, saltando una tecla blanca entre cada una. El dibujo <strong>1-3-5</strong> es el mismo en cualquier acorde mayor con teclas blancas.',
          play: { kind: 'chord', root: 'C', q: 'maj', baseMidi: 48, label: 'Oír C' }
        },
        guitar: {
          diagrams: [
            { widget: 'chordbox', symbols: ['C'], size: 'md', caption: 'La forma que ya conoces' },
            { widget: 'fret', fromFret: 0, toFret: 5, labels: 'degree', chord: { root: 'C', q: 'maj' }, caption: 'Las mismas 3 notas por el mástil' }
          ],
          note: 'La guitarra toca <strong>seis</strong> cuerdas pero solo hay <strong>tres</strong> notas distintas: se repiten. En el acorde de C que conoces suenan C-E-G-C-E, en ese orden de grave a agudo.',
          play: { kind: 'chord', root: 'C', q: 'maj', baseMidi: 48, label: 'Oír C' }
        }
      },
      { k: 'h', text: 'Los cuatro sabores de tríada' },
      {
        k: 'table',
        head: ['Tríada', 'Grados', 'Semitonos', 'Carácter'],
        rows: [
          ['<b>Mayor</b> (C)', '1 · 3 · 5', '4 + 3', 'Luminoso, estable'],
          ['<b>Menor</b> (Cm)', '1 · b3 · 5', '3 + 4', 'Oscuro, íntimo'],
          ['<b>Disminuido</b> (Cdim)', '1 · b3 · b5', '3 + 3', 'Inestable, de paso'],
          ['<b>Aumentado</b> (Caug)', '1 · 3 · #5', '4 + 4', 'Extraño, suspendido']
        ]
      },
      { k: 'p', html: 'Solo cambia <strong>una nota</strong> entre mayor y menor: la tercera baja un semitono. Todo el drama de la música occidental vive en ese semitono.' },
      {
        k: 'compare',
        title: 'Do menor: baja la tercera',
        piano: {
          widget: 'piano', from: 48, keys: 8, labels: 'degree',
          chord: { root: 'C', q: 'min' },
          note: 'La tercera se va a la <strong>tecla negra</strong> Eb. El dedo del medio se desplaza un semitono a la izquierda y ya está.',
          play: { kind: 'chord', root: 'C', q: 'min', baseMidi: 48, label: 'Oír Cm' }
        },
        guitar: {
          diagrams: [
            { widget: 'chordbox', symbols: ['Am', 'A'], size: 'md', caption: 'Am y A: mira solo la 2ª cuerda' }
          ],
          note: 'Compara Am con A: <strong>un solo dedo</strong> se mueve un traste. Ese dedo es la tercera. Cuando lo veas así, dejarás de memorizar acordes.',
          play: { kind: 'progression', chords: ['Am', 'A'], label: 'Oír Am y A' }
        }
      },
      {
        k: 'chords',
        title: 'Los cuatro sabores sobre C',
        symbols: ['C', 'Cm', 'Cdim', 'Caug'],
        html: 'Toca cada uno y quédate con la sensación. Mayor y menor son el 95% de la música popular; los otros dos son condimento.'
      },
      {
        k: 'quiz',
        q: 'Un acorde tiene las notas A – C – E. ¿Qué acorde es?',
        options: ['A mayor', 'A menor', 'C mayor con la A añadida', 'A disminuido'],
        answer: 1,
        explain: 'De A a C hay 3 semitonos (tercera menor) y de A a E hay 7 (quinta justa): 1-b3-5, o sea Am.'
      },
      { k: 'exercise', title: 'Práctica (3 minutos)', html: 'Construye la tríada de <strong>G</strong> (1-3-5 de Sol mayor: G-B-D) sin mirar: al piano tocándola, a la guitarra buscando esas tres notas en los cuatro primeros trastes. Luego bájale la tercera para hacer Gm.' }
    ]
  },

  /* ---------------------------------------------------------- 6 */
  {
    id: 6,
    minutes: 10,
    title: 'El mismo acorde, dos mundos',
    subtitle: 'Inversiones al piano, formas móviles a la guitarra',
    goal: 'Entender por qué el pianista piensa en notas y el guitarrista en formas, y aprovechar los dos.',
    blocks: [
      { k: 'p', html: 'Ya sabes que C es C-E-G. Pero <strong>en qué orden</strong> y <strong>en qué octava</strong> pones esas notas cambia por completo cómo suena y cómo se toca. Aquí los dos instrumentos toman caminos opuestos.' },
      { k: 'h', text: 'Piano: inversiones' },
      { k: 'p', html: 'Cambiar la nota más grave del acorde se llama <em class="term">inversión</em>. Las notas son las mismas, la sensación cambia: el acorde suena más ligero, más conectado con el siguiente y, sobre todo, tu mano se mueve menos.' },
      {
        k: 'compare',
        title: 'Las tres posiciones de C',
        piano: {
          diagrams: [
            { widget: 'piano', from: 48, keys: 8, labels: 'degree', caption: 'Fundamental: C-E-G (grave = 1)',
              midiMarks: [{ midi: 48, label: '1', role: 'root' }, { midi: 52, label: '3', role: 'chord' }, { midi: 55, label: '5', role: 'chord' }] },
            { widget: 'piano', from: 48, keys: 8, labels: 'degree', caption: '1ª inversión: E-G-C (grave = 3)',
              midiMarks: [{ midi: 52, label: '3', role: 'chord' }, { midi: 55, label: '5', role: 'chord' }, { midi: 60, label: '1', role: 'root' }] },
            { widget: 'piano', from: 48, keys: 8, labels: 'degree', caption: '2ª inversión: G-C-E (grave = 5)',
              midiMarks: [{ midi: 55, label: '5', role: 'chord' }, { midi: 60, label: '1', role: 'root' }, { midi: 64, label: '3', role: 'chord' }] }
          ],
          note: 'Escrito en cifrado se marca con barra: <span class="mono">C/E</span> significa acorde de C con E en el bajo. Al encadenar acordes, elige la inversión que esté <strong>más cerca</strong> del acorde anterior: sonará profesional al instante.',
          play: { kind: 'notes', midis: [48, 52, 55], label: 'Oír las 3 posiciones' }
        },
        guitar: {
          diagrams: [
            { widget: 'chordbox', symbols: ['C', 'Am', 'G'], size: 'md', caption: 'Formas abiertas: cada una es un dibujo distinto' }
          ],
          note: 'La guitarra también tiene inversiones (los acordes con bajo alternativo tipo <span class="mono">C/G</span>), pero su superpoder es otro: <strong>mover formas</strong>.'
        }
      },
      { k: 'h', text: 'Guitarra: una forma, doce acordes' },
      { k: 'p', html: 'Coge la forma de <strong>E</strong> o de <strong>Em</strong>, sustituye la cejilla del aire por tu dedo índice y desplázala: cada traste que avanzas es un semitono, o sea <strong>un acorde nuevo</strong> con la misma digitación.' },
      {
        k: 'compare',
        title: 'La misma idea trasladada',
        piano: {
          diagrams: [
            { widget: 'piano', from: 48, keys: 8, labels: 'note', chord: { root: 'C', q: 'maj' }, caption: 'C mayor: todas blancas' },
            { widget: 'piano', from: 49, keys: 8, labels: 'note', chord: { root: 'C#', q: 'maj' }, caption: 'C# mayor: un semitono arriba, otra digitación' }
          ],
          note: 'Al piano, subir un semitono cambia qué teclas negras entran, así que <strong>la mano cambia</strong>. Transportar al piano exige estudiar cada tonalidad.',
          play: { kind: 'progression', chords: ['C', 'C#'], label: 'Oír C y C#' }
        },
        guitar: {
          diagrams: [
            { widget: 'chordbox', symbols: ['F', 'F#m'], size: 'md', caption: 'Cejilla forma E y forma Em' },
            { widget: 'fret', fromFret: 0, toFret: 8, labels: 'note', stringsSubset: [0], caption: 'La 6ª cuerda te dice qué acorde es la cejilla' }
          ],
          note: 'La nota que pisa tu <strong>índice en la 6ª cuerda</strong> es el nombre del acorde. Traste 1 = F, traste 3 = G, traste 5 = A… Una forma, y con ella los doce acordes mayores.',
          play: { kind: 'progression', chords: ['F', 'F#m'], label: 'Oír las cejillas' }
        }
      },
      { k: 'tip', title: 'Qué llevarte de cada instrumento', html: 'Si toques guitarra, roba del piano la idea de <strong>inversiones y notas concretas</strong>: dejarás de tocar siempre los mismos seis acordes. Si toques piano, roba de la guitarra la idea de <strong>patrones transportables</strong>: dejarás de tener miedo a las tonalidades con cinco bemoles.' },
      {
        k: 'quiz',
        q: 'Pones la cejilla en el traste 5 con la forma de Em. ¿Qué acorde suena?',
        options: ['Am', 'Bm', 'Gm', 'A'],
        answer: 0,
        explain: 'La 6ª cuerda en el traste 5 es A, y la forma es menor: Am. Contando desde E (aire): F, F#, G, G#, A.'
      }
    ]
  }

  ]);
})();
