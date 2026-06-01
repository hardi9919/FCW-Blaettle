/* FCW-Blaettle - App Logic */
const CONFIG = { oneSignalAppId: 'DEINE-ONESIGNAL-APP-ID', pdfListUrl: 'pdfs/index.json' };
let allIssues=[], pageFlip=null, totalPages=0;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    // Neuen Service Worker erkennen und automatisch aktivieren
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          // Neuer Inhalt verfuegbar – Seite automatisch neu laden
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
          });
          newSW.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
  }).catch(console.error);
}

window.OneSignalDeferred=window.OneSignalDeferred||[];
OneSignalDeferred.push(async(O)=>{
  await O.init({appId:CONFIG.oneSignalAppId,notifyButton:{enable:false},allowLocalhostAsSecureOrigin:true});
});

document.getElementById('notif-btn').addEventListener('click',async()=>{
  if(!window.OneSignal)return;
  if(!(await OneSignal.Notifications.permission)) await OneSignal.Notifications.requestPermission();
  document.getElementById('notif-btn').classList.toggle('active');
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
document.getElementById('btn-back').addEventListener('click',()=>{destroyFlipbook();showView('archive');});

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
  document.getElementById('flipbook-container').innerHTML='<div class="loading-spinner">Lade Blaettle...</div>';
  document.getElementById('page-info').textContent='';
  try{ await renderPdfToFlipbook(issue.url); }
  catch(err){ document.getElementById('flipbook-container').innerHTML=
    '<div class="loading-spinner" style="color:red">Fehler: '+err.message+'</div>'; }
}

async function renderPdfToFlipbook(pdfUrl){
  pdfjsLib.GlobalWorkerOptions.workerSrc=
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const pdf=await pdfjsLib.getDocument(pdfUrl).promise;
  totalPages=pdf.numPages;
  const pages=[];
  for(let i=1;i<=totalPages;i++){
    const page=await pdf.getPage(i);
    const scale=(window.innerWidth - 16)/page.getViewport({scale:1}).width;
    const vp=page.getViewport({scale});
    const canvas=document.createElement('canvas');
    canvas.width=vp.width; canvas.height=vp.height;
    await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
    pages.push({src:canvas.toDataURL('image/jpeg',0.92),w:vp.width,h:vp.height});
  }
  buildFlipbook(pages);
}

function buildFlipbook(pages){
  destroyFlipbook();
  const container=document.getElementById('flipbook-container');
  container.innerHTML='';
  const el=document.createElement('div');
  el.id='flipbook';
  container.appendChild(el);
  pageFlip=new St.PageFlip(el,{
    width:pages[0].w,height:pages[0].h,
    size:'fixed',showCover:true,
    mobileScrollSupport:true,usePortrait:true,autoSize:true
  });
  const divs=pages.map(p=>{
    const div=document.createElement('div');
    div.className='page';
    div.style.cssText='background:white;overflow:hidden;';
    const img=document.createElement('img');
    img.src=p.src;
    img.style.cssText='width:100%;height:100%;object-fit:cover;display:block;';
    div.appendChild(img);
    return div;
  });
  pageFlip.loadFromHTML(divs);
  pageFlip.on('flip',updatePageInfo);
  updatePageInfo();
  document.getElementById('btn-prev').onclick=()=>pageFlip?.flipPrev();
  document.getElementById('btn-next').onclick=()=>pageFlip?.flipNext();
}

function updatePageInfo(){
  if(!pageFlip)return;
  document.getElementById('page-info').textContent=
    'Seite '+(pageFlip.getCurrentPageIndex()+1)+' / '+totalPages;
}

function destroyFlipbook(){
  if(pageFlip){try{pageFlip.destroy();}catch{} pageFlip=null;}
  document.getElementById('flipbook-container').innerHTML='';
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
