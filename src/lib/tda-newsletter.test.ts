import { describe,it } from 'node:test';
import assert from 'node:assert/strict';
import {newsletterSchema,tripLine,emailDue,seriesStopped,newsletterSubject,type NewsletterCounts} from './tda-newsletter.ts';
const counts:NewsletterCounts={dar1:{sold:0,remaining:30,capacity:30},dar2:{sold:12,remaining:18,capacity:30},nyati:{sold:0,remaining:40,capacity:40},logo:'',checkedAt:''};
describe('Tour de Addo newsletter rules',()=>{
 it('normalises email and allows optional name and source',()=>{assert.deepEqual(newsletterSchema.parse({email:' Sam@Example.com '}),{email:'sam@example.com',name:'',source:''});});
 it('rejects bad email',()=>{assert.equal(newsletterSchema.safeParse({email:'not-email'}).success,false);});
 it('does not claim spots remaining when none sold',()=>{assert.equal(tripLine(counts.nyati),'Entries open');});
 it('shows exact remaining count when sold',()=>{assert.equal(tripLine(counts.dar2),'18 of 30 spots left');});
 it('sold out is a waiting list',()=>{assert.equal(tripLine({sold:30,remaining:0,capacity:30}),'Sold out, waiting list');});
 it('stops only when both target trips are full',()=>{assert.equal(seriesStopped(counts),false);assert.equal(seriesStopped({...counts,dar2:{sold:30,remaining:0,capacity:30},nyati:{sold:40,remaining:0,capacity:40}}),true);});
 it('first email is due at series start',()=>{assert.equal(emailDue('2026-11-15T05:00:00Z',1,Date.parse('2026-11-15T05:00:00Z')),true);});
 for(const n of [2,3,4]) it(`email ${n} waits exactly ${(n-1)*7} days`,()=>{const start='2026-11-15T05:00:00Z',due=Date.parse(start)+(n-1)*7*86400000;assert.equal(emailDue(start,n,due-1),false);assert.equal(emailDue(start,n,due),true);});
 it('waiting signups never become due',()=>{assert.equal(emailDue(null,1),false);});
 it('third subject uses real numbers',()=>{assert.equal(newsletterSubject(3,counts),'18 spots left on Darlington Trip 2');});
});