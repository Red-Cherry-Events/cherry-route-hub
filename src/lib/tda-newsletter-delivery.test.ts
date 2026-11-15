import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {transactionalRequest,transactionId,newsletterContactState} from './tda-newsletter-delivery.server';
describe('Individual newsletter delivery',()=>{
 it('targets exactly one address with the approved sender and reply address',()=>{const r=transactionalRequest('shaun@redcherryevents.co.za','Shaun','Approved','<html>approved</html>','key');assert.deepEqual(Object.keys(r.headers.to),['shaun@redcherryevents.co.za']);assert.deepEqual(r.headers.from,{'Team@redcherryevents.co.za':'M&G Investments Tour de Addo'});assert.deepEqual(r.headers.reply_to,{'team@redcherryevents.co.za':'Red Cherry Events'});assert.equal(r.body.html,'<html>approved</html>');});
 it('requires a confirmed transaction identifier',()=>{assert.equal(transactionId({item:{transaction_id:'single-123'}}),'single-123');assert.throws(()=>transactionId({item:{}}));});
 it('never bypasses an explicit opt-out on duplicate contacts',()=>{assert.equal(newsletterContactState({collection:[{data:{email:'a@b.co',status:'on',email_status:'none'}},{data:{email:'a@b.co',status:'on',email_status:'unsubscribed'}}]},'a@b.co'),'unsubscribed');});
 it('handles historical bounced duplicates without changing any provider status',()=>{assert.equal(newsletterContactState({collection:[{data:{email:'a@b.co',status:'on',email_status:'bounced'}},{data:{email:'a@b.co',status:'on',email_status:'none'}}]},'a@b.co'),'active');});
});