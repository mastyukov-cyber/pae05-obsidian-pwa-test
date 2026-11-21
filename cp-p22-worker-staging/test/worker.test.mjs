/* CP-P22 R01: synthetic Node 26 stdlib tests. No network, Mac, Dropbox, or real notes. */
import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {readFile} from "node:fs/promises";
import worker from "../worker.mjs";
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const ORIGIN="https://cp-p22.example.test",KEY="S".repeat(48);
const env={PAE05_P22_SYNTHETIC_SESSION_KEY:KEY};
const post={"Origin":ORIGIN,"Sec-Fetch-Site":"same-origin","X-PAE05-P22-Demo":"synthetic-only","Content-Type":"application/json"};
function req(path,method="GET",headers={},body){return new Request(ORIGIN+path,{method,headers,body});}
async function guest(){
 const r=await worker.fetch(req("/api/session","POST",post,"{}"),env);
 assert.equal(r.status,200);return r.headers.get("Set-Cookie").split(";")[0];
}
function get(path,c){return worker.fetch(req(path,"GET",c?{Cookie:c}:{}),env);}
test("missing secret binding fails closed",async()=>assert.equal((await worker.fetch(req("/api/notes"),{})).status,503));
test("HTTP API forbidden",async()=>assert.equal((await worker.fetch(new Request("http://x.test/api/notes"),env)).status,403));
test("foreign Origin forbidden",async()=>assert.equal((await worker.fetch(req("/api/session","POST",{...post,Origin:"https://bad.test"},"{}"),env)).status,403));
test("missing synthetic header forbidden",async()=>{const h={...post};delete h["X-PAE05-P22-Demo"];assert.equal((await worker.fetch(req("/api/session","POST",h,"{}"),env)).status,403);});
test("no anonymous reads",async()=>assert.equal((await get("/api/notes")).status,401));
test("guest cookie is short-lived, secure, not authenticated owner",async()=>{
 const r=await worker.fetch(req("/api/session","POST",post,"{}"),env);
 assert.equal(r.status,200);assert.match(r.headers.get("Set-Cookie"),/HttpOnly; Secure; SameSite=Strict/);
 assert.equal((await r.json()).authenticated,false);
});
test("guest receives exactly three synthetic notes",async()=>{
 const r=await get("/api/notes",await guest()),j=await r.json();
 assert.equal(r.status,200);assert.equal(j.items.length,3);assert.equal(j.peerConfirmed,false);
});
test("one fabricated note opens in read-only mode",async()=>{
 const r=await get("/api/notes/synthetic-beta",await guest()),j=await r.json();
 assert.equal(r.status,200);assert.match(j.markdown,/тестовые/);assert.equal(j.syncStatus,"SYNTHETIC_NOT_SYNCED");
});
test("no write endpoints, even for guest",async()=>{
 const c=await guest();for(const m of ["POST","PUT","PATCH","DELETE"])assert.equal((await worker.fetch(req("/api/notes",m,{Cookie:c}),env)).status,405);
});
test("modified cookie rejected",async()=>assert.equal((await get("/api/notes",(await guest())+"x")).status,401));
test("unknown note and route rejected",async()=>{
 const c=await guest();assert.equal((await get("/api/notes/not-present",c)).status,404);
 assert.equal((await get("/api/hidden",c)).status,404);
});
test("logout clears browser cookie",async()=>{
 const c=await guest(),r=await worker.fetch(req("/api/logout","POST",{...post,Cookie:c},"{}"),env);
 assert.equal(r.status,200);assert.match(r.headers.get("Set-Cookie"),/Max-Age=0/);
});
test("staging HTML is opt-in with same-origin CSP",async()=>{
 const html=await readFile(new URL("../../p16-editor/index.html",import.meta.url),"utf8");
 const assetEnv={ASSETS:{fetch:async()=>new Response(html,{status:200,headers:{"Content-Type":"text/html"}})}};
 const r=await worker.fetch(req("/"),assetEnv),s=await r.text();
 assert.equal(r.status,200);assert.match(s,/p22-cloud-readonly\.js/);assert.match(s,/connect-src 'self'/);
 assert.match(r.headers.get("Content-Security-Policy"),/connect-src 'self'/);
});
test("unexpected HTML shell rejected",async()=>{
 const assetEnv={ASSETS:{fetch:async()=>new Response("<html></html>",{status:200})}};
 assert.equal((await worker.fetch(req("/"),assetEnv)).status,503);
});
