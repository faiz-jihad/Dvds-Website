import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import 'dotenv/config';

// Only GET requests with limit=0; never log rows or credentials or call mutation RPCs.
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
const source = await readFile(new URL('../lib/adminSchema.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { adminSchemaChecks } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const results = new Map();
for (const { table, columns } of adminSchemaChecks('all')) {
  const target = new URL(`/rest/v1/${table}`, url);
  target.searchParams.set('select', columns);
  target.searchParams.set('limit', '0');
  try {
    const response = await fetch(target, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    results.set(table, response.ok);
    console.log(`${table}: ${response.ok ? 'schema OK' : `${body.code || response.status}: ${body.message || 'Request failed'}`}`);
  } catch {
    results.set(table, false);
    console.log(`${table}: connection failed`);
  }
}
for (const scope of ['dashboard', 'homepage', 'products', 'taxonomy', 'inventory', 'orders', 'promotions', 'support', 'users', 'settings', 'activity']) {
  const missing = adminSchemaChecks(scope).filter(({ table }) => !results.get(table)).map(({ table }) => table);
  console.log(`${scope}: ${missing.length ? `BLOCKED (${missing.join(', ')})` : 'required table columns available'}`);
}
console.log('Schema inspection only. RLS, administrator RPCs, uploads and payment providers need separate authenticated checks.');
if ([...results.values()].some((ok) => !ok)) process.exitCode = 1;
