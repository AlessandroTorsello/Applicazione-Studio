import json,sys
from PIL import Image, ImageDraw
b=sys.argv[1]; d=json.load(open(f'out/{b}.json'))['s']
W,H=200,110; cols=6
tiles=[]
for k,x in enumerate(d,1):
    im=Image.open(f'out/{b}/{x[0]}').convert('RGB'); c=im.crop((0,0,W,H)); dr=ImageDraw.Draw(c); dr.rectangle((130,0,200,16),fill='white'); dr.text((134,2),f'#{k}',fill=(255,0,0)); tiles.append(c)
rows=(len(tiles)+cols-1)//cols
S=Image.new('RGB',(W*cols,H*rows),'white')
for i,c in enumerate(tiles): S.paste(c,((i%cols)*W,(i//cols)*H))
S.save(f'z-{b}.png'); print(S.size)
