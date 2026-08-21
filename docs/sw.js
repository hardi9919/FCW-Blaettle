/* FCW-Blaettle - Service Worker */
/* BUILD: 1787327551 */
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
  /* Alle anderen Dateien (HTML, JS, CSS): IMMER vom Server holen */
  /* Kein Caching = immer aktuell */
});
self.addEventListener('message',(e)=>{
  if(e.data?.type==='SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('push',(e)=>{
  const data=e.data?.json()||{};
  e.waitUntil(self.registration.showNotification(data.title||'FCW-Blaettle',{
    body:data.body||'Neue Ausgabe verfuegbar!',
    icon:data.icon||'/icons/icon-192.png',
    badge:'/icons/icon-192.png',
    data:{url:data.url||'/'},
    vibrate:[200,100,200]
  }));
});
self.addEventListener('notificationclick',(e)=>{
  e.notification.close();
  const url=e.notification.data?.url||'/';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(wins=>{
    const ex=wins.find(w=>w.url.includes(self.location.origin));
    if(ex)return ex.focus();
    return clients.openWindow(url);
  }));
});
