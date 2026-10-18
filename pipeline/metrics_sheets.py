import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
cands = json.load(open(sys.argv[1],encoding='utf-8')); tdir=sys.argv[2]; out=sys.argv[3]
os.makedirs(out, exist_ok=True)
rows=[]
for c in cands:
    fn=os.path.join(tdir,c['uuid']+'.jpg')
    if not os.path.exists(fn): continue
    im=Image.open(fn).convert('RGB'); a=np.asarray(im).astype(np.float32)
    L=a.mean(2); h,w=L.shape
    paper=np.percentile(L,85)
    mx=a.max(2); mn=a.min(2); sat=(mx-mn)/(mx+1)
    ispaper=L>paper-28
    b=max(2,int(min(h,w)*0.06))
    border=np.concatenate([ispaper[:b].ravel(),ispaper[-b:].ravel(),ispaper[:,:b].ravel(),ispaper[:,-b:].ravel()])
    ink=~ispaper
    c.update(paper=float(paper), paper_ratio=float(ispaper.mean()), border=float(border.mean()),
             color=float(sat[ink].mean()) if ink.any() else 0.0, paper_sat=float(sat[ispaper].mean()))
    rows.append(c)
json.dump(rows, open(os.path.join(out,'..','pdia','scored.json'),'w',encoding='utf-8'), ensure_ascii=False)
good=[c for c in rows if c['paper']>150 and c['border']>0.72 and 0.35<c['paper_ratio']<0.93]
print('good',len(good),'of',len(rows))
# group by primary theme
order=['fantasy-and-dream','strange-phenomena','animals-and-beasts','natural-world','science-and-medicine']
def prim(c):
    for t in order:
        if t in c['themes']: return t
good.sort(key=lambda c:(order.index(prim(c)), -c['border']))
for i,c in enumerate(good): c['idx']=i
json.dump(good, open(os.path.join(out,'..','pdia','good.json'),'w',encoding='utf-8'), ensure_ascii=False)
cell=200; cols=8; rws=6; per=cols*rws
try: font=ImageFont.truetype('arial.ttf',18)
except: font=ImageFont.load_default()
for s in range(0,len(good),per):
    sheet=Image.new('RGB',(cols*cell,rws*(cell+22)),(40,40,40)); d=ImageDraw.Draw(sheet)
    for k,c in enumerate(good[s:s+per]):
        im=Image.open(os.path.join(tdir,c['uuid']+'.jpg')).convert('RGB'); im.thumbnail((cell-6,cell-6))
        x=(k%cols)*cell; y=(k//cols)*(cell+22)
        sheet.paste(im,(x+(cell-im.width)//2,y+(cell-im.height)//2))
        d.text((x+4,y+cell),f"{c['idx']} {prim(c)[:6]}",fill=(255,220,120),font=font)
    sheet.save(os.path.join(out,f'sheet_{s//per:02d}.jpg'),quality=82)
print('sheets',(len(good)+per-1)//per)
