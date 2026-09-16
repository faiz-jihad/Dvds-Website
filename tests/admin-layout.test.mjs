import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const require = createRequire(import.meta.url);
class SchemaError extends Error {
  code = 'SCHEMA_NOT_READY';
  details = ['orders: column orders.payment_method does not exist'];
}
let compiled;
async function renderAdmin(route) {
  if (!compiled) {
    const output = await build({ entryPoints: ['src/components/layout/AdminLayout.tsx'], bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external',
      plugins: [{ name: 'admin-layout-test', setup(b) {
        b.onResolve({ filter: /^lucide-react$/ }, () => ({ path: path.resolve('node_modules/lucide-react/dist/esm/lucide-react.js') }));
        b.onResolve({ filter: /\/AdminAuth$/ }, () => ({ path: 'auth', namespace: 'mock' }));
        b.onResolve({ filter: /\/realtime$/ }, () => ({ path: 'realtime', namespace: 'mock' }));
        b.onResolve({ filter: /\/adminApi$/ }, () => ({ path: 'api', namespace: 'mock' }));
        b.onResolve({ filter: /\/AdminNotificationMenu$/ }, () => ({ path: 'notification', namespace: 'mock' }));
        b.onResolve({ filter: /\/Toast$/ }, () => ({ path: 'toast', namespace: 'mock' }));
        b.onResolve({ filter: /\.sql\?url$/ }, () => ({ path: 'sql', namespace: 'mock' }));
        b.onResolve({ filter: /^@tanstack\/react-query$/ }, () => ({ path: 'query', namespace: 'mock' }));
        b.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: {
          auth: "export const useAdminAuth = () => ({ user: { id: 'owner', fullName: 'Admin', role: 'admin' }, logout: async () => {} });",
          realtime: 'export const useRealtimeStatus = () => ({ isConnected: false });',
          api: 'export const AdminBackendError = globalThis.SchemaError; export const adminApi = { checkSchema: (scope) => { globalThis.checkedScope = scope; } };',
          notification: 'export const AdminNotificationMenu = () => null;',
          toast: 'export const ToastContainer = () => null;',
          sql: 'export default "/assets/repair.sql";',
          query: "export const useQuery = (options) => { globalThis.queryOptions = options; return options.queryKey[2] === 'orders' ? { error: new globalThis.SchemaError('This page needs a database update.') } : {}; };",
        }[path] }));
      } }],
    }); compiled = output.outputFiles[0].text;
  }
  const context = { module: { exports: {} }, require, console, SchemaError };
  vm.runInNewContext(compiled, context);
  const { AdminLayout } = context.module.exports;
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(Routes, null,
    React.createElement(Route, { path: '/admin', element: React.createElement(AdminLayout) },
      React.createElement(Route, { path: 'users', element: React.createElement('p', null, 'Real users table') }),
      React.createElement(Route, { path: 'orders', element: React.createElement('p', null, 'Real orders table') }),
    ),
  )));
  context.queryOptions.queryFn();
  return { html, context };
}

test('Users renders its content despite missing payment schema; route and account have separate health cache', async () => {
  const { html, context } = await renderAdmin('/admin/users');
  assert.ok(html.includes('Real users table'));
  assert.ok(!html.includes('Database update required'));
  assert.ok(html.includes('Live updates paused'));
  assert.equal(context.checkedScope, 'users');
  assert.deepEqual(Array.from(context.queryOptions.queryKey), ['admin', 'schema-health', 'users', 'owner']);
});

test('affected Orders page shows the exact missing column and a downloadable repair without hiding navigation', async () => {
  const { html, context } = await renderAdmin('/admin/orders');
  assert.ok(!html.includes('Real orders table'));
  assert.ok(html.includes('orders.payment_method'));
  assert.ok(html.includes('download="repair_admin_schema.sql"'));
  assert.ok(html.includes('href="/admin/users"'));
  assert.equal(context.checkedScope, 'orders');
});
