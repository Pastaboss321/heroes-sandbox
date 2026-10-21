// Lists module-level (not inside any function) uses of the world-size bindings from world/grid.js,
// which would go stale when the world is resized for a new map. Usage: node scripts/toplevel-refs.mjs
import { parseAst } from 'rolldown/parseAst';
import fs from 'node:fs';
import path from 'node:path';
const NAMES = new Set(['W', 'H', 'N', 'CW', 'CHN', 't', 'col', 'life', 'stamp', 'vel', 'bg', 'bgD', 'bgB', 'vis', 'q', 'bm', 'pin', 'gnd', 'str', 'rid', 'stk']);
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } })('src');
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const ast = parseAst(src);
  const hits = [];
  const visit = (n, inFn, key) => {
    if (!n || typeof n.type !== 'string') return;
    if (key === 'key' || key === 'property') return; // object keys and member names are not bindings
    if (/Function/.test(n.type)) inFn = true;
    if (n.type === 'Identifier' && NAMES.has(n.name) && !inFn) hits.push(n.name + '@' + src.slice(0, n.start).split('\n').length);
    for (const k in n) { if (k === 'type' || k === 'start' || k === 'end') continue; const v = n[k]; if (k === 'property' && !n.computed) continue; if (k === 'key' && !n.computed) continue; if (Array.isArray(v)) v.forEach((c) => visit(c, inFn)); else if (v && typeof v === 'object') visit(v, inFn); }
  };
  for (const st of ast.body) { if (st.type === 'ImportDeclaration') continue; visit(st, false); }
  if (hits.length) console.log(f, [...new Set(hits)].join(' '));
}
