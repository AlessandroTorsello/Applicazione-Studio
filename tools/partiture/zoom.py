import json,sys
from PIL import Image, ImageDraw
b=sys.argv[1]; d=json.load(open(f'out/{b}.json'))['s']; lo=int(sys.argv[2]); hi=int(sys.argv[3])
W,H=int(sys.argv[5]) if len(sys.argv)>5 else 230,int(sys.argv[4]) if len(sys.argv)>4 else 95; cols=6
tiles=[]
for k in range(lo,min(hi,len(d))+1):
    x=d[k-1]; im=Image.open(f'out/{b}/{x[0]}').convert('RGB'); c=im.crop((0,0,W,H)); dr=ImageDraw.Draw(c); dr.rectangle((150,0,230,14),fill='white'); dr.text((152,2),f'#{k} p{x[6] if len(x)>6 else ""}',fill=(255,0,0)); tiles.append(c)
rows=(len(tiles)+cols-1)//cols
S=Image.new('RGB',(W*cols,H*rows),'white')
for i,c in enumerate(tiles): S.paste(c,((i%cols)*W,(i//cols)*H))
S.save(f'z-{b}.png'); print(S.size)
