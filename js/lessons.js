/* ============================================================
   lessons.js - course registry.
   Content lives in lessons-1.js (fundamentos) and lessons-2.js
   (armonía, ritmo y práctica) and registers itself here.

   Block kinds understood by the renderer (app.js):
     h            {text}
     p            {html}
     note|tip|exercise  {title?, html}
     compare      {title?, piano:<pane>, guitar:<pane>}
     chords       {title?, symbols:[...], html?}
     quiz         {q, options:[...], answer:index, explain}
     table        {head:[...], rows:[[...]]}
     intervalTable {}
     link         {href, label, hint?}

   A <pane> is {label?, note?, play?, ...widgetSpec} or
   {label?, note?, play?, diagrams:[widgetSpec, ...]}.

   widgetSpec:
     {widget:'piano', from, keys, labels, scale, chord, extra, midiMarks, caption}
     {widget:'fret',  fromFret, toFret, stringsSubset, labels, scale, chord,
                      extra, midiMarks, caption}
     {widget:'chordbox', symbols:[...], size, caption}
     {widget:'html', html}

   play: {kind:'chord'|'scale'|'progression'|'notes', root, type, q,
          chords:[...], midis:[...], baseMidi, label}
   ============================================================ */
(function (global) {
  'use strict';

  var list = [];

  function add(modules) {
    modules.forEach(function (m) { list.push(m); });
    list.sort(function (a, b) { return a.id - b.id; });
  }

  function all() { return list; }

  function byId(id) {
    var n = parseInt(id, 10);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === n) { return list[i]; }
    }
    return null;
  }

  function indexOfId(id) {
    var n = parseInt(id, 10);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === n) { return i; }
    }
    return -1;
  }

  function totalMinutes() {
    return list.reduce(function (acc, m) { return acc + (m.minutes || 0); }, 0);
  }

  global.Lessons = {
    add: add,
    all: all,
    byId: byId,
    indexOfId: indexOfId,
    totalMinutes: totalMinutes
  };
})(window);
