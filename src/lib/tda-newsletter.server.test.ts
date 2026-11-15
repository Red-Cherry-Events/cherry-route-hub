import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {hasTdaEntry,processTdaNewsletter} from './tda-newsletter.server';

function readAdmin(entries:unknown[]){
  return {from(table:string){
    const value=table==='events'?{data:[{id:'dar'},{id:'ny'}]}:{data:entries};
    const q={select(){return q;},in(){return q;},limit(){return Promise.resolve(value);},then(resolve:(v:unknown)=>unknown){return Promise.resolve(value).then(resolve);}};
    return q;
  }};
}
describe('TDA newsletter entry safety',()=>{
  it('matches an entry by normalised email only',async()=>{
    assert.equal(await hasTdaEntry(readAdmin([{entrants:{email:' SAM@Example.com '}}]),'sam@example.com'),true);
    assert.equal(await hasTdaEntry(readAdmin([{entrants:{email:'other@example.com'}}]),'sam@example.com'),false);
  });
  it('treats underscores and percent signs as literal email characters',async()=>{
    assert.equal(await hasTdaEntry(readAdmin([{entrants:{email:'ab@example.com'}}]),'a_@example.com'),false);
    assert.equal(await hasTdaEntry(readAdmin([{entrants:{email:'a_@example.com'}}]),'a_@example.com'),true);
  });
  it('never sends subscriber mail while the series switch is off',async()=>{
    const admin={from(table:string){const result=table==='tda_newsletter_campaign'?{data:{enabled:false,delivery_verified:true}}:{data:[]};const q={select(){return q;},eq(){return q;},order(){return q;},limit(){return Promise.resolve(result);},maybeSingle(){return Promise.resolve(result);}};return q;}};
    const result=await processTdaNewsletter(admin);
    assert.equal(result.sent,0);
    assert.equal(result.disabled,true);
  });
});