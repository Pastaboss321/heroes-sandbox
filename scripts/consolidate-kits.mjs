// One-time codemod (stage 1 of the 2026-11 overhaul): folds the layered kit files (kits2a/2b/3a/3b) into each
// hero's own file so every power has exactly one definition, in final bar order. Run with --write to apply.
import fs from 'fs'; import path from 'path';
import { parseAst } from 'rolldown/parseAst';
const WRITE=process.argv.includes('--write');
const DIR='src/heroes', KITS=['kits2a.js','kits2b.js','kits3a.js','kits3b.js'], LIB='kitlib.js';
const M={};
for(const f of fs.readdirSync(DIR).filter(f=>f.endsWith('.js'))){const src=fs.readFileSync(path.join(DIR,f),'utf8');M[f]={f,src,ast:parseAst(src,{sourceType:'module'})};}
const log=(...a)=>console.log(...a);
// ---------- generic helpers
function walk(n,fn,parent=null,key=null){if(!n||typeof n.type!=='string')return;fn(n,parent,key);for(const k in n){if(k==='type'||k==='start'||k==='end')continue;const v=n[k];if(Array.isArray(v)){for(const c of v)if(c&&typeof c.type==='string')walk(c,fn,n,k);}else if(v&&typeof v.type==='string')walk(v,fn,n,k);}}
function refsOf(node){const s=new Set();walk(node,(n,p,k)=>{if(n.type!=='Identifier')return;if(p){if(p.type==='MemberExpression'&&k==='property'&&!p.computed)return;if(p.type==='Property'&&k==='key'&&!p.computed&&!p.shorthand)return;}s.add(n.name);});return s;}
function bindings(m){const imp=new Map(),top=new Map();m.ast.body.forEach((st,i)=>{
  if(st.type==='ImportDeclaration'){for(const sp of st.specifiers)imp.set(sp.local.name,{source:st.source.value,imported:sp.imported?sp.imported.name:'default'});return;}
  const d=st.type==='ExportNamedDeclaration'&&st.declaration?st.declaration:st;
  if(d.type==='FunctionDeclaration')top.set(d.id.name,i);
  else if(d.type==='VariableDeclaration')for(const x of d.declarations){if(x.id.type==='Identifier')top.set(x.id.name,i);else walk(x.id,n=>{if(n.type==='Identifier')top.set(n.name,i);});}
  else if(d.type==='ClassDeclaration')top.set(d.id.name,i);});return{imp,top};}
for(const f in M)Object.assign(M[f],bindings(M[f]));
// text of array elements / call args with their leading comments
function skipToComma(src,pos){for(;;){const c=src[pos];if(c===',')return pos+1;if(c==='/'&&src[pos+1]==='/'){pos=src.indexOf('\n',pos);if(pos<0)throw new Error('eof');continue;}if(c==='/'&&src[pos+1]==='*'){pos=src.indexOf('*/',pos)+2;continue;}if(/\s/.test(c)){pos++;continue;}return -1;}}
function elemTexts(m,elems,openPos){const out=[];let prev=openPos;for(const e of elems){if(!e)continue;const lead=m.src.slice(prev,e.start).replace(/^[ \t]*\n/,'').replace(/^\s+/,'');out.push({node:e,lead,text:m.src.slice(e.start,e.end),m});const c=skipToComma(m.src,e.end);prev=c<0?e.end:c;}return out;}
const nameOf=e=>{if(e.node.type!=='ObjectExpression')return null;const p=e.node.properties.find(p=>p.key&&(p.key.name==='n'||p.key.value==='n'));return p&&p.value.type==='Literal'?p.value.value:null;};
const hasUlt=e=>e.node.type==='ObjectExpression'&&e.node.properties.some(p=>p.key&&p.key.name==='ult');
// ---------- ULTS
const ULTS={};{const m=M['abilities.js'];walk(m.ast,n=>{if(n.type==='VariableDeclarator'&&n.id.name==='ULTS')for(const p of n.init.properties)ULTS[p.key.name||p.key.value]=p.value.value;});}
// ---------- heroes
const HEROES={},DEAD0=[];
for(const f in M){if(KITS.includes(f))continue;const m=M[f];m.ast.body.forEach((st,i)=>{const d=st.type==='ExportNamedDeclaration'&&st.declaration?st.declaration:st;if(d.type!=='VariableDeclaration')return;
  for(const x of d.declarations){if(!x.id.name||!/^CHAR_/.test(x.id.name)||!x.init||x.init.type!=='ObjectExpression')continue;const g=k=>x.init.properties.find(p=>p.key&&p.key.name===k);const id=g('id').value.value,pw=g('powers').value;
    if(pw.type!=='Identifier'){log('!! inline powers',id);continue;}HEROES[id]={id,f,ident:pw.name,base:[],pushStmts:[],decl:null};}});}
for(const id in HEROES){const h=HEROES[id],m=M[h.f];m.ast.body.forEach((st,i)=>{
  if(st.type==='VariableDeclaration')for(const x of st.declarations)if(x.id.name===h.ident){if(st.declarations.length!==1)log('!! multi decl',id);h.decl=st;h.declInit=x.init;h.base.push(...elemTexts(m,x.init.elements,x.init.start+1));}
  if(st.type==='ExpressionStatement'&&st.expression.type==='CallExpression'){const c=st.expression.callee;if(c.type==='MemberExpression'&&c.object.name===h.ident&&c.property.name==='splice'){h.pushStmts.push(st);const open=m.src.indexOf('(',c.end);const old=h.base;const args=elemTexts(m,st.expression.arguments,open+1).slice(2);h.base=args.map(e=>{if(e.node.type==='MemberExpression'){const o=old[e.node.property.value];o.kept=true;return o;}return e;});for(const o of old)if(!o.kept)DEAD0.push(id+': in-file rework dropped '+nameOf(o));}
    if(c.type==='MemberExpression'&&c.object.name===h.ident&&c.property.name==='push'){h.pushStmts.push(st);const open=m.src.indexOf('(',c.end);h.base.push(...elemTexts(m,st.expression.arguments,open+1));}}});
  if(!h.decl)log('!! no decl',id);}
// ---------- kit tables
const RW={},EX={},EX3={},tableStmts={};for(const k of KITS)tableStmts[k]=new Set();
for(const k of KITS){const m=M[k];m.ast.body.forEach((st,i)=>{
  if(st.type==='ExpressionStatement'&&st.expression.type==='AssignmentExpression'){const l=st.expression.left,r=st.expression.right;if(l.type==='MemberExpression'&&(l.object.name==='REWORK'||l.object.name==='EXTRA')){tableStmts[k].add(i);const id=l.property.name;
    if(l.object.name==='REWORK'){RW[id]=new Map();let prev=r.start+1;for(const p of r.properties){const lead=(m.src.slice(prev,p.key.start)+m.src.slice(m.src.indexOf(':',p.key.end)+1,p.value.start)).trim();RW[id].set(p.key.value,{node:p.value,lead:lead?lead+'\n ':'',text:m.src.slice(p.value.start,p.value.end),m});const c=skipToComma(m.src,p.end);prev=c<0?p.end:c;}}
    else EX[id]=elemTexts(m,r.elements,r.start+1);}}
  const d=st.type==='ExportNamedDeclaration'&&st.declaration?st.declaration:st;
  if(d.type==='VariableDeclaration')for(const x of d.declarations){
    if(x.id.name==='EXTRA3A'){tableStmts[k].add(i);for(const p of x.init.properties){const id=p.key.name,arr=p.value.name;m.ast.body.forEach((s2,j)=>{if(s2.type==='VariableDeclaration'&&s2.declarations[0].id.name===arr){tableStmts[k].add(j);(EX3[id]=EX3[id]||[]).push(...elemTexts(m,s2.declarations[0].init.elements,s2.declarations[0].init.start+1));}});}}
    if(x.id.name==='EXTRA3B'){tableStmts[k].add(i);for(const p of x.init.properties){const id=p.key.name||p.key.value;(EX3[id]=EX3[id]||[]).push(...elemTexts(m,p.value.elements,p.value.start+1));}}
    if(x.id.name==='REWORK')tableStmts[k].add(i);}
  if(d.type==='FunctionDeclaration'&&/^applyKits/.test(d.id.name))tableStmts[k].add(i);});}
// ---------- final order (mirrors applyKits then applyKits3)
const FINAL={},DEAD=[...DEAD0];
for(const id in HEROES){const h=HEROES[id];let list=[...h.base];const isUlt=e=>hasUlt(e)||ULTS[id]&&nameOf(e)===ULTS[id];
  const ultLast=()=>{const u=list.findIndex(isUlt);if(u>=0&&u!==list.length-1){const [e]=list.splice(u,1);list.push(e);}};
  for(const e of list)if(nameOf(e)==null)log('!! unnamed element',id,e.text.slice(0,60));
  const rw=RW[id];if(rw)list=list.map(e=>{const r=rw.get(nameOf(e));if(r){DEAD.push(id+': '+nameOf(e)+' -> '+nameOf(r));return r;}return e;});
  const add=ex=>{for(const e of ex||[]){if(list.some(o=>nameOf(o)===nameOf(e))){DEAD.push(id+': duplicate dropped '+nameOf(e));continue;}list.push(e);}};
  if(rw||EX[id]){add(EX[id]);ultLast();}
  if(EX3[id]){add(EX3[id]);ultLast();}
  const names=list.map(nameOf);if(new Set(names).size!==names.length)log('!! dup names',id,names.filter((n,i)=>names.indexOf(n)!==i));
  for(const e of list)e.ult=isUlt(e);FINAL[id]=list;}
for(const id of [...Object.keys(RW),...Object.keys(EX),...Object.keys(EX3)])if(!HEROES[id])log('!! kit for unknown hero',id);
const hsh=s=>{let x=5381;for(const c of s)x=(Math.imul(x,33)^c.charCodeAt(0))>>>0;return x.toString(36);};
log('final:',Object.keys(FINAL).map(id=>id+':'+FINAL[id].length+':'+hsh(FINAL[id].map(e=>nameOf(e)+(e.ult?'*':'')+(e.node.properties.some(p=>p.key.name==='tk')?'~':'')).join('|'))).join(' '));
log('dead/replaced:',DEAD.length);for(const d of DEAD)log('  ',d);
// ---------- helper placement
const helperUsers={}; // key kit:idx -> Set(heroId|'lib'|'ext')
const stmtNames=(m,i)=>[...m.top].filter(([n,j])=>j===i).map(([n])=>n);
const extImports={};
for(const f in M){if(KITS.includes(f))continue;for(const [loc,v] of M[f].imp){const k=v.source.replace('./','');if(KITS.includes(k)){(extImports[k+':'+v.imported]=extImports[k+':'+v.imported]||[]).push(f);}}}
for(const f of fs.readdirSync('src',{recursive:true})){const fp=path.join('src',f);if(!fp.endsWith('.js')||fp.includes('heroes'+path.sep))continue;const s=fs.readFileSync(fp,'utf8');for(const k of KITS)if(s.includes('heroes/'+k))log('!! outside import of',k,'in',fp);}
const heroRefs={};
for(const id in FINAL)for(const e of FINAL[id]){const k=e.m.f;if(!KITS.includes(k))continue;const r=refsOf(e.node);((heroRefs[id]=heroRefs[id]||{})[k]=heroRefs[id][k]||new Set());for(const n of r)heroRefs[id][k].add(n);}
for(const k of KITS){const m=M[k];m.ast.body.forEach((st,i)=>{if(st.type==='ImportDeclaration'||tableStmts[k].has(i))return;if(!stmtNames(m,i).length)return;helperUsers[k+':'+i]=new Set();});}
const resolveKitName=(k,n)=>{const m=M[k];if(m.top.has(n))return[k,m.top.get(n)];const im=m.imp.get(n);if(im){const k2=im.source.replace('./','');if(KITS.includes(k2))return resolveKitName(k2,im.imported);}return null;};
for(const key in extImports){const [k,n]=key.split(':');const r=resolveKitName(k,n);if(r&&helperUsers[r[0]+':'+r[1]])helperUsers[r[0]+':'+r[1]].add('ext');}
for(const id in heroRefs)for(const k in heroRefs[id])for(const n of heroRefs[id][k]){const r=resolveKitName(k,n);if(r&&helperUsers[r[0]+':'+r[1]])helperUsers[r[0]+':'+r[1]].add(id);}
for(let it=0;it<8;it++)for(const key in helperUsers){const [k,i]=key.split(':');const st=M[k].ast.body[+i];for(const n of refsOf(st)){const r=resolveKitName(k,n);if(!r)continue;const key2=r[0]+':'+r[1];if(key2===key||!helperUsers[key2])continue;for(const u of helperUsers[key])helperUsers[key2].add(u);}}
const place={};
for(const key in helperUsers){const u=helperUsers[key];place[key]=u.size===0?'dead':u.size===1&&!u.has('ext')?[...u][0]:'lib';}
for(let it=0;it<8;it++)for(const key in place){if(place[key]!=='lib')continue;const [k,i]=key.split(':');for(const n of refsOf(M[k].ast.body[+i])){const r=resolveKitName(k,n);if(r&&place[r[0]+':'+r[1]]&&place[r[0]+':'+r[1]]!=='lib'&&r[0]+':'+r[1]!==key)place[r[0]+':'+r[1]]='lib';}}
log('helpers:');for(const key in place){const [k,i]=key.split(':');log('  ',key,stmtNames(M[k],+i).join(','),'->',place[key]);}
// ---------- build edits
const stmtText=(m,i)=>{const st=m.ast.body[i];return m.src.slice(st.start,st.end);};
const problems=[];
const out={};
for(const f in M){if(KITS.includes(f))continue;const m=M[f];const heroes=Object.values(HEROES).filter(h=>h.f===f);if(!heroes.length)continue;
  const edits=[],need=new Map();
  const want=(k,n)=>{ // identifier n used by code that came from kit k, now living in file f
    const km=M[k];let src=null;
    const r=resolveKitName(k,n);
    if(r){const key=r[0]+':'+r[1];const pl=place[key];if(pl===undefined)return; // a table name (EXTRA...) - not a helper
      if(pl==='lib')src={source:'./'+LIB,imported:km.top.has(n)?n:km.imp.get(n).imported};else if(HEROES[pl]&&HEROES[pl].f===f)return;else if(pl==='dead')return;else{problems.push(`${f}: needs helper ${n} placed in ${pl}`);return;}}
    else if(km.imp.has(n))src=km.imp.get(n);
    else return;
    if(src.source==='./'+f){if(!m.top.has(n)&&!m.imp.has(n))problems.push(`${f}: self import ${n} not top-level`);return;}
    if(m.imp.has(n)){const have=m.imp.get(n);if(have.source===src.source&&have.imported===src.imported)return;if(KITS.includes(have.source.replace('./',''))&&src.source==='./'+LIB)return;problems.push(`${f}: CONFLICT import ${n}: has ${have.source} wants ${src.source}`);return;}
    if(m.top.has(n)){problems.push(`${f}: CONFLICT top-level ${n} (own) vs ${src.source}`);return;}
    const prev=need.get(n);if(prev&&(prev.source!==src.source||prev.imported!==src.imported)){problems.push(`${f}: CONFLICT two sources for ${n}: ${prev.source} / ${src.source}`);return;}
    need.set(n,src);};
  for(const h of heroes){
    const helpers=[];for(const key in place)if(place[key]===h.id){const [k,i]=key.split(':');helpers.push({k,i:+i});for(const n of stmtNames(M[k],+i)){if(m.top.has(n)||m.imp.has(n))problems.push(`${f}: CONFLICT moved helper ${n} already bound`);}for(const n of refsOf(M[k].ast.body[+i]))want(k,n);}
    const body=FINAL[h.id].map(e=>{if(KITS.includes(e.m.f))for(const n of refsOf(e.node))want(e.m.f,n);let t=e.text;if(e.ult&&!hasUlt(e)){const p=e.node.properties.find(p=>p.key.name==='n');const at=p.end-e.node.start;t=t.slice(0,at)+',ult:true'+t.slice(at);}return ' '+e.lead+t;}).join(',\n');
    const helperTxt=helpers.map(({k,i})=>stmtText(M[k],i).replace(/^export\s+/,'')).join('\n');
    edits.push({s:h.decl.start,e:h.decl.end,t:(helperTxt?helperTxt+'\n':'')+`const ${h.ident}=[\n${body}\n];`});
    for(const st of h.pushStmts){let e=st.end;if(m.src[e]==='\n')e++;edits.push({s:st.start,e,t:''});}}
  const bySrc=new Map();for(const [n,v] of need){if(!bySrc.has(v.source))bySrc.set(v.source,[]);bySrc.get(v.source).push(v.imported===n?n:`${v.imported} as ${n}`);}
  const lastImp=[...m.ast.body].filter(s=>s.type==='ImportDeclaration').pop();
  const impTxt=[];for(const [s,names] of bySrc){const ex=m.ast.body.find(st=>st.type==='ImportDeclaration'&&st.source.value===s&&st.specifiers.length&&st.specifiers.every(sp=>sp.type==='ImportSpecifier'));
    if(ex){const all=[...ex.specifiers.map(sp=>sp.imported.name===sp.local.name?sp.local.name:`${sp.imported.name} as ${sp.local.name}`),...names].sort();edits.push({s:ex.start,e:ex.end,t:`import { ${all.join(', ')} } from '${s}';`});}
    else impTxt.push(`import { ${names.sort().join(', ')} } from '${s}';`);}
  if(impTxt.length)edits.push({s:lastImp.end,e:lastImp.end,t:'\n'+impTxt.join('\n')});
  for(const st of m.ast.body)if(st.type==='ImportDeclaration'&&KITS.includes(st.source.value.replace('./',''))){const k=st.source.value.replace('./','');const keep=st.specifiers.filter(sp=>{const r=resolveKitName(k,sp.imported.name);return r&&place[r[0]+':'+r[1]]==='lib';}).map(sp=>sp.imported.name===sp.local.name?sp.local.name:`${sp.imported.name} as ${sp.local.name}`);for(const n of keep)need.delete(n);edits.push({s:st.start,e:st.end,t:keep.length?`import { ${keep.join(', ')} } from './${LIB}';`:''});}
  let s=m.src;for(const e of edits.sort((a,b)=>b.s-a.s||b.e-a.e))s=s.slice(0,e.s)+e.t+s.slice(e.e);
  out[f]=s;}
// ---------- kitlib
{const need=new Map(),parts=[],names=new Map();
  for(const k of KITS){const m=M[k];m.ast.body.forEach((st,i)=>{const key=k+':'+i;if(place[key]!=='lib')return;let t=stmtText(m,i);const bare=t.replace(/^export\s+/,'');let dup=false;
    for(const n of stmtNames(m,i)){if(names.has(n)){if(names.get(n)===bare)dup=true;else problems.push(`kitlib: duplicate helper ${n} (${k})`);}names.set(n,bare);}
    if(dup)return;
    parts.push(`// from ${k}\nexport `+bare);
    for(const n of refsOf(st)){const im=m.imp.get(n);if(!im||m.top.has(n))continue;const k2=im.source.replace('./','');if(KITS.includes(k2))continue;const prev=need.get(n);if(prev&&(prev.source!==im.source||prev.imported!==im.imported))problems.push(`kitlib: CONFLICT ${n}`);need.set(n,im);}});}
  const bySrc=new Map();for(const [n,v] of need){if(!bySrc.has(v.source))bySrc.set(v.source,[]);bySrc.get(v.source).push(v.imported===n?n:`${v.imported} as ${n}`);}
  out[LIB]=`// Shared kit helpers: small tools several heroes' powers use (targeting, damage tags, thrown-body impacts,\n// sprite echoes). Each hero's powers live in that hero's own file; this file holds no powers.\n`+[...bySrc].map(([s,n])=>`import { ${n.sort().join(', ')} } from '${s}';`).join('\n')+'\n\n'+parts.join('\n')+'\n';}
log('ext imports from kits:',JSON.stringify(extImports));
log('problems:',problems.length);for(const p of [...new Set(problems)])log('  ',p);
if(WRITE){for(const f in out)fs.writeFileSync(path.join(DIR,f),out[f]);log('written',Object.keys(out).length,'files');}
