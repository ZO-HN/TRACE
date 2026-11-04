import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Shared docs deliberately use sibling-repository links. Run with both checkouts.
const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mobileRoot = resolve(process.env.TRACE_CLIENT_PATH || resolve(webRoot, '../TRACE-client'));
if (!existsSync(resolve(mobileRoot, 'package.json'))) {
  console.error('Documentation check requires TRACE-client; set TRACE_CLIENT_PATH if needed.');
  process.exit(1);
}
const files = [];
function collect(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (entry.name.endsWith('.md')) files.push(path);
  }
}
for (const root of [webRoot, mobileRoot]) {
  for (const name of ['README.md', 'AGENTS.md']) files.push(resolve(root, name));
  collect(resolve(root, 'docs'));
}
collect(resolve(webRoot, 'supabase/functions'));

function prose(text) {
  return text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '');
}
function headingIds(text) {
  const ids = new Set();
  const counts = new Map();
  for (const match of prose(text).matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const base = match[1].toLowerCase().replace(/<[^>]*>/g, '')
      .replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/ /g, '-');
    const count = counts.get(base) || 0;
    counts.set(base, count + 1);
    ids.add(count ? `${base}-${count}` : base);
  }
  for (const match of text.matchAll(/<(?:a|[a-z][\w-]*)\s+[^>]*\bid=["']([^"']+)["']/gi)) ids.add(match[1]);
  return ids;
}
const texts = new Map(files.map(path => [path, readFileSync(path, 'utf8')]));
const graph = new Map(files.map(path => [path, new Set()]));
const failures = [];
let links = 0;
function fail(file, message) {
  failures.push(`${relative(webRoot, file).split(sep).join('/')}: ${message}`);
}
function targetPath(file, pathname) {
  const candidate = resolve(dirname(file), pathname || '.');
  // Support alternate checkout paths while retaining portable sibling links.
  const conventionalMobile = resolve(webRoot, '../TRACE-client');
  if (candidate === conventionalMobile || candidate.startsWith(conventionalMobile + sep)) {
    return resolve(mobileRoot, relative(conventionalMobile, candidate));
  }
  const conventionalWeb = resolve(mobileRoot, '../TRACE');
  if (candidate === conventionalWeb || candidate.startsWith(conventionalWeb + sep)) {
    return resolve(webRoot, relative(conventionalWeb, candidate));
  }
  return candidate;
}
for (const [file, raw] of texts) {
  const text = prose(raw);
  const refs = new Map([...text.matchAll(/^\s*\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))/gm)]
    .map(match => [match[1].toLowerCase(), match[2] || match[3]]));
  const targets = [...text.matchAll(/!?\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))\s*(?:["'][^\n]*?["'])?\s*\)/g)]
    .map(match => match[1] || match[2]);
  for (const match of text.matchAll(/!?\[([^\]\n]+)\]\[([^\]\n]*)\]/g)) {
    const key = (match[2] || match[1]).toLowerCase();
    if (!refs.has(key)) fail(file, `undefined link reference [${key}]`);
    else targets.push(refs.get(key));
  }
  for (const target of targets) {
    if (/^(?:https?:|mailto:|tel:|data:)/i.test(target)) continue;
    links++;
    if (/^(?:[a-z]:|file:|\\)/i.test(target)) {
      fail(file, `nonportable local link ${target}`);
      continue;
    }
    const hash = target.indexOf('#');
    const pathname = decodeURIComponent((hash < 0 ? target : target.slice(0, hash)).split('?')[0]);
    const fragment = hash < 0 ? '' : decodeURIComponent(target.slice(hash + 1));
    const destination = pathname ? targetPath(file, pathname) : file;
    if (!existsSync(destination)) {
      fail(file, `missing local target ${target}`);
      continue;
    }
    if (graph.has(destination)) graph.get(file).add(destination);
    if (fragment && extname(destination) === '.md' && statSync(destination).isFile()
      && !headingIds(texts.get(destination) || readFileSync(destination, 'utf8')).has(fragment)) {
      fail(file, `missing heading #${fragment} in ${target}`);
    }
  }
}
const reached = new Set();
const pending = [resolve(webRoot, 'docs/README.md')];
while (pending.length) {
  const file = pending.pop();
  if (reached.has(file)) continue;
  reached.add(file);
  for (const next of graph.get(file) || []) pending.push(next);
}
for (const file of files) {
  if (!reached.has(file)) fail(file, 'not reachable from the shared documentation index');
}
if (failures.length) {
  console.error(failures.join('\n'));
  console.error(`Documentation check failed: ${failures.length} issue(s).`);
  process.exitCode = 1;
} else {
  console.log(`Documentation check passed: ${files.length} Markdown files, ${links} local links; all reachable from the shared index.`);
}
