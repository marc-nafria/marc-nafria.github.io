# L'estil de la casa

Aquest document és la llei. Si una pantalla nova no sap com vestir-se,
la resposta és aquí. Si una decisió el contradiu, o es canvia la llei
o es canvia la decisió — mai les dues coses a mitges.

## La idea

Una eina per a qui comença i per a qui ja toca, que transmet una manera
concreta d'entendre la música: **de l'escala surten els graus, dels
graus les funcions emocionals, de les funcions els acords, dels acords
les progressions, i el cercle de quintes ho lliga tot** — la tonalitat
és un lloc, i transposar és mirar el mateix des d'un altre lloc.

L'app té **dues velocitats**:

- **A mà** — obres l'app i tens l'acord viu amb el seu instrument, i
  les eines (afinador, tempo). Consulta immediata, zero fricció.
- **Explorar** — llisques i penses: el cercle (tonalitat, família,
  rondes d'acords), l'escala (graus i funcions). Aquí es descobreix.

Dues unitats que ho mantenen endreçat: **una tonalitat** (la del
cercle mana a tota l'app) i **un instrument** (piano o guitarra,
triat a configuració, res duplicat).

## Els fonaments

- **El clar és la pell per defecte**: paper `#F4F1EB`, tinta `#141210`,
  ocre `#B08B3C`. El fosc es tria: negre càlid `#060605`, blanc càlid
  `#F4F1EB`, beix `#DCC9A6`.
- La profunditat la fa la **llum**, no el color: llum principal alta,
  contrallum tènue, vinyeta a les vores i **gra** per sobre. Tot mate.
- **Cap caixa.** Tipografia sobre vidre. Les vores es fonen
  (màscares), no es tallen.
- El beix és car: només per a l'accent, l'extensió, allò triat i
  allò que sona.

## Les tres lletres — rols fixos, no es trien

La tipografia no és una preferència de l'usuari: és **el repartiment
de veus** de l'app. Cada família té un paper i no el canvia mai.

- **Outfit (900/800)** — *la veu de l'app*. L'acord viu, les xifres,
  els microcaps, els botons. El present, la interfície, la màquina.
- **Fraunces (900)** — *la veu de la música*. Les tonalitats, el
  «dia.» del joc, allò que sona i mana. Quan parla la matèria musical,
  parla Fraunces.
- **Instrument Serif (itàlica)** — *la veu que xiuxiueja*. «L'acord»,
  els graus menors, les funcions emocionals (*tònica, dominant…*),
  tot allò que explica sense cridar.

**Jugar sempre amb el cos i la família.** Cap composició amb una sola
mida: els lockups barregen les tres veus i com a mínim dos salts de
cos (el gran canta, el microcap situa, la itàlica respira). El model
és el lockup del joc: *L'acord* / DEL / **dia.**

## Els graus: la inscripció llatina

Cada grau duu la seva marca, perquè es reconegui d'un cop d'ull sense
haver de comptar pals. Majors en rodona; **menors en itàlica** (la
veu que xiuxiueja). Les marques, en beix.

| Grau | Inscripció | La marca |
|------|-----------|----------|
| I    | `I` rodona, neta | cap ornament: és **casa** |
| ii   | `ii` itàlica | els **dos pals bessons** ja són la marca |
| iii  | `iii` itàlica amb **filet al damunt** | tres germans sota un mateix sostre |
| IV   | `IV` amb **el peu de la casa a sota** | el descans: té on seure |
| V    | `V` amb **una espurna ✦ al muscle** | brilla, i demana tornar |
| vi   | `vi` itàlica, mig to apagada | la mateixa casa amb la llum trista |
| vii° | `vii` itàlica amb **l'anelleta °** | de puntetes, mai no reposa |

Al dial (SVG) les marques es dibuixen (traç 1.2–1.6, caps rodons);
en HTML, el peu és el subratllat de la casa, l'espurna és el caràcter
✦ i l'anelleta el ° tipogràfic — sempre en beix.

## El color dels papers

- `--text` blanc càlid: el que és.
- `--beige` : el que sona, el que està triat, l'accent.
- `--muted` / `--dim`: el que espera.
- `--ok` verd oliva: encertar (només a l'oïda).
- `--bad` terracota: l'errada, que es queda (no castiga, ensenya).

## El moviment

- Entrades i sortides de capes: **fade .2s / .18s**.
- El canvi (acord, tema): **desenfocar, canviar, enfocar**
  (`fx-out .13s` / `fx-in .34s` amb corba `.2,.8,.2,1`).
- Les entrades escèniques: blur + opacitat (`q-in .55s`).
- El dial gira amb **inèrcia de roda de debò** (fricció exponencial,
  encaix a la tonalitat més propera). Mentre el dit mana, cap transició.
- `prefers-reduced-motion`: tot quiet, sempre.

## Els rètols de camí

Als peus del pla de l'instrument, dos **senyals de fusta**: rectangle
acabat en punxa amb un pal curt que s'esvaeix cap avall — eines a
l'esquerra, «explora!» a la dreta. Són l'única llicència d'**emoji**
de la casa (com a senyal de trànsit); tota la resta d'icones es
dibuixa a mà.

## Les icones

Dibuixades a mà alçada, mai glifs de font ni emojis: traç 2–2.6,
caps i unions rodons, una mica descompensades perquè respirin
(la fletxa de tornar, les fletxes del coach, l'espurna del V,
fer gran / fer petita). Una icona = un traç reconeixible, cap detall.

## El so

Una sola veu per a tot (coixí o elèctric, a configuració). Tocar una
cosa és sentir-la: cap acció musical muda. El metrònom va planificat
sobre el rellotge d'àudio i sobreviu al canvi de pla.

## La veu escrita

Català, sempre. **Microcaps** (.58rem, tracking .16em) per situar,
mai per explicar. Zero còpia explicativa: la pedagogia va als
**coachs** (una línia, minúscula, que apareix un cop i desapareix per
sempre) i a la interacció mateixa. Els rètols diuen coses de persona:
«toca el punt per escoltar», «gira la roda per transposar»,
«posa els acords que vulguis».
