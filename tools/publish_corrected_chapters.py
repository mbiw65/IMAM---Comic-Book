#!/usr/bin/env python3
from pathlib import Path
import re, shutil, tempfile, zipfile
from PIL import Image
import img2pdf

ROOT=Path(__file__).resolve().parents[1]
UP=ROOT/'.chapter_uploads'
AS=ROOT/'assets'
SPECS={
  1:dict(zip='issue1.zip',roman='I',title='The Fall of MBIW'),
  2:dict(zip='issue2.zip',roman='II',title='Birth of ÏMAM'),
  3:dict(zip='issue3.zip',roman='III',title='Point of No Return'),
}

def nkey(p):
    m=re.search(r'(\d+)',p.stem)
    return int(m.group(1)) if m else -1

def extract_all(src,dst):
    with zipfile.ZipFile(src) as z:z.extractall(dst)

def build_pdf(webps,out):
    with tempfile.TemporaryDirectory() as tdname:
        td=Path(tdname)
        for maxw,q in [(1400,62),(1200,55),(1050,48)]:
            jpgs=[]
            for i,p in enumerate(webps,1):
                im=Image.open(p).convert('RGB')
                if im.width>maxw:
                    h=round(im.height*maxw/im.width)
                    im=im.resize((maxw,h),Image.Resampling.LANCZOS)
                j=td/f'{i:03}.jpg'
                im.save(j,'JPEG',quality=q,optimize=True,progressive=True)
                jpgs.append(str(j))
            out.write_bytes(img2pdf.convert(jpgs))
            if out.stat().st_size < 24_000_000:return
        raise RuntimeError(f'PDF too large for Cloudflare Pages: {out.stat().st_size}')

def normalize_issue1(tmp,dst):
    cover=next(tmp.rglob('Cover.webp'))
    stories=sorted(list(tmp.rglob('Page_*.webp')),key=nkey)
    src=[cover]+stories
    assert len(src)==25,len(src)
    for i,p in enumerate(src,1):shutil.copy2(p,dst/f'page-{i:02}.webp')
    return [dst/f'page-{i:02}.webp' for i in range(1,26)]

def normalize_issue2(tmp,dst):
    cover=next(tmp.rglob('00_Cover.webp'))
    pages=sorted(list(tmp.rglob('Page_*.webp')),key=nkey)
    src=[cover]+pages
    assert len(src)==42,len(src)
    for i,p in enumerate(src,1):shutil.copy2(p,dst/f'page-{i:02}.webp')
    fixed=list(tmp.rglob('*PAGE11_FIXED.pdf'))
    if fixed and fixed[0].stat().st_size<24_000_000:
        shutil.copy2(fixed[0],dst/'IMAM_Issue_2.pdf')
    return [dst/f'page-{i:02}.webp' for i in range(1,43)]

def normalize_issue3(tmp,dst):
    nested=next(tmp.rglob('IMAM_Chapter_III_WEBP_Pages.zip'))
    nd=tmp/'nested';nd.mkdir()
    extract_all(nested,nd)
    files=sorted(list(nd.rglob('*.webp')),key=nkey)
    assert len(files)==57,len(files)
    for i,p in enumerate(files,1):shutil.copy2(p,dst/f'page-{i:02}.webp')
    return [dst/f'page-{i:02}.webp' for i in range(1,58)]

for i,s in SPECS.items():
    src=UP/s['zip']
    if not src.exists():raise SystemExit(f'Missing {src}')
    dst=AS/f'issue{i}'
    if dst.exists():shutil.rmtree(dst)
    dst.mkdir(parents=True)
    with tempfile.TemporaryDirectory() as tdname:
        td=Path(tdname);extract_all(src,td)
        pages=normalize_issue1(td,dst) if i==1 else normalize_issue2(td,dst) if i==2 else normalize_issue3(td,dst)
    pdf=dst/f'IMAM_Issue_{i}.pdf'
    if not pdf.exists():build_pdf(pages,pdf)

counts={1:25,2:42,3:57}
index=ROOT/'index.html';text=index.read_text(encoding='utf-8')
header='<header class="site-header"><a class="brand" href="./">ÏMAM<span>OFFICIAL COMIC</span></a><nav class="nav"><a href="#issues">Chapters</a><a href="issue1/" data-reader="issue1">Chapter I</a><a href="issue2/" data-reader="issue2">Chapter II</a><a href="issue3/" data-reader="issue3">Chapter III</a></nav></header>'
summ={1:'The fall of MBIW and the awakening of ÏMAM.',2:'The birth of ÏMAM and the transformation of Casablanca.',3:'Point of No Return.'}
hero='<main><section class="hero"><div class="hero-inner"><div class="eyebrow">A dark superhero saga</div><h1>ÏMAM<span>THE REINCARNATION</span></h1><p>MBIW gave everything to protect his city. When the city turned on him, something colder woke inside. Discover the updated chapters.</p><div class="hero-actions"><a class="button primary" href="issue1/" data-reader="issue1">Start Chapter I</a><a class="button" href="issue2/" data-reader="issue2">Read Chapter II</a><a class="button" href="issue3/" data-reader="issue3">Read Chapter III</a></div></div></section><section class="section" id="issues"><div class="section-head"><div><div class="eyebrow">Read online</div><h2>The Chapters</h2></div><p>Updated corrected editions.</p></div><div class="issue-grid">'
for i in (1,2,3):
    s=SPECS[i]
    hero+=(f'<article class="issue-card"><a class="cover-wrap" href="issue{i}/" data-reader="issue{i}"><img src="assets/issue{i}/page-01.webp?v=corrected" alt="ÏMAM Chapter {s["roman"]} cover" loading="lazy"></a>'
           f'<div class="issue-meta"><div class="issue-no">Chapter {s["roman"]} · {counts[i]} pages including cover</div><h3>DAYS BEFORE REINCARNATION</h3><p>{summ[i]}</p>'
           f'<div class="issue-actions"><a class="button primary" href="issue{i}/" data-reader="issue{i}">Read online</a><a class="button" href="assets/issue{i}/IMAM_Issue_{i}.pdf" download>PDF</a></div></div></article>')
hero+='</div></section>'
text=re.sub(r'<header class="site-header">[\s\S]*?</header>',header,text,count=1)
text=re.sub(r'<main>[\s\S]*?(?=<section class="quote">)',hero,text,count=1)
text=re.sub(r'<meta name="description" content="[^"]*">','<meta name="description" content="Read the updated ÏMAM — Days Before Reincarnation comic chapters online.">',text,count=1)
index.write_text(text,encoding='utf-8')

tpl='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ÏMAM — DAYS BEFORE REINCARNATION · Chapter {roman} — {title}</title><link rel="icon" href="/assets/site/favicon.svg"><link rel="stylesheet" href="/styles.css?v=corrected"><link rel="stylesheet" href="/reader-effects.css?v=2"><link rel="stylesheet" href="/reader-no-dots.css?v=1"></head><body class="reader-body" data-pages="{count}"><div class="progress" id="progress"></div><header class="reader-bar"><div class="left"><a class="icon-btn" id="homeLink" href="/">← Home</a><div class="reader-title">DAYS BEFORE REINCARNATION<small>Chapter {roman} — {title}</small></div></div><div class="right"><button class="icon-btn hide-mobile" id="prevPage">←</button><span class="page-counter" id="pageCounter">1 / {count}</span><button class="icon-btn hide-mobile" id="nextPage">→</button><button class="icon-btn" id="fullscreen">⛶</button></div></header><main class="reader-wrap" id="reader"></main><script>(()=>{{const p=new URLSearchParams(location.search),r=p.get('side'),sv=localStorage.getItem('imamverse_side'),side=(r==='mbiw'||r==='imam')?r:((sv==='mbiw'||sv==='imam')?sv:'imam');document.documentElement.dataset.side=side;document.body.dataset.side=side;const reader=document.getElementById('reader');for(let i=1;i<={count};i++){{const n=String(i).padStart(2,'0'),f=document.createElement('figure'),im=document.createElement('img');f.className='comic-page';f.id='page-'+i;f.dataset.page=i;f.dataset.label=i===1?'Cover':'Page '+(i-1);im.src='/assets/issue{num}/page-'+n+'.webp';im.alt='ÏMAM Chapter {roman} — '+(i===1?'Cover':'Page '+(i-1));im.loading=i<=2?'eager':'lazy';im.decoding='async';f.appendChild(im);reader.appendChild(f)}}reader.insertAdjacentHTML('beforeend','<section class="reader-end"><div class="eyebrow">End of Chapter {roman} — {title}</div><h2>{ending}</h2><div class="hero-actions">{nextbtn}<a class="button" href="/assets/issue{num}/IMAM_Issue_{num}.pdf" download>Download PDF</a><a class="button" id="backHome" href="/">Back Home</a></div></section>');const close=e=>{{if(top!==self){{e.preventDefault();parent.postMessage({{type:'imamverse-close-reader'}},location.origin)}}}};['homeLink','backHome'].forEach(id=>{{const x=document.getElementById(id);if(x)x.addEventListener('click',close)}});const nx=document.getElementById('nextIssue');if(nx&&top!==self)nx.addEventListener('click',e=>{{e.preventDefault();parent.postMessage({{type:'imamverse-open-reader',issue:'issue{nextnum}'}},location.origin)}})}}})();</script><script src="/reader-history.js?v=2"></script><script src="/reader.js?v=12"></script></body></html>'''
for i in (1,2,3):
    s=SPECS[i];nxt=i+1
    nextbtn=f'<a class="button primary" id="nextIssue" href="/issue{nxt}/">Read Chapter {SPECS[nxt]["roman"]}</a>' if i<3 else ''
    out=tpl.format(roman=s['roman'],title=s['title'],count=counts[i],num=i,ending='Continue the story.' if i<3 else 'The story continues.',nextbtn=nextbtn,nextnum=min(nxt,3))
    (ROOT/f'issue{i}.html').write_text(out,encoding='utf-8')
print('Prepared corrected chapters',counts)
