// Power bar and hero select.
import '../render/render.js'; // evaluation order: runs after render/render.js
import { ST } from '../state.js';
import { CHARS, setChar, setSelHook } from '../heroes/index.js';
import { powerKind } from '../heroes/kit.js';
import { startWave } from '../enemies/core.js';

// ================= HUD / input =================
export const pwDiv=document.getElementById('powers');
const PKEYS=['1','2','3','4','5','6','7','8','9','0','-','='];
export function buildPowerBar(){pwDiv.innerHTML='';ST.CH.powers.forEach((pw,i)=>{const d=document.createElement('div');const kind=powerKind(pw);d.className='pw k-'+kind;d.title=kind==='ult'?'ultimate: G (fills as you deal damage)':kind==='hold'?'hold to keep it going':kind==='move'?'moves the hero':'';const k=document.createElement('i');k.textContent=kind==='ult'?'G':PKEYS[i]||'·';d.appendChild(k);d.appendChild(document.createTextNode(pw.n.toUpperCase()));const f=document.createElement('span');f.className='cdf';d.appendChild(f);pwDiv.appendChild(d);});selPower(ST.cur);}
export function selPower(i){const n=ST.CH.powers.length;ST.cur=((i%n)+n)%n;[...pwDiv.children].forEach((d,k)=>d.classList.toggle('on',k===ST.cur));}
setSelHook(i=>selPower(i));
const charSel=document.getElementById('char');
CHARS.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.name;charSel.appendChild(o);});
charSel.onchange=()=>{setChar(CHARS.findIndex(c=>c.id===charSel.value));charSel.blur();};
setChar(0);
document.getElementById('wavebtn').onclick=e=>{startWave();e.target.blur();};
