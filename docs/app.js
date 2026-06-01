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
  try {
    await O.init({
      appId: CONFIG.oneSignalAppId,
      notifyButton: { enable: false },
    });
    window._osReady = true;
    if(O.User.PushSubscription.optedIn){
      document.getElementById('notif-btn').classList.add('active');
    }
  } catch(err) {
    console.error('OneSignal init error:', err);
    window._osError = err.message;
  }
});

document.getElementById('notif-btn').addEventListener('click', async () => {
  const btn = document.getElementById('notif-btn');

  if (!window._osReady) {
    alert('Benachrichtigungen werden geladen... Bitte kurz warten und nochmal tippen.\n\nFehler: ' + (window._osError || 'OneSignal nicht bereit'));
    return;
  }

  try {
    const sub = OneSignal.User.PushSubscription;
    if (sub.optedIn) {
      await sub.optOut();
      btn.classList.remove('active');
      alert('Benachrichtigungen deaktiviert.');
    } else {
      await OneSignal.Notifications.requestPermission();
      await sub.optIn();
      btn.classList.add('active');
      alert('Benachrichtigungen aktiviert!');
    }
  } catch(err) {
    alert('Fehler: ' + err.message);
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
document.querySelectorAll('.nav-item:not(.nav-impressum)').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view)));

// Impressum Modal
document.getElementById('impressum-btn').addEventListener('click',()=>{
  document.getElementById('impressum-modal').classList.remove('hidden');
});
document.getElementById('impressum-close').addEventListener('click',()=>{
  document.getElementById('impressum-modal').classList.add('hidden');
});
document.getElementById('impressum-modal').addEventListener('click',(e)=>{
  if(e.target===e.currentTarget) document.getElementById('impressum-modal').classList.add('hidden');
});
document.getElementById('btn-back').addEventListener('click',()=>{
  document.getElementById('pdf-strip').innerHTML='';
  setZoom(1);
  showView('archive');
});

// Zoom (nur Desktop)
let currentZoom = 1;
function setZoom(z) {
  currentZoom = Math.min(3, Math.max(0.5, Math.round(z * 4) / 4));
  // Alle Seiten skalieren
  document.querySelectorAll('.pdf-page').forEach(img => {
    const bw = parseFloat(img.dataset.baseW);
    const bh = parseFloat(img.dataset.baseH);
    if (bw && bh) {
      img.style.width  = (bw * currentZoom) + 'px';
      img.style.height = (bh * currentZoom) + 'px';
    }
  });
  const el = document.getElementById('zoom-level');
  if (el) el.textContent = Math.round(currentZoom * 100) + '%';
}
document.getElementById('zoom-in') .addEventListener('click', () => setZoom(currentZoom + 0.25));
document.getElementById('zoom-out').addEventListener('click', () => setZoom(currentZoom - 0.25));

// Strg + Mausrad zum Zoomen
document.getElementById('pdf-strip').addEventListener('wheel', (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  setZoom(currentZoom + (e.deltaY < 0 ? 0.25 : -0.25));
}, { passive: false });

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

  // 3x Renderaufloesung: scharfer Zoom bis 300% ohne Qualitaetsverlust
  const renderFactor = 3;

  for(let i=1;i<=totalPages;i++){
    const page=await pdf.getPage(i);
    const vp0=page.getViewport({scale:1});
    // Fit-to-screen: Seite passt komplett in Breite UND Hoehe
    const displayScale=Math.min(stripW/vp0.width, stripH/vp0.height);
    const renderScale=displayScale*renderFactor;
    const vp=page.getViewport({scale:renderScale});
    const canvas=document.createElement('canvas');
    canvas.width=vp.width; canvas.height=vp.height;
    await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
    const img=document.createElement('img');
    img.src=canvas.toDataURL('image/jpeg',0.93);
    img.className='pdf-page';
    img.dataset.page=i;
    const dispW=Math.round(vp0.width*displayScale);
    const dispH=Math.round(vp0.height*displayScale);
    // Basisgroesse fuer Zoom merken
    img.dataset.baseW=dispW;
    img.dataset.baseH=dispH;
    img.style.width=dispW+'px';
    img.style.height=dispH+'px';
    strip.appendChild(img);
  }

  // Seitenanzeige per Scroll aktualisieren
  strip.scrollLeft=0;
  document.getElementById('page-info').textContent='Seite 1 / '+totalPages;
  strip.addEventListener('scroll',()=>{
    if(!strip.firstElementChild)return;
    const pageW=strip.firstElementChild.clientWidth+6; // +6 fuer gap
    if(pageW===0)return;
    const cur=Math.round(strip.scrollLeft/pageW)+1;
    document.getElementById('page-info').textContent='Seite '+Math.min(cur,totalPages)+' / '+totalPages;
  },{passive:true});

  // Maus-Drag zum Verschieben (Desktop)
  let isDragging=false, dragStartX=0, dragStartY=0, dragScrollX=0, dragScrollY=0;
  strip.addEventListener('mousedown',(e)=>{
    isDragging=true;
    dragStartX=e.clientX; dragStartY=e.clientY;
    dragScrollX=strip.scrollLeft; dragScrollY=strip.scrollTop;
    strip.style.cursor='grabbing';
    e.preventDefault();
  });
  window.addEventListener('mousemove',(e)=>{
    if(!isDragging)return;
    strip.scrollLeft=dragScrollX-(e.clientX-dragStartX);
    strip.scrollTop =dragScrollY-(e.clientY-dragStartY);
  });
  window.addEventListener('mouseup',()=>{ isDragging=false; strip.style.cursor='grab'; });

  // Navigations-Buttons (Desktop)
  function scrollToPage(dir){
    if(!strip.firstElementChild)return;
    const pageW=strip.firstElementChild.clientWidth+6;
    strip.scrollBy({left: dir*pageW, behavior:'smooth'});
  }
  document.getElementById('btn-prev').onclick=()=>scrollToPage(-1);
  document.getElementById('btn-next').onclick=()=>scrollToPage(1);
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
