from PIL import Image, ImageDraw; import numpy as np, json
im0=Image.open(__import__("sys").argv[1] if len(__import__("sys").argv)>1 else "im-005.png").convert('RGB'); im=np.array(im0).astype(int); H,W,_=im.shape
X0,XPX=66,126.0          # 0 rpm 픽셀, 1000 rpm 당 픽셀
Y0=506; PPX=(506-18)/140 # kW 당 픽셀
TPX=(506-18)/250         # N·m 당 픽셀
C={'PT':(190,209,234),'PP':(67,116,160),'CT':(151,185,224),'CP':(90,155,213)}
res={}
for k,c in C.items():
  ys=[]
  for x in range(W):
    d=np.sqrt(((im[:,x,:]-np.array(c))**2).sum(1)); idx=np.where(d<14)[0]; idx=idx[(idx>15)&(idx<508)]
    ys.append(np.median(idx) if len(idx) else np.nan)
  res[k]=np.array(ys)
rpm=np.arange(0,6501,100); out={}
for k,ys in res.items():
  xs=np.arange(W); ok=~np.isnan(ys)
  px=np.maximum(X0+rpm/1000*XPX, X0+3)
  y=np.interp(px, xs[ok], ys[ok])
  val=(Y0-y)/(PPX if k in('PP','CP') else TPX)
  out[k]=val
  print(k, 'cover', ok.sum(), [round(v,1) for v in val[::5]])
json.dump({k:[round(float(v),2) for v in out[k]] for k in out} | {'rpm':rpm.tolist()}, open('curves.json','w'))
# 확인: P = T ω 일관성
w=rpm*2*np.pi/60
print('peak P from T [kW]',[round(v,1) for v in (out['PT']*w/1000)[::5]])
print('cont P from T [kW]',[round(v,1) for v in (out['CT']*w/1000)[::5]])
# 겹쳐 그리기
dr=ImageDraw.Draw(im0)
for k,col in [('PT',(255,0,0)),('PP',(255,120,0)),('CT',(200,0,200)),('CP',(0,170,0))]:
  for i in range(0,len(rpm),2):
    x=X0+rpm[i]/1000*XPX; y=Y0-out[k][i]*(PPX if k in('PP','CP') else TPX); dr.ellipse([x-2.5,y-2.5,x+2.5,y+2.5],outline=col,width=2)
im0.save('check_curves.png')
