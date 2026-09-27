#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
import img2pdf, shutil, tempfile, zipfile

ROOT=Path(__file__).resolve().parents[1]
PAYLOAD=ROOT/'.chapter_uploads'/'dotfix'/'IMAM_Website_Update_Payload.zip'
ASSETS=ROOT/'assets'
MISSING={46,47,56,57,58,59,60,61,66,67,68,69,70,71}
ROWS={1:(0,64),2:(1536,69),3:(4365,69)}
COVER_CROPS={1:(0,600),2:(600,1320),3:(1320,2040)}
COVER_RECTS={
    1:(118/480,0,182/480,72/600),
    2:(88/480,0,160/480,78/720),
    3:(88/480,0,160/480,78/720),
}

def save_webp(im,path,quality=88):
    path.parent.mkdir(parents=True,exist_ok=True)
    im.convert('RGB').save(path,'WEBP',quality=quality,method=6)

def patch_interior(im,patches,issue,page):
    base,row_h=ROWS[issue]
    row=page-2
    patch=patches.crop((0,base+row*row_h,98,base+(row+1)*row_h))
    scale=im.width/1024.0
    patch=patch.resize((max(1,round(98*scale)),max(1,round(row_h*scale))),Image.Resampling.LANCZOS)
    out=im.convert('RGB').copy()
    out.paste(patch,(round(18*scale),0))
    return out

def patch_cover(im,covers,issue):
    y0,y1=COVER_CROPS[issue]
    corrected=covers.crop((0,y0,480,y1)).resize(im.size,Image.Resampling.LANCZOS)
    nx0,ny0,nx1,ny1=COVER_RECTS[issue]
    box=(round(nx0*im.width),round(ny0*im.height),round(nx1*im.width),round(ny1*im.height))
    out=im.convert('RGB').copy()
    out.paste(corrected.crop(box),box)
    return out

def update_issue(issue,count,patches,covers,payload_dir):
    src=ASSETS/f'issue{issue}'
    backup=Path(tempfile.mkdtemp(prefix=f'imam_issue{issue}_'))
    for f in src.glob('page-*.webp'):
        shutil.copy2(f,backup/f.name)
    if issue in (1,2):
        for page in range(1,count+1):
            im=Image.open(backup/f'page-{page:02}.webp')
            out=patch_cover(im,covers,issue) if page==1 else patch_interior(im,patches,issue,page)
            save_webp(out,src/f'page-{page:02}.webp',90 if page==1 else 88)
    else:
        for page in range(1,72):
            dst=src/f'page-{page:02}.webp'
            if page==1:
                im=Image.open(backup/'page-01.webp')
                save_webp(patch_cover(im,covers,3),dst,90)
                continue
            if page in MISSING:
                shutil.copy2(payload_dir/'missing3'/f'page-{page:02}.webp',dst)
                continue
            if 2<=page<=45:
                source_page=page
            elif 48<=page<=55:
                source_page=page-2
            elif 62<=page<=65:
                source_page=page-8
            else:
                raise RuntimeError(f'No Chapter III source mapping for page {page}')
            im=Image.open(backup/f'page-{source_page:02}.webp')
            save_webp(patch_interior(im,patches,3,page),dst,88)
    shutil.rmtree(backup,ignore_errors=True)

def build_pdf(issue,count):
    folder=ASSETS/f'issue{issue}'
    work=Path(tempfile.mkdtemp(prefix=f'imam_pdf{issue}_'))
    jpgs=[]
    try:
        for page in range(1,count+1):
            im=Image.open(folder/f'page-{page:02}.webp').convert('RGB')
            jpg=work/f'{page:03}.jpg'
            im.save(jpg,'JPEG',quality=80,optimize=True)
            jpgs.append(str(jpg))
        out=folder/f'IMAM_Issue_{issue}.pdf'
        out.write_bytes(img2pdf.convert(jpgs))
    finally:
        shutil.rmtree(work,ignore_errors=True)

def replace(path,old,new):
    p=ROOT/path
    s=p.read_text(encoding='utf-8')
    if old not in s:
        if new in s:
            return
        raise RuntimeError(f'Expected text not found in {path}: {old}')
    p.write_text(s.replace(old,new),encoding='utf-8')

def update_html():
    for issue in (1,2,3):
        replace(f'issue{issue}.html',f"im.src='/assets/issue{issue}/page-'+n+'.webp';",f"im.src='/assets/issue{issue}/page-'+n+'.webp?v=dots-centered-final';")
        replace(f'issue{issue}.html',f'href="/assets/issue{issue}/IMAM_Issue_{issue}.pdf" download',f'href="/assets/issue{issue}/IMAM_Issue_{issue}.pdf?v=dots-centered-final" download')
    replace('issue3.html','data-pages="57"','data-pages="71"')
    replace('issue3.html','for(let i=1;i<=57;i++)','for(let i=1;i<=71;i++)')
    replace('index.html','Chapter III · 57 pages including cover','Chapter III · 71 pages including cover')
    replace('index.html','assets/issue1/page-01.webp?v=corrected','assets/issue1/page-01.webp?v=dots-centered-final')
    replace('index.html','assets/issue2/page-01.webp?v=corrected','assets/issue2/page-01.webp?v=dots-centered-final')
    replace('index.html','assets/issue3/page-01.webp?v=corrected','assets/issue3/page-01.webp?v=dots-centered-final')
    for issue in (1,2,3):
        replace('index.html',f'href="assets/issue{issue}/IMAM_Issue_{issue}.pdf" download',f'href="assets/issue{issue}/IMAM_Issue_{issue}.pdf?v=dots-centered-final" download')

def main():
    if not PAYLOAD.exists():
        raise SystemExit(f'Missing payload: {PAYLOAD}')
    temp=Path(tempfile.mkdtemp(prefix='imam_dotfix_'))
    try:
        with zipfile.ZipFile(PAYLOAD) as z:
            z.extractall(temp)
        patches=Image.open(temp/'patches.webp').convert('RGB')
        covers=Image.open(temp/'covers.webp').convert('RGB')
        update_issue(1,25,patches,covers,temp)
        update_issue(2,42,patches,covers,temp)
        update_issue(3,71,patches,covers,temp)
        build_pdf(1,25)
        build_pdf(2,42)
        build_pdf(3,71)
        update_html()
        print('Centered-dot final editions prepared: 25 / 42 / 71 pages.')
    finally:
        shutil.rmtree(temp,ignore_errors=True)

if __name__=='__main__':
    main()
