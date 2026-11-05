from PIL import Image, ImageDraw; import numpy as np, json
from scipy import ndimage as nd
im0=Image.open(__import__("sys").argv[1] if len(__import__("sys").argv)>1 else "im-006.png").convert('RGB'); im=np.array(im0).astype(int); H,W,_=im.shape
X0,XPX=53,119.7; Y0,YPX=486,(486-43)/250     # 0 rpm · 1000 rpm 당, 0 N·m · N·m 당 픽셀
XR=int(round(X0+5.5*XPX))                     # 5500 rpm 오른쪽 끝
C=[('teal',86,(49,133,156)),('purple',90,(103,82,129)),('green',94,(119,147,60)),('red',95,(192,80,77)),('blue',96,(56,93,138))]
TXT=[(395,80,545,113),(405,135,480,168),(378,192,445,226),(350,288,415,322),(340,415,455,450)]   # 글자 상자 (x0,y0,x1,y1)
ins={}
for name,L,c in C:
  m=np.sqrt(((im-np.array(c))**2).sum(2))<40
  for x0,y0,x1,y1 in TXT: m[y0:y1,x0:x1]=False
  m[:, :X0-1]=False; m[Y0+2:,:]=False
  m=nd.binary_dilation(m,iterations=2); m[:,XR:XR+3]=True; m[40:46,:]=m[40:46,:]  # 오른쪽 끝을 닫음
  out=nd.binary_fill_holes(m)  # 선으로 둘러싸인 안쪽
  inside=out & ~m
  inside=nd.binary_opening(inside,iterations=1); inside[:, XR:]=False
  ins[name]=(L,inside,m)
  print(name,'inside px',inside.sum())
# 레벨 사이 보간: 바깥 선(L_i)까지 거리 d1, 안쪽 선(L_{i+1})까지 거리 d2 → η = L_i + (L_{i+1} − L_i) d1/(d1 + d2)
names=[n for n,_,_ in C]; eta=np.full((H,W),np.nan)
for i,n in enumerate(names):
  L,inside,_=ins[n]; d1=nd.distance_transform_edt(inside)
  if i+1<len(names):
    L2,in2,_=ins[names[i+1]]; band=inside & ~in2; d2=nd.distance_transform_edt(~in2)
    eta[band]=L+(L2-L)*d1[band]/(d1[band]+d2[band])
  else:
    eta[inside]=L+0.5*d1[inside]/max(1,d1[inside].max())   # 96 % 안쪽: 가운데로 갈수록 96.5 % (추측)
outside=~ins['teal'][1]; eta[outside]=86.0               # 86 % 선 바깥: 86 % 유지 (데이터 없음)
rpm=np.arange(0,5501,250); trq=np.arange(0,251,10)
G=np.zeros((len(trq),len(rpm)))
for a,T in enumerate(trq):
  for b,n in enumerate(rpm):
    x=int(round(min(XR-6,max(X0+1,X0+n/1000*XPX)))); y=int(round(min(Y0-1,max(44,Y0-T*YPX))))
    G[a,b]=eta[y,x]
json.dump({'rpm':rpm.tolist(),'torque':trq.tolist(),'eta':np.round(G,2).tolist()},open('effmap.json','w'))
print(np.round(G[::5,::4],1))
# 확인 그림: 원본 위에 0.5 % 간격 등고선 (보간한 맵)
ov=im0.copy(); px=ov.load()
lev={86:(0,150,150),88:(0,0,0),90:(110,60,160),92:(0,0,0),94:(90,150,0),95:(220,0,0),96:(0,60,200)}
E=np.nan_to_num(eta,nan=0)
for y in range(1,H-1):
  for x in range(1,W-1):
    for Lv,col in lev.items():
      if (E[y,x]>=Lv)!=(E[y,x+1]>=Lv) or (E[y,x]>=Lv)!=(E[y+1,x]>=Lv):
        if Lv in (88,92): px[x,y]=col
dr=ImageDraw.Draw(ov)
for a,T in enumerate(trq[::2]):
  for b,n in enumerate(rpm[::2]):
    x=X0+n/1000*XPX; y=Y0-T*YPX; v=G[a*2,b*2]; dr.text((x-6,y-5),f'{v:.0f}',fill=(0,0,0))
ov.save('check_eff.png')
