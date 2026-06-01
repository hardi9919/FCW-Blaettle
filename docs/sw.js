/* FCW-Blaettle - Service Worker */
/* BUILD: 0 */
const PDF_CACHE = 'fcw-pdfs-v1';

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
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(PDF_CACHE).then(c => c.put(e.request, clone));
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
