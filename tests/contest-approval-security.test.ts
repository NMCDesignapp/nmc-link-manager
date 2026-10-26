import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminSession, verifyAdminSession, hasSameOrigin } from '../src/lib/admin-session.ts';

test('admin cookie is signed, expiry-bound, and rejects tampering',()=>{
 const previous=process.env.NMC_ADMIN_SESSION_SECRET;
 try {
   process.env.NMC_ADMIN_SESSION_SECRET='test-only-secret-not-for-deployment-abcdefghijklmnopqrstuvwxyz';
   const issued=createAdminSession();
   assert.ok(issued);
   assert.equal(verifyAdminSession(issued!),true);
   const modified=issued!.replace(/.$/, issued!.endsWith('A')?'B':'A');
   assert.equal(verifyAdminSession(modified),false);
   assert.equal(verifyAdminSession('v1.9999999999.fake'),false);
   assert.equal(verifyAdminSession(issued!,Date.now()+9*60*60*1000),false);
   process.env.NMC_ADMIN_SESSION_SECRET='another-test-only-secret-abcdefghijklmnopqrstuvwxyz';
   assert.equal(verifyAdminSession(issued!),false);
   process.env.NMC_ADMIN_SESSION_SECRET='short';
   assert.equal(createAdminSession(),null);
 } finally {
   if(previous===undefined)delete process.env.NMC_ADMIN_SESSION_SECRET;
   else process.env.NMC_ADMIN_SESSION_SECRET=previous;
 }
});

test('write-origin check rejects missing, cross-site, or invalid Origin',()=>{
 const req=(origin:string|null,host='nc-link.vercel.app')=>({
   headers:{get:(key:string)=>key.toLowerCase()==='origin'?origin:null},
   nextUrl:{host},
 }) as any;
 assert.equal(hasSameOrigin(req('https://nc-link.vercel.app')),true);
 assert.equal(hasSameOrigin(req('https://unsafe.example.org')),false);
 assert.equal(hasSameOrigin(req('not-a-url')),false);
 assert.equal(hasSameOrigin(req(null)),false);
});
