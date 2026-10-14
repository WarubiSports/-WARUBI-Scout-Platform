import { readFile, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root = new URL('./', import.meta.url);
const prepared = await readFile(new URL('geminiService.ts',root),'utf8');
async function run(source, sessions, responses = [200]) {
  const requests = [];let reads=0;
  const context=vm.createContext({Response,console:{warn(){},error(){}},toast:{error(){}},canPerformOperation:()=>({allowed:true}),recordOperation(){},
   supabase:{auth:{getSession:async()=>{const token=sessions[Math.min(reads++,sessions.length-1)];return {data:{session:token?{access_token:token}:null},error:null}}}},
   setTimeout:(callback)=>{callback();return 0},
   fetch:async(url,request)=>{requests.push({url,...request});const status=responses[Math.min(requests.length-1,responses.length-1)];return Response.json(status===200?{success:true,data:{firstName:'Fixture'}}:{error:'fixture unavailable'},{status})}});
  const code=source.replace(/^import .*;\s*$/gm,'').replace(/export /g,'').replace('import.meta.env.VITE_GEMINI_PROXY_URL',"'https://closed-fixture.invalid/proxy'").replace('import.meta.env.VITE_SUPABASE_ANON_KEY',"'public-fixture-key'")+ '\nglobalThis.parsePlayerDetails=parsePlayerDetails;';
  vm.runInContext(stripTypeScriptTypes(code,{mode:'strip'}),context);
  const result=await context.parsePlayerDetails('closed fixture');return {requests,reads,result};
}
const tests=[];
const fixed=await run(prepared,['fixture-token']);assert.equal(fixed.requests[0].headers.Authorization,'Bearer fixture-token');assert.equal(fixed.reads,1);assert.equal(fixed.result.firstName,'Fixture');
tests.push({name:'Signed-in client passes the session token and retains result',passed:true});
const missing=await run(prepared,[null]);assert.equal(missing.requests.length,0);assert.equal(Object.keys(missing.result).length,0);
tests.push({name:'Signed-out client sends no proxy request and retains fallback',passed:true});
const retried=await run(prepared,['first-fixture-token','refreshed-fixture-token'],[503,200]);assert.equal(retried.requests[0].headers.Authorization,'Bearer first-fixture-token');assert.equal(retried.requests[1].headers.Authorization,'Bearer refreshed-fixture-token');assert.equal(retried.result.firstName,'Fixture');
tests.push({name:'Retry obtains the refreshed session token',passed:true});
for (const status of [401,403]) {
 const denied=await run(prepared,['fixture-token'],[status,200]);assert.equal(denied.requests.length,1);assert.equal(Object.keys(denied.result).length,0);
 tests.push({name:`Authentication/approval ${status} is not retried`,passed:true});
}
const result={checked_at_utc:new Date().toISOString(),test_count:tests.length,passed:tests.length,tests,limits:'Actual full client service in a closed VM with fake Auth, HTTP and UI dependencies. No real login, browser, or model operation.'};
console.log(JSON.stringify(result,null,2));
