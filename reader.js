(() => {
  const count=Number(document.body.dataset.pages||0);
  const counter=document.querySelector('#pageCounter');
  const progress=document.querySelector('#progress');
  const pages=[...document.querySelectorAll('.comic-page')];
  const current={page:1};
  const readerBar=document.querySelector('.reader-bar');
  const fullscreenBtn=document.querySelector('#fullscreen');

  pages.forEach(fig=>{
    const img=fig.querySelector('img');
    if(!img) return;

    // The repository stores the comic pages as WebP. Older reader HTML
    // referenced .jpg files, so normalize those paths automatically.
    const original=img.getAttribute('src')||'';
    if(/\.jpg$/i.test(original)) {
      img.setAttribute('src', original.replace(/\.jpg$/i,'.webp'));
    }

    img.addEventListener('error',()=>{
      fig.classList.add('load-error');
      fig.innerHTML=`<div class="asset-error"><strong>Page ${fig.dataset.page} could not load.</strong><span>The comic asset is missing from GitHub.</span></div>`;
    },{once:true});
  });

  const io=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible)return;
    current.page=Number(visible.target.dataset.page);
    if(counter)counter.textContent=`${current.page} / ${count}`;
    history.replaceState(null,'',`#page-${current.page}`);
  },{threshold:[.25,.5,.75]});

  pages.forEach(p=>io.observe(p));

  function go(delta){
    const n=Math.min(count,Math.max(1,current.page+delta));
    document.querySelector(`#page-${n}`)?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  document.querySelector('#prevPage')?.addEventListener('click',()=>go(-1));
  document.querySelector('#nextPage')?.addEventListener('click',()=>go(1));

  // When opened inside the main-site reader overlay, fullscreen the iframe itself.
  // That removes the outer "Close reader" bar too, leaving only the comic canvas.
  let hostFrame=null,hostDocument=null;
  try{
    if(window.frameElement){
      hostFrame=window.frameElement;
      hostDocument=hostFrame.ownerDocument;
    }
  }catch(e){}

  const isReaderFullscreen=()=>{
    const local=!!(document.fullscreenElement||document.webkitFullscreenElement);
    const hosted=!!(hostDocument&&hostFrame&&(hostDocument.fullscreenElement===hostFrame||hostDocument.webkitFullscreenElement===hostFrame));
    return local||hosted;
  };

  const syncFullscreenUI=()=>{
    const active=isReaderFullscreen();
    if(readerBar)readerBar.style.display=active?'none':'';
    if(fullscreenBtn){
      fullscreenBtn.textContent=active?'⛶':'⛶';
      fullscreenBtn.setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');
      fullscreenBtn.title=active?'Exit fullscreen':'Enter fullscreen';
    }
  };

  fullscreenBtn?.addEventListener('click',async()=>{
    try{
      if(isReaderFullscreen()){
        if(hostDocument&&(hostDocument.fullscreenElement||hostDocument.webkitFullscreenElement)){
          if(hostDocument.exitFullscreen)await hostDocument.exitFullscreen();
          else hostDocument.webkitExitFullscreen?.();
        }else{
          if(document.exitFullscreen)await document.exitFullscreen();
          else document.webkitExitFullscreen?.();
        }
      }else if(hostFrame){
        if(hostFrame.requestFullscreen)await hostFrame.requestFullscreen();
        else if(hostFrame.webkitRequestFullscreen)hostFrame.webkitRequestFullscreen();
        else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
      }else if(document.documentElement.requestFullscreen){
        await document.documentElement.requestFullscreen();
      }else{
        document.documentElement.webkitRequestFullscreen?.();
      }
    }catch(e){
      try{await document.documentElement.requestFullscreen?.();}catch(_){}
    }
    syncFullscreenUI();
  });

  document.addEventListener('fullscreenchange',syncFullscreenUI);
  document.addEventListener('webkitfullscreenchange',syncFullscreenUI);
  try{
    hostDocument?.addEventListener('fullscreenchange',syncFullscreenUI);
    hostDocument?.addEventListener('webkitfullscreenchange',syncFullscreenUI);
  }catch(e){}

  addEventListener('keydown',e=>{
    if(['ArrowRight','PageDown'].includes(e.key))go(1);
    if(['ArrowLeft','PageUp'].includes(e.key))go(-1);
  });

  addEventListener('scroll',()=>{
    const max=document.documentElement.scrollHeight-innerHeight;
    if(progress)progress.style.width=`${max>0?(scrollY/max)*100:0}%`;
  },{passive:true});

  syncFullscreenUI();
})();