(() => {
  const count=Number(document.body.dataset.pages||0);
  const counter=document.querySelector('#pageCounter');
  const progress=document.querySelector('#progress');
  const pages=[...document.querySelectorAll('.comic-page')];
  const current={page:1};

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
  document.querySelector('#fullscreen')?.addEventListener('click',()=>{
    if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

  addEventListener('keydown',e=>{
    if(['ArrowRight','PageDown'].includes(e.key))go(1);
    if(['ArrowLeft','PageUp'].includes(e.key))go(-1);
  });

  addEventListener('scroll',()=>{
    const max=document.documentElement.scrollHeight-innerHeight;
    if(progress)progress.style.width=`${max>0?(scrollY/max)*100:0}%`;
  },{passive:true});
})();