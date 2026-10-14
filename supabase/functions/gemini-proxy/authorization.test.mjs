import { readFile, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('./', import.meta.url);
const fixed = await readFile(new URL('index.ts', root), 'utf8');
const authorization = await readFile(new URL('authorization.ts', root), 'utf8');
const tests = [];
const identity = { id: 'closed-fixture-user', email: 'approved@example.invalid', email_confirmed_at: '2026-01-01', app_metadata: {}, is_anonymous: false };

function runtime(source, options = {}) {
  let handler, models = 0; const requests = []; const logs=[];
  const fakeFetch = async (input, init) => {
    requests.push({ url: String(input), ...init });
    if (options.throwFetch) throw new Error('fixture-secret-token approved@example.invalid');
    if (String(input).endsWith('/auth/v1/user')) {
      return Response.json(options.user ?? identity, { status: options.userStatus ?? 200 });
    }
    if (String(input).includes('/approved_staff?')) {
      return Response.json(options.staff ?? [], { status: options.staffStatus ?? 200 });
    }
    if (String(input).endsWith('/rpc/check_email_approved')) {
      return Response.json(options.scouts ?? [{ is_approved: false }], { status: options.scoutStatus ?? 200 });
    }
    throw new Error('Unexpected external request: ' + input);
  };
  class GoogleGenerativeAI {
    constructor() { models++; }
    getGenerativeModel() { return { generateContent: async () => {
      if (options.throwModel) throw new Error('fixture-secret-token approved@example.invalid');
      return { response: { text: () => '{"firstName":"Closed fixture"}' } };
    } }; }
  }
  const env = { SUPABASE_URL: 'https://closed-fixture.invalid', SUPABASE_ANON_KEY: 'public-fixture-key', GEMINI_API_KEY: 'unused-fake-key', ...(options.env ?? {}) };
  const context = vm.createContext({ Request, Response, URLSearchParams, AbortSignal, console: { error(...args) {logs.push(args.map(String).join(' '));}, warn() {} }, fetch: fakeFetch, GoogleGenerativeAI,
    Deno: { env: { get: name => env[name] }, serve: fn => { handler = fn; } } });
  const withoutImports = source.replace(/^import .*;\s*$/gm, '');
  const code = (source === fixed ? authorization.replace('export async function', 'async function') + '\n' : '') + withoutImports;
  vm.runInContext(stripTypeScriptTypes(code, { mode: 'strip' }), context);
  return { call: async ({ token = 'fixture-user-token', operation = 'parsePlayerDetails', method = 'POST', payload = { text: 'closed fixture' } } = {}) => {
    const headers = token === null ? {} : { authorization: `Bearer ${token}` };
    const request = new Request('https://closed-fixture.invalid/functions/v1/gemini-proxy', { method, headers, ...(method === 'POST' ? { body: JSON.stringify({ operation, payload }) } : {}) });
    const response = await handler(request); const body = await response.text();
    return { status: response.status, body, models, requests, logs };
  } };
}
async function probe(name, options, request, status, modelCount = 0) {
  const result = await runtime(fixed, options).call(request);
  assert.equal(result.status, status, name + ': ' + result.body);
  assert.equal(result.models, modelCount, name);
  assert.ok(!result.body.includes('fixture-secret-token') && !result.body.includes('approved@example.invalid'), name + ': no credential or email leak');
  assert.ok(!result.logs.join(' ').includes('fixture-secret-token') && !result.logs.join(' ').includes('approved@example.invalid'), name + ': safe logs');
  tests.push({ name, passed: true }); return result;
}
await probe('Missing token stops before all external work', {}, { token: null }, 401);
await probe('Public anon token is rejected by Auth before model', { userStatus: 401 }, { token: 'public-anon-token' }, 401);
await probe('Forged or expired user token is denied', { userStatus: 403 }, {}, 401);
await probe('Malformed token Auth 400 is authentication failure', { userStatus: 400 }, {}, 401);
await probe('Auth throttling remains a temporary failure', { userStatus: 429 }, {}, 503);
await probe('Anonymous Auth account is denied', { user: { ...identity, is_anonymous: true } }, {}, 401);
await probe('Unconfirmed email cannot claim an approval', { user: { ...identity, email_confirmed_at: null } }, {}, 401);
await probe('Missing verified identity is denied', { user: { ...identity, id: '' } }, {}, 401);
await probe('Ordinary user without staff/scout approval is denied', {}, {}, 403);
await probe('Body role and email cannot grant approval', {}, { payload: { role: 'admin', email: 'admin@example.invalid', text: 'fixture' } }, 403);
await probe('User-editable metadata cannot grant approval', { user: { ...identity, user_metadata: { role: 'admin' } } }, {}, 403);
await probe('Server-controlled admin is accepted', { user: { ...identity, app_metadata: { role: 'admin' } } }, {}, 200, 1);
const staff = await probe('Approved staff is accepted without a service key', { staff: [{ id: 'approval-fixture' }] }, {}, 200, 1);
assert.equal(staff.requests.length, 2);
assert.equal(new URL(staff.requests[1].url).searchParams.get('email'), 'eq.approved@example.invalid');
const scout = await probe('Approved scout is accepted using verified email', { scouts: [{ is_approved: true }] }, { payload: { text: 'fixture', email: 'spoof@example.invalid' } }, 200, 1);
assert.deepEqual(JSON.parse(scout.requests[2].body), { email_to_check: identity.email });
await probe('String approval does not grant access', { scouts: [{ is_approved: 'true' }] }, {}, 403);
await probe('Auth outage fails closed with safe retryable error', { userStatus: 500 }, {}, 503);
await probe('Approval read outage fails closed', { staffStatus: 500 }, {}, 503);
await probe('Approval RPC denied fails closed', { scoutStatus: 401 }, {}, 503);
await probe('Malformed approval response fails closed', { staff: {} }, {}, 503);
await probe('Network errors disclose no token or email', { throwFetch: true }, {}, 503);
await probe('Missing runtime public key fails before fetch', { env: { SUPABASE_ANON_KEY: undefined } }, {}, 503);
const modern = await probe('Modern publishable key works without a legacy anon key', { env: { SUPABASE_ANON_KEY: undefined, SUPABASE_PUBLISHABLE_KEY: 'modern-public-fixture' }, staff: [{ id: 'approval-fixture' }] }, {}, 200, 1);
assert.equal(modern.requests[0].headers.apikey, 'modern-public-fixture');
await probe('Unsupported operation never invokes a model', { staff: [{ id: 'approval-fixture' }] }, { operation: '__invalid__' }, 400);
await probe('Object prototype operation is denied', { staff: [{ id: 'approval-fixture' }] }, { operation: 'constructor' }, 400);
await probe('CORS preflight remains usable without authentication', {}, { method: 'OPTIONS', token: null }, 200);
await probe('Other methods remain rejected', {}, { method: 'GET', token: null }, 405);
const failedModel=await probe('Model errors expose only a generic response and safe log', {staff:[{id:'approval-fixture'}],throwModel:true}, {},500,1);
assert.equal(JSON.parse(failedModel.body).error,'AI temporarily unavailable');
const result = { checked_at_utc: new Date().toISOString(), engine: 'Node built-in TypeScript stripping + VM, full function handler', test_count: tests.length, passed: tests.length, tests,
 limits: 'Closed HTTP/Auth/approval/model fixtures only. No production write, SMTP send, or paid model call. Does not prove live caller compatibility or spending limits.' };
console.log(JSON.stringify(result, null, 2));
