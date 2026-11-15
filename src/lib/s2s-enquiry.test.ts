import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseS2sEnquiry, S2S_LIST_IDS, S2S_NORTH_EVENT_ID, s2sCorsHeaders, shouldRecordNorthInterest } from './s2s-enquiry';
import { consumeEnquiryQuota, ENQUIRY_QUOTAS, readEnquiryFields } from './website-enquiry-request.server';
const base = { name: 'Sam', email: 'Sam@Example.com', message: 'Can our team join?' };
describe('Sea to Sea website enquiry rules', () => {
  for (const field of ['name', 'email', 'message']) it(`requires ${field}`, () => assert.equal(parseS2sEnquiry({ ...base, [field]: '' }).kind, 'invalid'));
  for (const [field, max] of [['name',120],['phone',40],['team_size',40],['message',4000]] as const) it(`bounds ${field} at ${max}`, () => {
    assert.equal(parseS2sEnquiry({ ...base, [field]: 'x'.repeat(max) }).kind, 'ok');
    assert.equal(parseS2sEnquiry({ ...base, [field]: 'x'.repeat(max+1) }).kind, 'invalid');
  });
  it('rejects bad email', () => assert.equal(parseS2sEnquiry({ ...base, email: 'invalid' }).kind, 'invalid'));
  it('normalises email and defaults ride to both', () => { const p=parseS2sEnquiry(base); assert.equal(p.kind==='ok' && p.enquiry.email,'sam@example.com'); assert.equal(p.kind==='ok' && p.enquiry.ride,'both'); });
  it('accepts only south, north and both', () => { for(const ride of ['south','north','both']) assert.equal(parseS2sEnquiry({...base,ride}).kind,'ok'); assert.equal(parseS2sEnquiry({...base,ride:'other'}).kind,'invalid'); });
  it('silently accepts the honeypot before validating', () => assert.equal(parseS2sEnquiry({_gotcha:'bot'}).kind,'honeypot'));
  it('requires checkbox consent for marketing', () => { for(const consent of ['on','true','yes']) { const p=parseS2sEnquiry({...base,consent}); assert.equal(p.kind==='ok' && p.enquiry.consent,true); } const p=parseS2sEnquiry(base); assert.equal(p.kind==='ok' && p.enquiry.consent,false); });
  it('records only consented north or both interest', () => { assert.equal(shouldRecordNorthInterest({ride:'north',consent:true}),true); assert.equal(shouldRecordNorthInterest({ride:'both',consent:true}),true); assert.equal(shouldRecordNorthInterest({ride:'south',consent:true}),false); assert.equal(shouldRecordNorthInterest({ride:'north',consent:false}),false); assert.equal(S2S_NORTH_EVENT_ID,'2544f097-ba01-416a-8f51-dbd8af33f5de'); });
  it('uses verified enquiry and master Motorbikes lists', () => assert.deepEqual(S2S_LIST_IDS,['102756','97023']));
  it('allows exactly the three specified origins', () => { for(const origin of ['https://seatosea.co.za','https://www.seatosea.co.za','https://sea-to-sea-red-cherry-events.vercel.app']) assert.equal(s2sCorsHeaders(origin)['Access-Control-Allow-Origin'],origin); for(const origin of [null,'http://seatosea.co.za','https://seatosea.co.za.evil.test','https://tourdeaddo.com']) assert.equal(s2sCorsHeaders(origin)['Access-Control-Allow-Origin'],undefined); });
  it('uses atomic overall 20/minute and per-email 5/hour quotas', async () => { const calls: any[]=[]; const admin={rpc:async (name:string,args:any)=>{calls.push({name,args});return {data:true,error:null};}}; for(const [scope,q] of Object.entries(ENQUIRY_QUOTAS)) assert.equal(await consumeEnquiryQuota(admin,scope,'sam@example.com',q.limit,q.seconds),true); assert.deepEqual(calls.map(c=>[c.name,c.args._limit,c.args._window_seconds]),[['consume_request_quota',20,60],['consume_request_quota',5,3600]]); assert.notEqual(calls[0].args._actor_hash,'sam@example.com'); });
  it('reads JSON, URL-encoded and multipart fields', async () => { const fields={...base,consent:'yes'}; const form=new FormData();Object.entries(fields).forEach(([k,v])=>form.set(k,v)); for(const init of [{headers:{'Content-Type':'application/json'},body:JSON.stringify(fields)},{body:new URLSearchParams(fields)},{body:form}]) assert.deepEqual(await readEnquiryFields(new Request('https://example.test',{method:'POST',...init})),fields); });
});