/* ============================================================
   lessons-2.js - Módulos 7 a 12: armonía, ritmo y práctica.
   ============================================================ */
(function () {
  'use strict';

  Lessons.add([

  /* ---------------------------------------------------------- 7 */
  {
    id: 7,
    minutes: 12,
    title: 'Grados y progresiones',
    subtitle: 'Por qué miles de canciones usan los mismos cuatro acordes',
    goal: 'Saber qué acordes pertenecen a una tonalidad y encadenarlos con criterio.',
    blocks: [
      { k: 'p', html: 'Si construyes una tríada sobre <strong>cada nota</strong> de la escala mayor, usando solo notas de esa escala, salen siete acordes. Esos siete son <em class="term">la familia</em> de la tonalidad: suenan bien juntos porque comparten material.' },
      { k: 'p', html: 'Se numeran con romanos: <strong>mayúscula</strong> si el acorde es mayor, <strong>minúscula</strong> si es menor.' },
      { k: 'diatonic', root: 'C', mode: 'major' },
      { k: 'note', title: 'El patrón universal', html: 'En <strong>cualquier</strong> tonalidad mayor el patrón es siempre el mismo:<br><span class="mono">I mayor · ii menor · iii menor · IV mayor · V mayor · vi menor · vii disminuido</span>.<br>Cámbialo de tonalidad y los nombres cambian, pero los caracteres no.' },
      { k: 'h', text: 'Las tres funciones' },
      { k: 'p', html: 'Los siete acordes se reducen a tres papeles: <strong>tónica</strong> (I, vi) es reposo; <strong>subdominante</strong> (IV, ii) es alejarse; <strong>dominante</strong> (V, vii) es tensión que pide volver al I. Toda progresión es un viaje de ida y vuelta a casa.' },
      {
        k: 'compare',
        title: 'La progresión de las mil canciones: I – V – vi – IV',
        piano: {
          diagrams: [
            { widget: 'piano', from: 48, keys: 15, labels: 'degree', chord: { root: 'C', q: 'maj' }, caption: 'I = C' },
            { widget: 'piano', from: 48, keys: 15, labels: 'degree', chord: { root: 'G', q: 'maj' }, caption: 'V = G' },
            { widget: 'piano', from: 48, keys: 15, labels: 'degree', chord: { root: 'A', q: 'min' }, caption: 'vi = Am' },
            { widget: 'piano', from: 48, keys: 15, labels: 'degree', chord: { root: 'F', q: 'maj' }, caption: 'IV = F' }
          ],
          note: 'Al piano, toca la tríada con la derecha y solo la <strong>raíz</strong> con la izquierda. Cuando lo tengas, busca inversiones para que la mano derecha casi no se mueva: eso es <em>voice leading</em>.',
          play: { kind: 'progression', chords: ['C', 'G', 'Am', 'F'], label: 'Oír la progresión' }
        },
        guitar: {
          diagrams: [
            { widget: 'chordbox', symbols: ['C', 'G', 'Am', 'F'], size: 'md', caption: 'C · G · Am · F' }
          ],
          note: 'Cuatro acordes, cuatro compases cada uno. Si el F te cuesta, usa la versión de cuatro cuerdas o pon cejilla en el traste 3 y toca <span class="mono">A · E · F#m · D</span>: es la misma progresión en otra tonalidad.',
          play: { kind: 'progression', chords: ['C', 'G', 'Am', 'F'], label: 'Oír la progresión' }
        }
      },
      { k: 'tip', title: 'Prueba esto', html: 'Sobre esos cuatro acordes se pueden cantar <em>Let It Be</em>, <em>No Woman No Cry</em>, <em>Zombie</em>, <em>Someone Like You</em> y unos cuantos cientos más. No es plagio: es que la progresión funciona.' },
      { k: 'h', text: 'Otras progresiones que deberías tener en el bolsillo' },
      {
        k: 'table',
        head: ['Grados', 'En Do mayor', 'Sabor'],
        rows: [
          ['I – IV – V', 'C – F – G', 'Rock, blues, folk. La más básica.'],
          ['I – V – vi – IV', 'C – G – Am – F', 'Pop moderno.'],
          ['vi – IV – I – V', 'Am – F – C – G', 'La misma, empezando triste.'],
          ['ii – V – I', 'Dm – G – C', 'Jazz. La cadencia por excelencia.'],
          ['I – vi – IV – V', 'C – Am – F – G', 'Doo-wop, años 50.']
        ]
      },
      {
        k: 'quiz',
        q: 'Estás en Sol mayor. ¿Cuál es el acorde V?',
        options: ['C', 'D', 'Em', 'F#dim'],
        answer: 1,
        explain: 'La escala de Sol mayor es G-A-B-C-D-E-F#. El quinto grado es D, y el V siempre es mayor: acorde de D.'
      },
      { k: 'link', href: '#/herramientas/metronomo', label: 'Practicar con el metrónomo', hint: 'Empieza a 70 bpm, un acorde por compás.' }
    ]
  },

  /* ---------------------------------------------------------- 8 */
  {
    id: 8,
    minutes: 10,
    title: 'Séptimas: el color',
    subtitle: 'La cuarta nota que separa el pop del jazz y del blues',
    goal: 'Distinguir maj7, 7 y m7, y usar el V7 para resolver.',
    blocks: [
      { k: 'p', html: 'Añade una cuarta nota a la tríada, una tercera por encima de la quinta, y tienes un acorde de <em class="term">séptima</em>. Es el mismo acorde de antes, pero con opinión.' },
      {
        k: 'table',
        head: ['Acorde', 'Grados', 'Suena a', 'Dónde vive'],
        rows: [
          ['<b>Cmaj7</b>', '1 · 3 · 5 · 7', 'Dulce, flotante', 'Bossa, soul, baladas'],
          ['<b>C7</b>', '1 · 3 · 5 · b7', 'Tenso, quiere moverse', 'Blues, rock, funk'],
          ['<b>Cm7</b>', '1 · b3 · 5 · b7', 'Suave, melancólico', 'Jazz, R&amp;B, neo-soul'],
          ['<b>Cm7b5</b>', '1 · b3 · b5 · b7', 'Nublado, de paso', 'ii de tonalidad menor']
        ]
      },
      { k: 'note', title: 'Cuidado con el cifrado', html: '<span class="mono">C7</span> <strong>no</strong> es la séptima de la escala: es la <strong>b7</strong> (un tono por debajo de la octava). Si quieres la séptima mayor, se escribe <span class="mono">Cmaj7</span> (o CM7, o C&#916;). Confundirlas es el error número uno del principiante.' },
      {
        k: 'compare',
        title: 'Cmaj7 contra C7',
        piano: {
          diagrams: [
            { widget: 'piano', from: 48, keys: 8, labels: 'degree', chord: { root: 'C', q: 'maj7' }, caption: 'Cmaj7: la 7 es B' },
            { widget: 'piano', from: 48, keys: 8, labels: 'degree', chord: { root: 'C', q: 'dom7' }, caption: 'C7: la b7 es Bb' }
          ],
          note: 'Un semitono de diferencia y otro planeta. Al piano se ven las cuatro notas de golpe: eso hace del piano el mejor sitio para <strong>entender</strong> armonía avanzada.',
          play: { kind: 'progression', chords: ['Cmaj7', 'C7'], label: 'Oír los dos' }
        },
        guitar: {
          diagrams: [
            { widget: 'chordbox', symbols: ['Cmaj7', 'C7', 'Am7'], size: 'md', caption: 'Cmaj7 · C7 · Am7' }
          ],
          note: 'Fíjate en Cmaj7: es el acorde de C soltando un dedo. Casi todas las séptimas de guitarra son un acorde que ya sabes con <strong>un dedo menos</strong> o uno movido.',
          play: { kind: 'progression', chords: ['Cmaj7', 'C7', 'Am7'], label: 'Oír los tres' }
        }
      },
      { k: 'h', text: 'El V7: el imán' },
      { k: 'p', html: 'El acorde de séptima de dominante sobre el <strong>quinto grado</strong> (en Do mayor: <span class="mono">G7</span>) contiene las dos notas más tensas de la tonalidad. Tocarlo antes del I produce la sensación de <em class="term">resolución</em> más fuerte que existe.' },
      {
        k: 'compare',
        title: 'G7 resuelve en C',
        piano: {
          diagrams: [
            { widget: 'piano', from: 48, keys: 15, labels: 'degree', chord: { root: 'G', q: 'dom7' }, caption: 'G7: tensión' },
            { widget: 'piano', from: 48, keys: 15, labels: 'degree', chord: { root: 'C', q: 'maj' }, caption: 'C: reposo' }
          ],
          note: 'La nota <strong>F</strong> del G7 baja medio tono hasta E, y la <strong>B</strong> sube medio tono hasta C. Dos movimientos mínimos y la tensión desaparece: ese es todo el secreto de la armonía tonal.',
          play: { kind: 'progression', chords: ['G7', 'C'], label: 'Oír la resolución' }
        },
        guitar: {
          diagrams: [
            { widget: 'chordbox', symbols: ['G7', 'C'], size: 'md', caption: 'G7 → C' }
          ],
          note: 'Toca G7 y déjalo sonar: molesta un poco. Cae en C y respira. Ahora ya sabes por qué el blues se pasa el día en acordes de séptima: nunca termina de descansar.',
          play: { kind: 'progression', chords: ['G7', 'C'], label: 'Oír la resolución' }
        }
      },
      { k: 'h', text: 'Blues de 12 compases' },
      { k: 'p', html: 'La forma más tocada de la historia. En A: cuatro compases de <span class="mono">A7</span>, dos de <span class="mono">D7</span>, dos de <span class="mono">A7</span>, uno de <span class="mono">E7</span>, uno de <span class="mono">D7</span>, uno de <span class="mono">A7</span> y uno de <span class="mono">E7</span> para volver a empezar. Son los grados <strong>I7 – IV7 – V7</strong>.' },
      { k: 'chords', title: 'El blues en A', symbols: ['A7', 'D7', 'E7'], html: 'Tres acordes y ya puedes tocar blues durante horas. A la guitarra son tres formas abiertas fáciles; al piano, prueba la mano izquierda solo con raíz y séptima.' },
      {
        k: 'quiz',
        q: '¿Qué nota diferencia G7 de Gmaj7?',
        options: ['La quinta', 'La tercera', 'La séptima: F en G7, F# en Gmaj7', 'La raíz'],
        answer: 2,
        explain: 'G7 lleva F (b7) y Gmaj7 lleva F# (7). Por eso G7 tira hacia C y Gmaj7 se queda flotando.'
      }
    ]
  },

  /* ---------------------------------------------------------- 9 */
  {
    id: 9,
    minutes: 10,
    title: 'Tonalidad menor y modos',
    subtitle: 'Las mismas notas, otro centro de gravedad',
    goal: 'Entender el relativo menor y por qué existen los modos.',
    blocks: [
      { k: 'p', html: 'La escala <em class="term">menor natural</em> es <strong class="mono">T · S · T · T · S · T · T</strong>. En grados: <span class="mono">1 2 b3 4 5 b6 b7</span>. Esa <strong>b3</strong> es la responsable del carácter oscuro.' },
      { k: 'h', text: 'El relativo menor' },
      { k: 'p', html: 'Si tocas la escala de Do mayor pero <strong>empezando y terminando en A</strong>, suena menor. Son exactamente las mismas siete notas: cambia el <strong>centro</strong>. Se dice que <span class="mono">Am</span> es el <em class="term">relativo menor</em> de <span class="mono">C</span>.' },
      { k: 'p', html: 'Regla rápida: el relativo menor está <strong>tres semitonos por debajo</strong> del mayor. C → Am, G → Em, D → Bm, F → Dm.' },
      {
        k: 'compare',
        title: 'Do mayor y La menor: las mismas teclas',
        piano: {
          diagrams: [
            { widget: 'piano', from: 48, keys: 8, labels: 'note', scale: { root: 'C', type: 'major' }, caption: 'Do mayor desde C' },
            { widget: 'piano', from: 57, keys: 8, labels: 'degree', scale: { root: 'A', type: 'naturalMinor' }, caption: 'La menor desde A' }
          ],
          note: 'Teclas blancas en los dos casos. Lo único que cambia es dónde sientes la <strong>casa</strong>. Toca la escala terminando en C y luego terminando en A: la diferencia es evidente.',
          play: { kind: 'scale', root: 'A', type: 'naturalMinor', baseMidi: 57, label: 'Oír La menor' }
        },
        guitar: {
          widget: 'fret', fromFret: 0, toFret: 12, labels: 'degree', scale: { root: 'A', type: 'naturalMinor' },
          note: 'Mismo dibujo que la escala mayor de C, con la raíz puesta en <strong>A</strong>. Practica resolviendo siempre en un punto rojo: eso es lo que le dice al oyente cuál es la tonalidad.',
          play: { kind: 'scale', root: 'A', type: 'naturalMinor', baseMidi: 57, label: 'Oír La menor' }
        }
      },
      { k: 'h', text: 'Progresiones en menor' },
      { k: 'p', html: 'Los grados de la tonalidad menor natural son <span class="mono">i · ii&#176; · III · iv · v · VI · VII</span>. La progresión más rentable es <strong>i – VI – III – VII</strong>: en La menor, <span class="mono">Am – F – C – G</span>. Sí, son los mismos cuatro acordes del módulo anterior en otro orden. Bienvenido a la música pop.' },
      { k: 'diatonic', root: 'A', mode: 'naturalMinor' },
      { k: 'h', text: 'Modos: rotar la escala' },
      { k: 'p', html: 'Si en vez de empezar en C o en A empiezas en cualquier otra nota de la escala, obtienes un <em class="term">modo</em>. Cada uno tiene un color reconocible. Los dos que más se usan fuera del aula:' },
      {
        k: 'table',
        head: ['Modo', 'Fórmula', 'Diferencia', 'Suena a'],
        rows: [
          ['<b>Dórico</b>', '1 2 b3 4 5 <b>6</b> b7', 'Menor con la 6 natural', 'Santana, funk, Miles Davis'],
          ['<b>Mixolidio</b>', '1 2 3 4 5 6 <b>b7</b>', 'Mayor con la 7 bemol', 'Rock sureño, celta, AC/DC'],
          ['<b>Frigio</b>', '1 <b>b2</b> b3 4 5 b6 b7', 'Menor con la 2 bemol', 'Flamenco, metal']
        ]
      },
      {
        k: 'compare',
        title: 'La menor natural contra La dórico',
        piano: {
          diagrams: [
            { widget: 'piano', from: 57, keys: 8, labels: 'degree', scale: { root: 'A', type: 'naturalMinor' }, caption: 'A menor natural (b6 = F)' },
            { widget: 'piano', from: 57, keys: 8, labels: 'degree', scale: { root: 'A', type: 'dorian' }, caption: 'A dórico (6 = F#)' }
          ],
          note: 'Una sola nota de diferencia. El dórico suena menos triste, más abierto: por eso funciona tan bien para improvisar sobre un <span class="mono">Am7</span> que dura cuatro compases.',
          play: { kind: 'scale', root: 'A', type: 'dorian', baseMidi: 57, label: 'Oír A dórico' }
        },
        guitar: {
          widget: 'fret', fromFret: 4, toFret: 9, labels: 'degree', scale: { root: 'A', type: 'dorian' },
          note: 'Posición cerrada en el traste 5: A dórico. Compárala con la menor natural y localiza la nota que cambia. Un traste, otro mundo.',
          play: { kind: 'scale', root: 'A', type: 'dorian', baseMidi: 57, label: 'Oír A dórico' }
        }
      },
      {
        k: 'quiz',
        q: '¿Cuál es el relativo menor de F mayor?',
        options: ['Am', 'Dm', 'Em', 'Gm'],
        answer: 1,
        explain: 'Tres semitonos por debajo de F: F → E → Eb → D. Dm comparte armadura con F mayor (un bemol).'
      }
    ]
  },

  /* ---------------------------------------------------------- 10 */
  {
    id: 10,
    minutes: 10,
    title: 'Pentatónica: improvisar hoy',
    subtitle: 'Cinco notas que no fallan',
    goal: 'Tocar tu primer solo con criterio, en los dos instrumentos.',
    blocks: [
      { k: 'p', html: 'La escala <em class="term">pentatónica menor</em> quita de la menor natural las dos notas más comprometidas (la 2 y la b6) y deja cinco: <span class="mono">1 · b3 · 4 · 5 · b7</span>. El resultado es una escala en la que es difícil sonar mal.' },
      {
        k: 'compare',
        title: 'La pentatónica menor de A',
        piano: {
          diagrams: [
            { widget: 'piano', from: 57, keys: 8, labels: 'degree', scale: { root: 'A', type: 'pentMinor' }, caption: 'A pentatónica menor' },
            { widget: 'piano', from: 54, keys: 8, labels: 'degree', scale: { root: 'F#', type: 'pentMinor' }, caption: 'F# pentatónica menor = solo teclas negras' }
          ],
          note: 'Regalo para pianistas: las <strong>cinco teclas negras</strong> son exactamente una pentatónica. Improvisa solo con negras sobre un bajo de F# o de A y sonará bien sin saber nada más.',
          play: { kind: 'scale', root: 'A', type: 'pentMinor', baseMidi: 57, label: 'Oír la pentatónica' }
        },
        guitar: {
          widget: 'fret', fromFret: 5, toFret: 8, labels: 'degree', scale: { root: 'A', type: 'pentMinor' },
          note: 'La <strong>caja 1</strong> en el traste 5: dos notas por cuerda, la forma más tocada de la historia del rock. Memorízala y muévela: en el traste 3 es G, en el 8 es C.',
          play: { kind: 'notes', midis: [57, 60, 62, 64, 67, 69], label: 'Oír la caja 1' }
        }
      },
      { k: 'h', text: 'Cómo se improvisa de verdad' },
      { k: 'p', html: 'Tener las notas no es tener un solo. Tres reglas que valen más que mil escalas:' },
      {
        k: 'table',
        head: ['Regla', 'Qué hacer'],
        rows: [
          ['<b>Silencio</b>', 'Toca 3 o 4 notas y calla un compás. El espacio es lo que hace que se oiga una frase.'],
          ['<b>Notas objetivo</b>', 'Termina las frases en la 1, la b3 o la 5. Las otras son de paso.'],
          ['<b>Repetición</b>', 'Repite la misma frase dos veces y cámbiala la tercera. Es lo que hace que suene a melodía y no a ejercicio.']
        ]
      },
      { k: 'tip', title: 'La pentatónica mayor', html: 'Sube la pentatónica menor tres semitonos y tienes la <strong>pentatónica mayor</strong> de la misma tonalidad: la de A menor y la de C mayor usan las mismas cinco notas. Sirve para tocar sobre progresiones alegres.' },
      { k: 'exercise', title: 'Práctica (4 minutos)', html: 'Pon el metrónomo a <strong>70 bpm</strong>. Toca <span class="mono">Am</span> cuatro tiempos y <span class="mono">G</span> cuatro tiempos, en bucle (o grábate). Encima, improvisa con la pentatónica de A: <strong>cuatro notas por frase, terminando siempre en A</strong>. No busques velocidad; busca que suene a frase.' },
      { k: 'link', href: '#/herramientas/metronomo', label: 'Abrir el metrónomo', hint: '70 bpm, compás de 4/4.' },
      {
        k: 'quiz',
        q: 'Para improvisar sobre una canción en Em, ¿qué pentatónica menor usas?',
        options: ['La de C', 'La de E', 'La de G', 'La de A'],
        answer: 1,
        explain: 'La pentatónica menor de la propia tonalidad: E. En guitarra, la caja 1 empieza en el traste 12 (o en el 0, con las cuerdas al aire).'
      }
    ]
  },

  /* ---------------------------------------------------------- 11 */
  {
    id: 11,
    minutes: 10,
    title: 'Ritmo: lo que de verdad importa',
    subtitle: 'Compás, figuras y cómo acompaña cada instrumento',
    goal: 'Llevar el pulso, contar un compás y tocar un patrón de acompañamiento.',
    blocks: [
      { k: 'p', html: 'Se puede sonar bien con dos acordes y buen ritmo. No se puede sonar bien con veinte acordes y mal ritmo. Este módulo es el más importante del curso.' },
      { k: 'p', html: 'El <em class="term">pulso</em> es el latido constante; su velocidad se mide en <strong>bpm</strong> (pulsaciones por minuto). El <em class="term">compás</em> agrupa los pulsos: en <span class="mono">4/4</span>, de cuatro en cuatro, con acento en el 1.' },
      {
        k: 'table',
        head: ['Figura', 'Dura', 'En 4/4'],
        rows: [
          ['Redonda', '4 pulsos', 'Un compás entero'],
          ['Blanca', '2 pulsos', 'Media'],
          ['<b>Negra</b>', '1 pulso', 'El clic del metrónomo'],
          ['Corchea', '1/2 pulso', 'Los "y" entre números'],
          ['Semicorchea', '1/4 de pulso', 'Se cuenta 1-e-y-a']
        ]
      },
      { k: 'p', html: 'Se cuenta en voz alta: <strong class="mono">1 y 2 y 3 y 4 y</strong>. Los números son los pulsos; los "y" están justo en medio.' },
      {
        k: 'compare',
        title: 'El mismo compás, dos oficios',
        guitar: {
          widget: 'html',
          html: '<div class="rgrid"><span class="on">1<br>&#8595;</span><span class="off">y</span><span class="on">2<br>&#8595;</span><span class="on">y<br>&#8593;</span><span class="off">3</span><span class="on">y<br>&#8593;</span><span class="on">4<br>&#8595;</span><span class="on">y<br>&#8593;</span></div>',
          note: 'El rasgueo más útil del mundo: <strong>abajo · abajo-arriba · (nada)-arriba · abajo-arriba</strong>. La mano no para nunca de bajar y subir; simplemente no toca las cuerdas en el hueco del 3. Practícalo con un solo acorde hasta que sea automático.'
        },
        piano: {
          widget: 'html',
          html: '<div class="rgrid"><span class="on">1<br>B</span><span class="off">y</span><span class="on">2<br>Ac</span><span class="off">y</span><span class="on">3<br>B</span><span class="off">y</span><span class="on">4<br>Ac</span><span class="off">y</span></div>',
          note: 'Acompañamiento básico: <strong>izquierda el bajo</strong> (la raíz) en 1 y 3, <strong>derecha el acorde</strong> en 2 y 4. Es el vals-pop de toda la vida y suena inmediatamente a canción. Variante: bajo en 1, acorde en 2, 3 y 4.'
        }
      },
      { k: 'tip', title: 'Cómo practicar ritmo sin aburrirse', html: 'Metrónomo a <strong>60 bpm</strong>, un solo acorde, dos minutos. Sube a 80 cuando puedas mirar por la ventana mientras lo haces. La meta no es tocar rápido: es que el pulso deje de necesitar tu atención.' },
      { k: 'link', href: '#/herramientas/metronomo', label: 'Abrir el metrónomo', hint: 'Con tap tempo, subdivisiones y acento en el 1.' },
      { k: 'h', text: 'Compás de 3/4 y de 6/8' },
      { k: 'p', html: 'No todo es 4/4. En <span class="mono">3/4</span> se cuenta <strong class="mono">1 2 3</strong> (vals, rancheras): al piano, bajo en 1 y acordes en 2 y 3; a la guitarra, un rasgueo abajo y dos arriba. En <span class="mono">6/8</span> el pulso se divide en tres y aparece ese balanceo de baladas y de blues lento.' },
      {
        k: 'quiz',
        q: 'En 4/4 a 60 bpm, ¿cuánto dura un compás?',
        options: ['1 segundo', '2 segundos', '4 segundos', 'Depende del acorde'],
        answer: 2,
        explain: '60 bpm significa un pulso por segundo. Cuatro pulsos por compás, luego cuatro segundos.'
      },
      { k: 'exercise', title: 'Práctica (4 minutos)', html: 'Con el metrónomo a 70: dos compases de <span class="mono">Am</span> y dos de <span class="mono">F</span>, sin parar, contando en voz alta. Si te pierdes, <strong>no vuelvas a empezar</strong>: engánchate en el siguiente 1. Eso es exactamente lo que hace un músico en directo.' }
    ]
  },

  /* ---------------------------------------------------------- 12 */
  {
    id: 12,
    minutes: 10,
    title: 'Tocar canciones de verdad',
    subtitle: 'Cifrado, ChordPro, cejilla y transporte',
    goal: 'Leer y escribir una canción cifrada, y adaptarla a tu voz o a tu instrumento.',
    blocks: [
      { k: 'p', html: 'Casi nadie toca música popular leyendo partitura: se lee <em class="term">cifrado</em>, es decir, la letra con los acordes encima. El formato estándar para escribirlo en texto se llama <strong>ChordPro</strong> y consiste en meter el acorde entre corchetes justo donde cambia.' },
      { k: 'p', html: 'Por ejemplo:<br><code>[Am]Vamos a la [F]playa, oh oh [C]oh oh [G]oh</code>' },
      { k: 'p', html: 'Además admite directivas entre llaves: <code>{title: ...}</code>, <code>{artist: ...}</code>, <code>{comment: Estribillo}</code>, <code>{start_of_chorus}</code>. Con eso ya tienes un cancionero entero en ficheros de texto que pesan nada.' },
      { k: 'link', href: '#/herramientas/chordpro', label: 'Abrir el editor ChordPro', hint: 'Escribe, transpone y mira los acordes en los dos instrumentos.' },
      { k: 'h', text: 'Transportar: la cejilla y su equivalente al piano' },
      { k: 'p', html: 'Si una canción es demasiado alta para tu voz, <strong>transpórtala</strong>: mueve todos los acordes el mismo número de semitonos. Las relaciones se mantienen, así que sigue siendo la misma canción.' },
      {
        k: 'table',
        head: ['Cejilla en el traste', 'Toco la forma de C', 'Suena'],
        rows: [
          ['0 (sin cejilla)', 'C', '<b>C</b>'],
          ['1', 'C', '<b>C#</b>'],
          ['2', 'C', '<b>D</b>'],
          ['3', 'C', '<b>Eb</b>'],
          ['4', 'C', '<b>E</b>'],
          ['5', 'C', '<b>F</b>']
        ]
      },
      { k: 'note', title: 'Piano contra guitarra, otra vez', html: 'El guitarrista pone la cejilla y sigue tocando las mismas formas: transportar le cuesta <strong>cero</strong>. El pianista tiene que aprender la digitación nueva, pero en cambio ve la armonía entera y puede cambiar de tonalidad <strong>sin cambiar de instrumento ni de posición del cuerpo</strong>. El editor ChordPro de esta página transpone el cifrado por ti: úsalo para comparar las dos vías.' },
      {
        k: 'compare',
        title: 'La misma canción, dos acompañamientos',
        piano: {
          diagrams: [
            { widget: 'piano', from: 48, keys: 15, labels: 'degree', chord: { root: 'A', q: 'min' }, caption: 'Am: raíz izquierda + tríada derecha' },
            { widget: 'piano', from: 48, keys: 15, labels: 'degree', chord: { root: 'F', q: 'maj' }, caption: 'F' },
            { widget: 'piano', from: 48, keys: 15, labels: 'degree', chord: { root: 'C', q: 'maj' }, caption: 'C' },
            { widget: 'piano', from: 48, keys: 15, labels: 'degree', chord: { root: 'G', q: 'maj' }, caption: 'G' }
          ],
          note: 'Toca la raíz con la izquierda y busca la <strong>inversión más cercana</strong> con la derecha en cada cambio. Cuando los acordes se encadenan sin saltos, el acompañamiento suena adulto.',
          play: { kind: 'progression', chords: ['Am', 'F', 'C', 'G'], label: 'Oír la vuelta' }
        },
        guitar: {
          diagrams: [
            { widget: 'chordbox', symbols: ['Am', 'F', 'C', 'G'], size: 'md', caption: 'Am · F · C · G' }
          ],
          note: 'Cuatro compases cada acorde y el rasgueo del módulo 11. Cuando lo tengas, prueba la misma vuelta con cejilla en el traste 2 tocando las formas de <span class="mono">Gm · Eb · Bb · F</span>… o mejor, con cejilla en 2 y las formas de Am/F/C/G: sonará en Bm.',
          play: { kind: 'progression', chords: ['Am', 'F', 'C', 'G'], label: 'Oír la vuelta' }
        }
      },
      { k: 'h', text: 'Qué hacer a partir de aquí' },
      {
        k: 'table',
        head: ['Si toques…', 'Los próximos 30 días'],
        rows: [
          ['<b>Guitarra</b>', 'Domina C-G-Am-F-D-Em con un rasgueo estable. Después: cejilla forma E y forma A, y la caja 1 de pentatónica.'],
          ['<b>Piano</b>', 'Tríadas de las 12 tonalidades con inversiones, mano izquierda con raíz y quinta. Después: acordes de séptima y ii-V-I.'],
          ['<b>Los dos</b>', 'Saca tres canciones que te gusten <b>de oído</b>: identifica la tonalidad, prueba los grados I, IV, V y vi y ajusta. Es el ejercicio que más enseña.']
        ]
      },
      {
        k: 'quiz',
        q: 'Una canción va C – Am – F – G y te queda alta. Transportas dos semitonos abajo. ¿Qué acordes toques?',
        options: ['Bb – Gm – Eb – F', 'D – Bm – G – A', 'C – Am – F – G, con cejilla', 'B – G#m – E – F#'],
        answer: 0,
        explain: 'Dos semitonos abajo: C→Bb, Am→Gm, F→Eb, G→F. Se mantienen los grados I-vi-IV-V, ahora en Bb mayor.'
      },
      { k: 'exercise', title: 'Cierre del curso', html: 'Abre el editor ChordPro, escribe la letra de una canción que te sepas de memoria con sus acordes y transpórtala a la tonalidad que te vaya bien para cantar. Si sabes hacer eso, ya tienes el manejo básico de teoría musical aplicada. Enhorabuena.' }
    ]
  }

  ]);
})();
