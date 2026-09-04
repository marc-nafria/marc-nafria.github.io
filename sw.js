/* ============================================================
   sw.js — el treballador de servei: l'app sencera, fora de línia.

   Ritual de versió: QUALSEVOL canvi de fitxer (el joc inclòs!)
   demana apujar la V d'aquí i el ?v=N d'index.html. La V mana
   sobre la memòria cau: canviar-la ho baixa tot de nou i escombra
   les caus velles. Sense el bump, els visitants es queden amb la
   versió vella per sempre.
   ============================================================ */
var V = '98';
var CORE = 'acords-v' + V;
var FONTS = 'acords-fonts';

/* Tot el que és nostre. Es guarda sense ?v: en servir, la cerca
   s'ignora, així el mateix fitxer val per a qualsevol versió. */
var ASSETS = [
  './',
  'index.html',
  'css/practice.css',
  'js/theory.js',
  'js/audio.js',
  'js/piano.js',
  'js/fretboard.js',
  'js/shapes.js',
  'js/config.js',
  'js/tools.js',
  'js/cercle.js',
  'js/practice.js',
  'js/quina.js',
  'css/quina.css',
  'quinacord/index.html',
  'data/chords.json',
  'icon.svg',
  'icon-512.png',
  'apple-touch-icon.png',
  'manifest.webmanifest'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(CORE).then(function (c) {
      return c.addAll(ASSETS.map(function (a) {
        return new Request(a, { cache: 'reload' });
      }));
    })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CORE && k !== FONTS) { return caches.delete(k); }
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* l'avís d'actualització de la pàgina fa el relleu quan l'usuari vol */
self.addEventListener('message', function (ev) {
  if (ev.data === 'skip') { self.skipWaiting(); }
});

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  if (req.method !== 'GET') { return; }
  var url = new URL(req.url);

  /* les lletres de Google: la primera visita les guarda; després, seves */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    ev.respondWith(
      caches.open(FONTS).then(function (c) {
        return c.match(req).then(function (hit) {
          var net = fetch(req).then(function (res) {
            if (res && (res.ok || res.type === 'opaque')) { c.put(req, res.clone()); }
            return res;
          }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) { return; }

  /* navegar: primer la xarxa (que arribin versions noves), si no, cau */
  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CORE).then(function (c) { c.put('index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('index.html', { ignoreSearch: true });
      })
    );
    return;
  }

  /* la resta del que és nostre: cau primer, ignorant el ?v */
  ev.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CORE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
