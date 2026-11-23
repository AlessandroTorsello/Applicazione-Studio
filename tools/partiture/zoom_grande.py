import json,sys
from PIL import Image, ImageDraw
b=sys.argv[1]; d=json.load(open(f'out/{b}.json'))['s']; ks=[int(x) for x in sys.argv[2].split(',')]
W,H=300,int(sys.argv[3]) if len(sys.argv)>3 else 220; cols=4
tiles=[]
for k in ks:
    x=d[k-1]; im=Image.open(f'out/{b}/{x[0]}').convert('RGB'); c=Image.new('RGB',(W,H+16),'white'); c.paste(im.crop((0,0,W,H)),(0,16)); dr=ImageDraw.Draw(c); dr.text((4,2),f'#{k} p{x[6]}',fill=(255,0,0)); dr.rectangle((0,0,W-1,H+15),outline=(255,0,0)); tiles.append(c)
rows=(len(tiles)+cols-1)//cols
S=Image.new('RGB',(W*cols,(H+16)*rows),'white')
for i,c in enumerate(tiles): S.paste(c,((i%cols)*W,(i//cols)*(H+16)))
S.save(f'zz-{b}.png'); print(S.size)
