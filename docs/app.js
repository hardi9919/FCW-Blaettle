/* FCW-Blaettle - App Logic */
const CONFIG = { oneSignalAppId: '5e6a5c8a-eb23-46a0-b26f-f806ad6d109f', pdfListUrl: 'pdfs/index.json' };
let allIssues=[], totalPages=0;

if ('serviceWorker' in navigator) {
  // updateViaCache:'none' = Browser holt sw.js IMMER vom Server, nie aus Cache
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {

    // Sofort aktivieren falls schon ein neuer SW wartet
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // Neuen SW erkennen und sofort aktivieren
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed') {
          newSW.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    // Nach Aktivierung: Seite neu laden
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    // Beim Oeffnen der App aktiv nach Updates suchen
    reg.update();

    // Auch wenn App aus dem Hintergrund kommt
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update();
    });

  }).catch(console.error);
}

window.OneSignalDeferred=window.OneSignalDeferred||[];
OneSignalDeferred.push(async(O)=>{
  await O.init({
    appId: CONFIG.oneSignalAppId,
    notifyButton: { enable: false },
  });
  // Glocke aktiv faerben wenn bereits angemeldet
  if(O.User.PushSubscription.optedIn){
    document.getElementById('notif-btn').classList.add('active');
  }
});

document.getElementById('notif-btn').addEventListener('click', async () => {
  if (!window.OneSignal) return;
  const sub = OneSignal.User.PushSubscription;
  if (sub.optedIn) {
    // Bereits angemeldet -> abmelden
    await sub.optOut();
    document.getElementById('notif-btn').classList.remove('active');
  } else {
    // Anmelden
    await OneSignal.Notifications.requestPermission();
    await sub.optIn();
    document.getElementById('notif-btn').classList.add('active');
  }
});

let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',(e)=>{
  e.preventDefault(); deferredInstallPrompt=e;
  document.getElementById('install-banner').classList.remove('hidden');
});
document.getElementById('install-btn').addEventListener('click',async()=>{
  if(!deferredInstallPrompt)return;
  deferredInstallPrompt.prompt();
  const{outcome}=await deferredInstallPrompt.userChoice;
  if(outcome==='accepted')document.getElementById('install-banner').classList.add('hidden');
  deferredInstallPrompt=null;
});
document.getElementById('install-close').addEventListener('click',()=>
  document.getElementById('install-banner').classList.add('hidden'));

const isIos=/iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone=window.matchMedia('(display-mode: standalone)').matches;
if(isIos&&!isStandalone){
  const b=document.getElementById('install-banner');
  b.querySelector('span').textContent='Tippe auf "Teilen" dann "Zum Home-Bildschirm" um die App zu installieren';
  b.classList.remove('hidden');
}

function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(name==='latest'&&allIssues.length>0){
    openReader(allIssues[0]);
    document.querySelector('[data-view="latest"]').classList.add('active');
    return;
  }
  const view=document.getElementById('view-'+name);
  if(view)view.classList.add('active');
  document.querySelector('[data-view="'+name+'"]')?.classList.add('active');
}
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view)));
document.getElementById('btn-back').addEventListener('click',()=>{
  document.getElementById('pdf-strip').innerHTML='';
  showView('archive');
});

async function loadIssues(){
  try{ const res=await fetch(CONFIG.pdfListUrl+'?t='+Date.now()); allIssues=await res.json(); }
  catch{ allIssues=[]; }
  renderArchive();
}

function renderArchive(){
  const grid=document.getElementById('archive-grid');
  if(allIssues.length===0){
    grid.innerHTML='<div class="loading-spinner">Noch keine Ausgaben vorhanden.</div>';
    return;
  }
  grid.innerHTML=allIssues.map((issue,i)=>`
    <div class="archive-card ${i===0?'card-new':''}" data-index="${i}" tabindex="0" role="button">
      <div class="card-thumb-placeholder">
        <div class="pdf-icon">&#128240;</div>
        <div class="pdf-label">${issue.title}</div>
      </div>
      <div class="card-info">
        <div class="card-title">${issue.title}</div>
        <div class="card-date">${formatDate(issue.date)}</div>
        <div class="card-badge">NEU</div>
      </div>
    </div>`).join('');
  grid.querySelectorAll('.archive-card').forEach(card=>{
    const open=()=>openReader(allIssues[parseInt(card.dataset.index)]);
    card.addEventListener('click',open);
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')open();});
  });
}

function formatDate(d){
  if(!d)return '';
  return new Date(d).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
}

async function openReader(issue){
  document.getElementById('reader-title').textContent=issue.title;
  document.getElementById('view-archive').classList.remove('active');
  document.getElementById('view-reader').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const strip=document.getElementById('pdf-strip');
  strip.innerHTML='<div class="loading-spinner" style="color:white;width:100%;padding:40px;text-align:center;">Lade Blaettle...</div>';
  document.getElementById('page-info').textContent='';
  try{ await renderPdfStrip(issue.url); }
  catch(err){ strip.innerHTML='<div class="loading-spinner" style="color:red;width:100%;padding:40px;text-align:center;">Fehler: '+err.message+'</div>'; }
}

async function renderPdfStrip(pdfUrl){
  pdfjsLib.GlobalWorkerOptions.workerSrc=
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const pdf=await pdfjsLib.getDocument(pdfUrl).promise;
  totalPages=pdf.numPages;

  const strip=document.getElementById('pdf-strip');
  strip.innerHTML='';

  // Verfuegbare Breite und Hoehe des Strips
  const stripW=strip.clientWidth  || window.innerWidth;
  const stripH=strip.clientHeight || window.innerHeight-168;

  // Hoehere Aufloesung fuer scharfen Zoom
  const dpr=Math.min(window.devicePixelRatio||1, 3);

  for(let i=1;i<=totalPages;i++){
    const page=await pdf.getPage(i);
    const vp0=page.getViewport({scale:1});
    // Fit-to-screen: Seite passt komplett in Breite UND Hoehe
    const displayScale=Math.min(stripW/vp0.width, stripH/vp0.height);
    // Renderaufloesung: dpr-fach hoeher fuer scharfen Pinch-Zoom
    const renderScale=displayScale*dpr;
    const vp=page.getViewport({scale:renderScale});
    const canvas=document.createElement('canvas');
    canvas.width=vp.width; canvas.height=vp.height;
    await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
    const img=document.createElement('img');
    img.src=canvas.toDataURL('image/jpeg',0.93);
    img.className='pdf-page';
    img.dataset.page=i;
    // CSS-Groesse: Seite exakt so gross wie sie auf dem Screen erscheinen soll
    const dispW=Math.round(vp0.width*displayScale);
    const dispH=Math.round(vp0.height*displayScale);
    img.style.width=dispW+'px';
    img.style.height=dispH+'px';
    strip.appendChild(img);
  }

  // Seitenanzeige per Scroll aktualisieren
  strip.scrollLeft=0;
  document.getElementById('page-info').textContent='Seite 1 / '+totalPages;
  strip.addEventListener('scroll',()=>{
    if(!strip.firstElementChild)return;
    const pageW=strip.firstElementChild.clientWidth;
    if(pageW===0)return;
    const cur=Math.round(strip.scrollLeft/pageW)+1;
    document.getElementById('page-info').textContent='Seite '+Math.min(cur,totalPages)+' / '+totalPages;
  },{passive:true});
}

async function init(){
  await loadIssues();
  // Standardmaessig die aktuellste Ausgabe direkt oeffnen
  if(allIssues.length>0){
    showView('latest');
  } else {
    showView('archive');
  }
}
init();
