// Settings (SET), time of day and colour-grading LUTs.
import '../world/bodies.js'; // evaluation order: runs after world/bodies.js
import { ST } from '../state.js';
import { cl, rgb } from '../world/materials.js';
import { H } from '../world/grid.js';

// ================= look: settings, time of day, colour grading =================
export const SET=Object.assign({tod:'auto',dim:55,shake:80,words:true,ink:true,bloom:true,fps:false,sound:true,vol:70,fx:true,light:true,nums:true},(()=>{try{return JSON.parse(localStorage.getItem('ironsorc.settings')||'{}');}catch(e){return {};}})());
export function saveSet(){try{localStorage.setItem('ironsorc.settings',JSON.stringify(SET));}catch(e){}}
// sky gradient top/bottom, haze (what distant things fade into), light on the foreground, window lights on/off
const TODS={
  dawn:{top:[64,86,170],bot:[250,170,120],haze:[214,160,150],light:[1.02,.92,.92],sun:[255,214,160],win:.5,stars:.15,clouds:[255,196,170]},
  day:{top:[64,140,226],bot:[196,228,246],haze:[176,204,228],light:[1.1,1.08,1.04],sun:[255,250,224],win:0,stars:0,clouds:[255,255,255]},
  dusk:{top:[52,34,104],bot:[244,128,78],haze:[170,100,120],light:[1.02,.84,.76],sun:[255,150,90],win:.9,stars:.35,clouds:[255,150,120]},
  night:{top:[6,8,26],bot:[36,32,78],haze:[30,32,66],light:[.62,.68,.92],moon:true,win:1,stars:1,clouds:null},
};
// farBase, farSky, farKeep: shared state (ST in state.js)
export const fgL=new Uint8Array(768), bgL=new Uint8Array(768), rimL=new Uint8Array(768), inkL=new Uint8Array(768), htL=new Uint8Array(768);
export const lut=(L,c)=>((255<<24)|(L[512+((c>>16)&255)]<<16)|(L[256+((c>>8)&255)]<<8)|L[c&255])>>>0;
function buildLUT(){
  const T=TODS[SET.tod],Lc=T?T.light:[1,1,1],dim=SET.dim/100;
  for(let k=0;k<3;k++)for(let v=0;v<256;v++){const j=k*256+v;
    fgL[j]=cl(v*Lc[k]);bgL[j]=cl(v*Lc[k]*(1-dim*.55));rimL[j]=cl(v*1.22+12);inkL[j]=cl(v*.36);htL[j]=cl(v*.8);}
}
export function mix3(c,t,k){return rgb((c&255)+(t[0]-(c&255))*k,((c>>8)&255)+(t[1]-((c>>8)&255))*k,((c>>16)&255)+(t[2]-((c>>16)&255))*k);}
export function lumC(c){return((c&255)*.3+((c>>8)&255)*.59+((c>>16)&255)*.11);}
// regrade the parallax backdrop for the chosen time of day, and push it back (desaturate + haze) so gameplay reads first
export function applyTOD(){
  buildLUT();
  if(!ST.farBase)return;
  const T=TODS[SET.tod],dim=SET.dim/100;let seed=1234567;const rnd=()=>((seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff);
  let haze;
  if(T)haze=T.haze;else{let r=0,g=0,b=0,n=0;const y=(H*.35)|0;for(let x=0;x<ST.FW;x+=7){const c=ST.farBase[y*ST.FW+x];r+=c&255;g+=(c>>8)&255;b+=(c>>16)&255;n++;}haze=[r/n,g/n,b/n];}
  for(let y=0;y<H;y++){
    const f=Math.min(1,y/(H*.55));
    const sky=T?rgb(T.top[0]+(T.bot[0]-T.top[0])*f,T.top[1]+(T.bot[1]-T.top[1])*f,T.top[2]+(T.bot[2]-T.top[2])*f):0;
    for(let x=0;x<ST.FW;x++){const i=y*ST.FW+x;let c=ST.farBase[i];
      if(ST.farSky[i]){if(T){c=sky;if(T.stars&&y<H*.4&&rnd()<.004*T.stars)c=rgb(230,230,255);}c=mix3(c,haze,dim*.18);}
      else{
        const keep=ST.farKeep&&ST.farKeep[i];
        if(T&&lumC(c)>140&&T.win<1){c=keep?mix3(c,[64,74,96],(1-T.win*.7)*.8):mix3(c,haze,1-T.win*.7);} // lights off in daylight
        const l=lumC(c),k=keep?.1:.4;c=rgb((c&255)+(l-(c&255))*k,((c>>8)&255)+(l-((c>>8)&255))*k,((c>>16)&255)+(l-((c>>16)&255))*k);
        c=mix3(c,haze,keep?.04+dim*.12:.22+dim*.42);
      }
      ST.far[i]=c;}
  }
  if(T){ // sun or moon with a halo, and a few flat comic clouds
    const sx=(ST.FW*.72)|0,sy=(H*.13)|0,R0=T.moon?10:14;
    for(let y=-R0*4;y<=R0*4;y++)for(let x=-R0*4;x<=R0*4;x++){const X=sx+x,Y=sy+y;if(X<0||X>=ST.FW||Y<0||Y>=H)continue;const i=Y*ST.FW+X;if(!ST.farSky[i])continue;const d=Math.hypot(x,y);
      if(d<R0){let c=T.moon?rgb(236,232,214):rgb(...T.sun);if(T.moon&&((x+4)*(x+4)+(y+2)*(y+2)<9||(x-3)*(x-3)+(y-4)*(y-4)<5))c=rgb(200,196,184);ST.far[i]=d>R0-1.2?rgb(20,17,15):c;}
      else ST.far[i]=mix3(ST.far[i],T.moon?[120,130,170]:T.sun,Math.max(0,.45*(1-(d-R0)/(R0*3))));}
    if(T.clouds)for(let k=0;k<16;k++){const cx=rnd()*ST.FW|0,cy=(H*.05+rnd()*H*.22)|0,w=20+rnd()*50,h=6+rnd()*8;
      for(let y=-h-1;y<=h+1;y++)for(let x=-w-1;x<=w+1;x++){const X=cx+x|0,Y=cy+y|0;if(X<0||X>=ST.FW||Y<0||Y>=H)continue;const i=Y*ST.FW+X;if(!ST.farSky[i])continue;
        const e=(x*x)/(w*w)+(y*y)/(h*h)+Math.sin(x*.3+k)*.12;if(e<1)ST.far[i]=mix3(ST.far[i],y>h*.3?T.clouds.map(v=>v*.8):T.clouds,.75);else if(e<1.15&&y>0)ST.far[i]=mix3(ST.far[i],[20,17,15],.35);}}
  }
}
