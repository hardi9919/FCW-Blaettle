/* FCW-Blaettle - Service Worker */
/* BUILD: 1790838267 */
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
const PDF_CACHE = 'fcw-pdfs-v2';

/* Sofort aktivieren – kein Warten */
self.addEventListener('install', e => { self.skipWaiting(); });

/* Alte Caches aufraumen */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== PDF_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* PDFs: Cache-first (einmal geladen, offline verfuegbar) */
  if (url.pathname.endsWith('.pdf')) {
    /* Range-Requests (von pdf.js fuer Streaming genutzt) NIEMALS cachen.
       Sonst landet eine unvollstaendige Teil-Antwort (206) im Cache und wird
       spaeter faelschlich als komplette Datei ausgeliefert -> "Bad end offset" */
    if (e.request.headers.has('range')) {
      e.respondWith(fetch(e.request));
      return;
    }
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          /* Nur vollstaendige, erfolgreiche Antworten cachen (status 200) */
          if (res.ok && res.status === 200) {
            const clone = res.clone();
            caches.open(PDF_CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }
  /* Alle anderen Dateien (HTML, JS, CSS): HTTP-Cache umgehen, immer aktuell */
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }));
  }
});
self.addEventListener('message',(e)=>{
  if(e.data?.type==='SKIP_WAITING') self.skipWaiting();
});
/* Push-Anzeige und Klick-Verhalten uebernimmt das per importScripts geladene OneSignal-Skript.
   Eigene push/notificationclick-Handler hier wuerden jede Benachrichtigung doppelt anzeigen. */
