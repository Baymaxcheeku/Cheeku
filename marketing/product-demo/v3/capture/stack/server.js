// A small Supabase stand-in for running the real app locally with demo data.
// PostgREST subset over a real Postgres (RLS on, as the signed-in user), a tiny
// GoTrue, stubbed storage and edge functions. Demo only; never deployed.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool, types } = require('pg');
// Match PostgREST's JSON: dates as plain strings, numerics and bigints as numbers.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

const pool = new Pool({ host: '/tmp', port: 54322, user: 'postgres', database: 'app', max: 8 });
const PORT = 54321;
const USERS = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8')); // [{id,email,phone}]
const FN = fs.existsSync(path.join(__dirname, 'functions.js')) ? require('./functions.js') : {};
const LOG = process.env.LOG === '1';

// ---------------------------------------------------------------- jwt --
const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
function sign(claims) {
  const h = b64u({ alg: 'HS256', typ: 'JWT' }); const p = b64u(claims);
  const s = crypto.createHmac('sha256', 'demo').update(h + '.' + p).digest('base64url');
  return `${h}.${p}.${s}`;
}
function claimsOf(req) {
  const a = req.headers.authorization || '';
  const t = a.replace(/^Bearer /, '');
  try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()); } catch { return { role: 'anon' }; }
}
function session(user) {
  const now = Math.floor(Date.now() / 1000);
  const access_token = sign({ sub: user.id, role: 'authenticated', aud: 'authenticated', email: user.email, exp: now + 3600 * 24 * 30, iat: now });
  return { access_token, token_type: 'bearer', expires_in: 3600 * 24 * 30, expires_at: now + 3600 * 24 * 30, refresh_token: 'r-' + user.id, user: userJson(user) };
}
const userJson = (u) => ({ id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, phone: u.phone || '', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2023-02-01T00:00:00Z', email_confirmed_at: '2023-02-01T00:00:00Z' });

// --------------------------------------------------------- utilities --
const q = (id) => '"' + String(id).replace(/"/g, '""') + '"';
function splitTop(s, sep = ',') {
  const out = []; let depth = 0, cur = '', quoted = false;
  for (const ch of s) {
    if (ch === '"') quoted = !quoted;
    if (!quoted && ch === '(') depth++;
    if (!quoted && ch === ')') depth--;
    if (!quoted && depth === 0 && ch === sep) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur !== '') out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

let FKS = null; // [{from, fromCols, to, toCols}]
async function fks() {
  if (FKS) return FKS;
  const { rows } = await pool.query(`
    select c.conrelid::regclass::text as "from", c.confrelid::regclass::text as "to",
      (select array_agg(a.attname::text order by k.n) from unnest(c.conkey) with ordinality k(attnum, n) join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as "fromCols",
      (select array_agg(a.attname::text order by k.n) from unnest(c.confkey) with ordinality k(attnum, n) join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum) as "toCols"
    from pg_constraint c where c.contype = 'f' and c.connamespace = 'public'::regnamespace`);
  FKS = rows.map((r) => ({ ...r, from: r.from.replace(/^public\./, ''), to: r.to.replace(/^public\./, '') }));
  return FKS;
}

// select list -> sql expressions for table alias `t`
async function selectSql(table, sel, alias, depth = 0) {
  const parts = splitTop(sel || '*');
  const out = [];
  for (const raw of parts) {
    const m = raw.match(/^(?:([\w]+):)?([\w]+)(?:!([\w]+))?(?:\((.*)\))$/s);
    if (m) {
      const [, as, rel, , inner] = m;
      const F = await fks();
      const childAlias = `e${depth}_${rel}`;
      const sub = await selectSql(rel, inner || '*', childAlias, depth + 1);
      const toOne = F.find((f) => f.from === table && f.to === rel);
      const toMany = F.find((f) => f.from === rel && f.to === table);
      if (toOne) {
        const on = toOne.fromCols.map((c, i) => `${childAlias}.${q(toOne.toCols[i])} = ${alias}.${q(c)}`).join(' and ');
        out.push(`(select row_to_json(x) from (select ${sub} from public.${q(rel)} ${childAlias} where ${on} limit 1) x) as ${q(as || rel)}`);
      } else if (toMany) {
        const on = toMany.fromCols.map((c, i) => `${childAlias}.${q(c)} = ${alias}.${q(toMany.toCols[i])}`).join(' and ');
        out.push(`coalesce((select json_agg(x) from (select ${sub} from public.${q(rel)} ${childAlias} where ${on}) x), '[]') as ${q(as || rel)}`);
      } else {
        out.push(`null as ${q(as || rel)}`);
      }
      continue;
    }
    if (raw === '*') { out.push(`${alias}.*`); continue; }
    const c = raw.match(/^(?:([\w]+):)?([\w]+)(?:->>?([\w]+))?(?:::(\w+))?$/);
    if (!c) throw bad(`unsupported select item ${raw}`);
    const [, as, col, , cast] = c;
    out.push(`${alias}.${q(col)}${cast ? '::' + cast : ''} as ${q(as || col)}`);
  }
  return out.join(', ');
}

function bad(message, code = 'PGRST100', status = 400) { const e = new Error(message); e.pg = { code, message, details: null, hint: null }; e.status = status; return e; }

function parseValueList(v) { // (a,b,"c d")
  const inner = v.replace(/^\(/, '').replace(/\)$/, '');
  return splitTop(inner).map((x) => x.replace(/^"(.*)"$/, '$1'));
}

// one filter `col` + `op.value` -> sql
function filterSql(col, expr, params, alias) {
  let neg = false;
  if (expr.startsWith('not.')) { neg = true; expr = expr.slice(4); }
  const dot = expr.indexOf('.');
  const op = expr.slice(0, dot); const val = expr.slice(dot + 1);
  const c = col.includes('->') ? col.replace(/^(\w+)->>(\w+)$/, (_, a, b) => `${alias}.${q(a)}->>'${b}'`) : `${alias}.${q(col)}`;
  const p = (x) => { params.push(x); return `$${params.length}`; };
  let s;
  switch (op) {
    case 'eq': s = `${c}::text = ${p(val)}`; break;
    case 'neq': s = `${c}::text <> ${p(val)}`; break;
    case 'gt': s = `${c} > ${p(val)}`; break;
    case 'gte': s = `${c} >= ${p(val)}`; break;
    case 'lt': s = `${c} < ${p(val)}`; break;
    case 'lte': s = `${c} <= ${p(val)}`; break;
    case 'like': s = `${c}::text like ${p(val.replace(/\*/g, '%'))}`; break;
    case 'ilike': s = `${c}::text ilike ${p(val.replace(/\*/g, '%'))}`; break;
    case 'is': s = `${c} is ${val === 'null' ? 'null' : val === 'true' ? 'true' : val === 'false' ? 'false' : 'unknown'}`; break;
    case 'in': s = `${c}::text = any(${p(parseValueList(val))}::text[])`; break;
    case 'cs': s = val.startsWith('{') ? `${c} @> ${p(val)}` : `${c} @> ${p(val)}::jsonb`; break;
    case 'cd': s = `${c} <@ ${p(val)}`; break;
    case 'ov': s = `${c} && ${p(val.startsWith('(') ? '{' + parseValueList(val).join(',') + '}' : val)}`; break;
    default: throw bad(`unsupported operator ${op}`);
  }
  return neg ? `not (${s})` : s;
}
function logicSql(kind, val, params, alias) { // or=(a.eq.1,b.eq.2)
  const items = splitTop(val.replace(/^\(/, '').replace(/\)$/, ''));
  const parts = items.map((it) => {
    const m = it.match(/^(or|and)(\(.*\))$/);
    if (m) return logicSql(m[1], m[2], params, alias);
    const d = it.indexOf('.');
    return filterSql(it.slice(0, d), it.slice(d + 1), params, alias);
  });
  return '(' + parts.join(kind === 'or' ? ' or ' : ' and ') + ')';
}
const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);
function whereSql(sp, params, alias) {
  const w = [];
  for (const [k, v] of sp) {
    if (RESERVED.has(k) || k.includes('.')) continue; // embedded filters ignored
    if (k === 'or' || k === 'and') w.push(logicSql(k, v, params, alias));
    else w.push(filterSql(k, v, params, alias));
  }
  return w.length ? ' where ' + w.join(' and ') : '';
}
function orderSql(v, alias) {
  if (!v) return '';
  return ' order by ' + splitTop(v).map((o) => {
    const [col, ...mods] = o.split('.');
    let s = `${alias}.${q(col)}`;
    if (mods.includes('desc')) s += ' desc'; else s += ' asc';
    if (mods.includes('nullsfirst')) s += ' nulls first';
    if (mods.includes('nullslast')) s += ' nulls last';
    return s;
  }).join(', ');
}

async function asUser(claims, fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const role = claims.role === 'authenticated' ? 'authenticated' : claims.role === 'service_role' ? 'service_role' : 'anon';
    await client.query(`select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true), set_config('request.jwt.claim.role', $3, true)`, [JSON.stringify(claims), claims.sub || '', role]);
    await client.query(`set local role ${role}`);
    const r = await fn(client);
    await client.query('commit');
    return r;
  } catch (e) { await client.query('rollback').catch(() => {}); throw e; } finally { client.release(); }
}

let COLTYPES = {};
async function colTypes(table) {
  if (COLTYPES[table]) return COLTYPES[table];
  const { rows } = await pool.query(`select attname, format_type(atttypid, atttypmod) t from pg_attribute where attrelid = $1::regclass and attnum > 0 and not attisdropped`, ['public.' + table]);
  COLTYPES[table] = Object.fromEntries(rows.map((r) => [r.attname, r.t]));
  return COLTYPES[table];
}

// ------------------------------------------------------------- rest --
async function rest(req, res, url, body) {
  const table = decodeURIComponent(url.pathname.replace('/rest/v1/', ''));
  const sp = url.searchParams; const claims = claimsOf(req);
  const prefer = req.headers.prefer || '';
  const single = (req.headers.accept || '').includes('vnd.pgrst.object');
  const wantCount = /count=(exact|planned|estimated)/.test(prefer);

  if (table.startsWith('rpc/')) return rpc(req, res, table.slice(4), body ? JSON.parse(body || '{}') : Object.fromEntries(sp), claims, single);

  const params = []; const A = 't';
  let sql; let rowsOut;
  if (req.method === 'GET' || req.method === 'HEAD') {
    const cols = await selectSql(table, sp.get('select') || '*', A);
    const where = whereSql(sp, params, A);
    const lim = sp.get('limit') ? ` limit ${Number(sp.get('limit'))}` : '';
    const off = sp.get('offset') ? ` offset ${Number(sp.get('offset'))}` : '';
    const rng = req.headers.range && /^(\d+)-(\d+)$/.exec(req.headers.range);
    const lim2 = rng ? ` limit ${Number(rng[2]) - Number(rng[1]) + 1} offset ${Number(rng[1])}` : lim + off;
    sql = `select ${cols} from public.${q(table)} ${A}${where}${orderSql(sp.get('order'), A)}${lim2}`;
    const countSql = wantCount ? `select count(*)::int n from public.${q(table)} ${A}${where}` : null;
    const r = await asUser(claims, async (c) => ({ rows: (await c.query(sql, params)).rows, n: countSql ? (await c.query(countSql, params)).rows[0].n : null }));
    rowsOut = r.rows;
    if (r.n !== null) res.setHeader('Content-Range', `0-${Math.max(0, rowsOut.length - 1)}/${r.n}`);
    if (req.method === 'HEAD') { res.writeHead(200); return res.end(); }
  } else if (req.method === 'POST') {
    let rows = JSON.parse(body || '[]'); if (!Array.isArray(rows)) rows = [rows];
    if (!rows.length) return send(res, 201, []);
    const types = await colTypes(table);
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((c) => types[c]);
    params.push(JSON.stringify(rows));
    const proj = cols.map((c) => `r.${q(c)}`).join(', ');
    let conflict = '';
    if (/resolution=merge-duplicates/.test(prefer) || /resolution=ignore-duplicates/.test(prefer)) {
      const on = sp.get('on_conflict') || (await pkCols(table)).join(',');
      conflict = /ignore/.test(prefer) ? ` on conflict (${on.split(',').map(q).join(',')}) do nothing` :
        ` on conflict (${on.split(',').map(q).join(',')}) do update set ${cols.map((c) => `${q(c)} = excluded.${q(c)}`).join(', ')}`;
    }
    const sel = await selectSql(table, sp.get('select') || '*', 'x');
    sql = `with ins as (insert into public.${q(table)} (${cols.map(q).join(',')}) select ${proj} from json_populate_recordset(null::public.${q(table)}, $1) r${conflict} returning *) select ${sel} from ins x`;
    rowsOut = await asUser(claims, async (c) => (await c.query(sql, params)).rows);
    if (!/return=representation/.test(prefer)) { res.writeHead(201, cors()); return res.end(); }
    return send(res, 201, single ? one(rowsOut, res) : rowsOut);
  } else if (req.method === 'PATCH') {
    const patch = JSON.parse(body || '{}');
    const types = await colTypes(table);
    const cols = Object.keys(patch).filter((c) => types[c]);
    params.push(JSON.stringify(patch));
    const where = whereSql(sp, params, A);
    const sel = await selectSql(table, sp.get('select') || '*', 'x');
    sql = `with up as (update public.${q(table)} ${A} set ${cols.map((c) => `${q(c)} = r.${q(c)}`).join(', ')} from json_populate_record(null::public.${q(table)}, $1) r${where} returning ${A}.*) select ${sel} from up x`;
    rowsOut = await asUser(claims, async (c) => (await c.query(sql, params)).rows);
    if (!/return=representation/.test(prefer)) { res.writeHead(204, cors()); return res.end(); }
  } else if (req.method === 'DELETE') {
    const where = whereSql(sp, params, A);
    sql = `delete from public.${q(table)} ${A}${where} returning *`;
    rowsOut = await asUser(claims, async (c) => (await c.query(sql, params)).rows);
    if (!/return=representation/.test(prefer)) { res.writeHead(204, cors()); return res.end(); }
  }
  if (single) { const o = one(rowsOut, res); if (o === undefined) return; return send(res, 200, o); }
  return send(res, 200, rowsOut);
}
function one(rows, res) {
  if (rows.length === 1) return rows[0];
  send(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows`, hint: null });
  return undefined;
}
async function pkCols(table) {
  const { rows } = await pool.query(`select a.attname from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey) where i.indrelid = $1::regclass and i.indisprimary`, ['public.' + table]);
  return rows.map((r) => r.attname);
}

async function rpc(req, res, name, args, claims, single) {
  const { rows: fnrows } = await pool.query(`select p.proretset, format_type(p.prorettype, null) rt, p.proargnames, array(select format_type(t, null) from unnest(p.proargtypes) t) argtypes from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = $1`, [name]);
  if (!fnrows.length) return send(res, 404, { code: 'PGRST202', message: `Could not find the function public.${name} without parameters in the schema cache`, details: null, hint: null });
  // pick the overload whose arg names cover what was passed
  const keys = Object.keys(args);
  const f = fnrows.find((r) => keys.every((k) => (r.proargnames || []).includes(k))) || fnrows[0];
  const params = []; const named = [];
  for (const k of keys) {
    const i = (f.proargnames || []).indexOf(k); if (i < 0 || i >= f.argtypes.length) continue;
    const v = args[k];
    params.push(v === null ? null : Array.isArray(v) && f.argtypes[i].endsWith('[]') ? v : typeof v === 'object' ? JSON.stringify(v) : String(v));
    named.push(`${q(k)} => $${params.length}::${f.argtypes[i]}`);
  }
  const call = `public.${q(name)}(${named.join(', ')})`;
  const composite = !['json', 'jsonb', 'text', 'uuid', 'integer', 'bigint', 'boolean', 'void', 'numeric', 'date', 'timestamp with time zone', 'smallint', 'double precision'].includes(f.rt);
  let sql;
  if (f.proretset) sql = `select coalesce(json_agg(x), '[]') v from ${call} x`;
  else if (composite) sql = `select row_to_json(x) v from ${call} x`;
  else sql = `select to_json(${call}) v`;
  const r = await asUser(claims, async (c) => (await c.query(sql, params)).rows[0]);
  let v = r ? r.v : null;
  if (single && Array.isArray(v)) v = v[0] ?? null;
  return send(res, 200, v);
}

// ------------------------------------------------------------- auth --
async function auth(req, res, url, body) {
  const p = url.pathname.replace('/auth/v1', '');
  if (p === '/user') {
    const c = claimsOf(req); const u = USERS.find((x) => x.id === c.sub);
    return u ? send(res, 200, userJson(u)) : send(res, 401, { code: 401, msg: 'invalid JWT' });
  }
  if (p === '/token') {
    const b = JSON.parse(body || '{}');
    const u = b.refresh_token ? USERS.find((x) => 'r-' + x.id === b.refresh_token) : USERS.find((x) => x.email === b.email || x.phone === b.phone) || USERS[0];
    return send(res, 200, session(u || USERS[0]));
  }
  if (p === '/logout') { res.writeHead(204, cors()); return res.end(); }
  if (p === '/otp' || p === '/signup' || p === '/recover') return send(res, 200, {});
  if (p === '/verify') return send(res, 200, session(USERS[0]));
  if (p === '/settings') return send(res, 200, { external: { email: true, phone: true }, disable_signup: false });
  return send(res, 200, {});
}

// ---------------------------------------------------------- storage --
const STORE = path.join(__dirname, 'storage');
async function storage(req, res, url, body, raw) {
  const p = decodeURIComponent(url.pathname.replace('/storage/v1', ''));
  let m;
  if ((m = p.match(/^\/object\/sign\/([^/]+)\/(.+)$/))) {
    if (req.method === 'POST') return send(res, 200, { signedURL: `/object/sign/${m[1]}/${m[2]}?token=demo` });
    return file(res, path.join(STORE, m[1], m[2]));
  }
  if ((m = p.match(/^\/object\/sign\/([^/]+)$/)) && req.method === 'POST') {
    const b = JSON.parse(body || '{}');
    return send(res, 200, (b.paths || []).map((x) => ({ path: x, signedURL: `/object/sign/${m[1]}/${x}?token=demo`, error: null })));
  }
  if ((m = p.match(/^\/object\/(?:public\/|authenticated\/)?([^/]+)\/(.+)$/))) {
    if (req.method === 'POST' || req.method === 'PUT') {
      const dest = path.join(STORE, m[1], m[2]); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, raw);
      return send(res, 200, { Key: `${m[1]}/${m[2]}`, Id: crypto.randomUUID() });
    }
    if (req.method === 'DELETE') return send(res, 200, []);
    return file(res, path.join(STORE, m[1], m[2]));
  }
  if ((m = p.match(/^\/object\/([^/]+)$/)) && req.method === 'DELETE') return send(res, 200, []);
  if ((m = p.match(/^\/object\/list\/([^/]+)$/))) return send(res, 200, []);
  return send(res, 200, {});
}
function file(res, f) {
  if (!fs.existsSync(f)) return send(res, 404, { statusCode: '404', error: 'not_found', message: 'Object not found' });
  const ext = path.extname(f).toLowerCase();
  const type = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.pdf': 'application/pdf', '.webp': 'image/webp' }[ext] || 'application/octet-stream';
  res.writeHead(200, { ...cors(), 'Content-Type': type }); fs.createReadStream(f).pipe(res);
}

// -------------------------------------------------------- functions --
async function functions(req, res, url, body) {
  const name = url.pathname.replace('/functions/v1/', '');
  const h = FN[name];
  if (!h) return send(res, 200, {});
  const out = await h(JSON.parse(body || '{}'), claimsOf(req), pool);
  return send(res, 200, out);
}

// ----------------------------------------------------------- server --
function cors() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS', 'Access-Control-Expose-Headers': 'Content-Range, Content-Profile' };
}
function send(res, status, obj) {
  res.writeHead(status, { ...cors(), 'Content-Type': 'application/json' });
  res.end(obj === undefined ? '' : JSON.stringify(obj));
}

http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    const raw = Buffer.concat(chunks); const body = raw.toString('utf8');
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'OPTIONS') { res.writeHead(204, cors()); return res.end(); }
    try {
      if (url.pathname.startsWith('/rest/v1/')) await rest(req, res, url, body);
      else if (url.pathname.startsWith('/auth/v1/')) await auth(req, res, url, body);
      else if (url.pathname.startsWith('/storage/v1/')) await storage(req, res, url, body, raw);
      else if (url.pathname.startsWith('/functions/v1/')) await functions(req, res, url, body);
      else send(res, 404, {});
      if (LOG) console.log(req.method, req.url.slice(0, 200), res.statusCode);
    } catch (e) {
      const status = e.status || 400;
      const pg = e.pg || { code: e.code || 'PGRST000', message: e.message, details: e.detail || null, hint: e.hint || null };
      console.log('ERR', req.method, req.url.slice(0, 200), pg.message);
      if (!res.headersSent) send(res, status, pg);
    }
  });
}).listen(PORT, () => console.log('mock supabase on', PORT));
