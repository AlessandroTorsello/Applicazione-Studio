import json,sys
from PIL import Image, ImageDraw
b=sys.argv[1]; ks=[int(x) for x in sys.argv[2].split(',')]; sc=float(sys.argv[3]) if len(sys.argv)>3 else .6
d=json.load(open(f'out/{b}.json'))['s']
ims=[]
for k in ks:
    im=Image.open(f'out/{b}/{d[k-1][0]}').convert('RGB'); ImageDraw.Draw(im).text((500,2),f'#{k}',fill=(255,0,0)); ims.append(im)
W=1100; H=sum(i.height for i in ims)
S=Image.new('RGB',(W,H),'white'); y=0
for i in ims: S.paste(i,(0,y)); y+=i.height
S=S.resize((int(W*sc),int(H*sc))); S.save('/home/user/work/full.png'); print(S.size)
