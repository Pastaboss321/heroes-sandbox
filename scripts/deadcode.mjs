// Dead-code report and unused-import cleanup for src/.
//   node scripts/deadcode.mjs            report: unused imports, unused top-level declarations, exports nobody imports
//   node scripts/deadcode.mjs --write    also rewrite files: drop unused import names (an import whose names all go
//                                        becomes a bare `import 'x'` so module evaluation order never changes) and
//                                        delete unused, unexported top-level functions and constants
import fs from 'fs'; import path from 'path'; import { parseAst } from 'rolldown/parseAst';
const WRITE = process.argv.includes('--write'), files = [];
const walkDir = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walkDir(p); else if (p.endsWith('.js')) files.push(p); } }; walkDir('src');
function walk(n, fn, parent = null, key = null) { if (!n || typeof n.type !== 'string') return; fn(n, parent, key); for (const k in n) { if (k === 'type' || k === 'start' || k === 'end') continue; const v = n[k]; if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') walk(c, fn, n, k); } else if (v && typeof v.type === 'string') walk(v, fn, n, k); } }
const M = {}, imported = new Set(); // imported: 'resolvedFile:name'
for (const f of files) { const src = fs.readFileSync(f, 'utf8'), ast = parseAst(src, { sourceType: 'module' }); M[f] = { src, ast }; }
const resolve = (from, spec) => path.normalize(path.join(path.dirname(from), spec));
for (const f of files) for (const st of M[f].ast.body) {
  if (st.type === 'ImportDeclaration') for (const sp of st.specifiers) imported.add(resolve(f, st.source.value) + ':' + (sp.imported ? sp.imported.name : 'default'));
  if (st.type === 'ExportNamedDeclaration' && st.source) for (const sp of st.specifiers) imported.add(resolve(f, st.source.value) + ':' + sp.local.name);
}
let nImp = 0, nDecl = 0; const deadExports = [];
for (const f of files) { const { src, ast } = M[f], edits = [];
  // every identifier use in the file, counted (declarations included)
  const uses = new Map(); walk(ast, (n, p, k) => { if (n.type !== 'Identifier') return; if (p && p.type === 'MemberExpression' && k === 'property' && !p.computed) return; if (p && p.type === 'Property' && k === 'key' && !p.computed && !p.shorthand) return; if (p && (p.type === 'ImportSpecifier' || p.type === 'ImportDefaultSpecifier' || p.type === 'ImportNamespaceSpecifier')) return; if (p && p.type === 'ExportSpecifier' && k === 'exported') return; uses.set(n.name, (uses.get(n.name) || 0) + 1); });
  const exported = new Set(); for (const st of ast.body) { if (st.type !== 'ExportNamedDeclaration') continue; if (st.declaration) { const d = st.declaration; if (d.id) exported.add(d.id.name); else for (const x of d.declarations || []) walk(x.id, n => { if (n.type === 'Identifier') exported.add(n.name); }); } else for (const sp of st.specifiers) exported.add(sp.local.name); }
  for (const st of ast.body) {
    if (st.type === 'ImportDeclaration' && st.specifiers.length) { const keep = st.specifiers.filter(sp => (uses.get(sp.local.name) || 0) > 0 || exported.has(sp.local.name)), drop = st.specifiers.length - keep.length; if (!drop) continue; nImp += drop;
      if (st.specifiers.some(sp => sp.type !== 'ImportSpecifier')) { if (!keep.length) edits.push({ s: st.start, e: st.end, t: `import '${st.source.value}';` }); continue; }
      const tail = src.slice(st.end, src.indexOf('\n', st.end) < 0 ? src.length : src.indexOf('\n', st.end));
      edits.push({ s: st.start, e: st.end, t: keep.length ? `import { ${keep.map(sp => sp.imported.name === sp.local.name ? sp.local.name : sp.imported.name + ' as ' + sp.local.name).join(', ')} } from '${st.source.value}';` : `import '${st.source.value}';` + (/evaluation order/.test(tail) ? '' : ' // kept for evaluation order') }); }
    // unexported top-level function / single const never used again
    const single = st.type === 'FunctionDeclaration' ? st.id.name : st.type === 'VariableDeclaration' && st.declarations.length === 1 && st.declarations[0].id.type === 'Identifier' ? st.declarations[0].id.name : null;
    if (single && !exported.has(single) && uses.get(single) === 1) { const init = st.type === 'VariableDeclaration' ? st.declarations[0].init : null; const pure = !init || ['ArrowFunctionExpression', 'FunctionExpression', 'ArrayExpression', 'ObjectExpression', 'Literal', 'TemplateLiteral'].includes(init.type);
      console.log((pure ? 'unused ' : 'unused (has side effects, kept) ') + f + ': ' + single); if (pure) { nDecl++; let e = st.end; if (src[e] === '\r') e++; if (src[e] === '\n') e++; edits.push({ s: st.start, e, t: '' }); } }
  }
  for (const n of exported) if (!imported.has(path.normalize(f) + ':' + n) && (uses.get(n) || 0) <= 1) deadExports.push(f + ': ' + n);
  if (WRITE && edits.length) { let s = src; for (const e of edits.sort((a, b) => b.s - a.s)) s = s.slice(0, e.s) + e.t + s.slice(e.e); fs.writeFileSync(f, s); }
}
console.log('unused import names:', nImp, '| unused top-level declarations removed:', nDecl);
console.log('exports nobody imports and the file itself never uses (' + deadExports.length + '):'); for (const d of deadExports) console.log('  ' + d);
