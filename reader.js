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

  // The reader can be embedded inside the main site's overlay.
  let hostFrame=null,hostDocument=null,hostOverlayBar=null;
  try{
    if(window.frameElement){
      hostFrame=window.frameElement;
      hostDocument=hostFrame.ownerDocument;
      hostOverlayBar=hostDocument.querySelector('.reader-overlay-bar');
    }
  }catch(e){}

  // Desktop cinematic chrome: both the inner navigation bar and the outer
  // "Close reader" bar disappear after a moment and return on hover.
  const finePointer=window.matchMedia?.('(hover:hover) and (pointer:fine)').matches;
  const chromeTimers=new WeakMap();
  const showChrome=(bar)=>{
    if(!bar)return;
    const old=chromeTimers.get(bar);if(old)clearTimeout(old);
    bar.style.opacity='1';
    bar.style.transform='translateY(0)';
    bar.style.visibility='visible';
  };
  const hideChrome=(bar,delay=300)=>{
    if(!bar||!finePointer)return;
    const old=chromeTimers.get(bar);if(old)clearTimeout(old);
    const timer=setTimeout(()=>{
      bar.style.opacity='0';
      bar.style.transform='translateY(-8px)';
    },delay);
    chromeTimers.set(bar,timer);
  };
  const wireChrome=(bar)=>{
    if(!bar||!finePointer)return;
    bar.style.transition='opacity .22s ease, transform .22s ease';
    bar.onmouseenter=()=>showChrome(bar);
    bar.onmouseleave=()=>hideChrome(bar,250);
    showChrome(bar);
    hideChrome(bar,1500);
  };
  wireChrome(readerBar);
  wireChrome(hostOverlayBar);

  // Fullscreen the iframe itself when embedded. This covers the parent overlay
  // and removes the outer Close reader bar. The inner bar is hidden completely.
  const isReaderFullscreen=()=>{
    const local=!!(document.fullscreenElement||document.webkitFullscreenElement);
    const hosted=!!(hostDocument&&hostFrame&&(hostDocument.fullscreenElement===hostFrame||hostDocument.webkitFullscreenElement===hostFrame));
    return local||hosted;
  };

  const syncFullscreenUI=()=>{
    const active=isReaderFullscreen();
    if(readerBar)readerBar.style.display=active?'none':'';
    if(fullscreenBtn){
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