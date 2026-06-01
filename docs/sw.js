/* FCW-Blaettle - Service Worker */
/* CACHE_VERSION wird automatisch vom GitHub Actions Workflow aktualisiert */
const CACHE_NAME='fcw-blaettle-v1780301869';
const STATIC=['/','/index.html','/style.css','/app.js','/manifest.json','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',(e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(STATIC)));
  self.skipWaiting();
});
self.addEventListener('activate',(e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
  self.clients.claim();
});
function networkFirst(e){
  return fetch(e.request).then(res=>{
    const c=res.clone();
    caches.open(CACHE_NAME).then(ca=>ca.put(e.request,c));
    return res;
  }).catch(()=>caches.match(e.request));
}
function cacheFirst(e){
  return caches.match(e.request).then(cached=>{
    if(cached)return cached;
    return fetch(e.request).then(res=>{const c=res.clone();caches.open(CACHE_NAME).then(ca=>ca.put(e.request,c));return res;});
  });
}
self.addEventListener('fetch',(e)=>{
  const url=new URL(e.request.url);
  // PDFs: Cache-first (gross, sollen offline verfuegbar bleiben)
  if(url.pathname.endsWith('.pdf')){ e.respondWith(cacheFirst(e)); return; }
  // App-Dateien: Network-first (immer aktuell wenn online)
  if(url.pathname.match(/\.(html|js|css|json|png|ico)$/) || url.pathname.endsWith('/')){
    e.respondWith(networkFirst(e)); return;
  }
  e.respondWith(networkFirst(e));
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
