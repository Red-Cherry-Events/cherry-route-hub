import { renderTdaNewsletter } from './email-templates/tda-newsletter';
import { buildAvailability } from './public-availability';
import { newsletterSchema, newsletterSubject, emailDue, seriesStopped, type NewsletterCounts } from './tda-newsletter';
import { isAllowedTdaOrigin, tdaCorsHeaders, TDA_DEFAULT_LIST_IDS } from './tda-enquiry';
import { syncContactToLists } from './tda-enquiry.server';
import { everlyticRequest } from './everlytic.server';
import { sendIndividualNewsletter, newsletterContactState } from './tda-newsletter-delivery.server';

export async function newsletterCounts(admin: any): Promise<NewsletterCounts> {
  const { data: events, error } = await admin.from('events').select('id,slug,entry_ninja_id,classes,capacity,title_sponsor_logo_url').in('entry_ninja_id', ['84152','84785']);
  if (error || events?.length !== 2) throw Error('Trip availability is unavailable');
  const all = [];
  for (const event of events) {
    const { data, error } = await admin.from('event_entrants').select('category').eq('event_id', event.id).limit(10000);
    if (error) throw Error('Trip availability is unavailable');
    all.push({ event, counts: buildAvailability(event.slug, event.capacity, event.classes ?? [], (data ?? []).map((r: any) => r.category)) });
  }
  const dar = all.find(r => r.event.entry_ninja_id === '84152');
  const ny = all.find(r => r.event.entry_ninja_id === '84785');
  const d1 = dar?.counts.classes.find(r => r.id === 'c1'), d2 = dar?.counts.classes.find(r => r.id === 'c2');
  if (!d1 || !d2 || !ny || d1.capacity !== 30 || d2.capacity !== 30 || ny.counts.capacity !== 40) throw Error('Trip capacities need review');
  return { dar1: { sold: d1.sold, remaining: d1.remaining ?? 0, capacity: d1.capacity }, dar2: { sold: d2.sold, remaining: d2.remaining ?? 0, capacity: d2.capacity }, nyati: { sold: ny.counts.sold, remaining: ny.counts.remaining ?? 0, capacity: ny.counts.capacity }, logo: dar?.event.title_sponsor_logo_url ?? '', checkedAt: new Date().toISOString() };
}
export async function hasTdaEntry(admin: any, email: string) {
  const { data: events, error } = await admin.from('events').select('id').in('entry_ninja_id',['84152','84785']);
  if (error || events?.length !== 2) throw Error('Could not check entries');
  const { data, error: e } = await admin.from('event_entrants').select('entrants!inner(email)').in('event_id', events.map((r: any) => r.id)).limit(10000);
  if(e) throw Error('Could not check entries');
  return (data ?? []).some((r: any) => String(r.entrants?.email ?? '').trim().toLowerCase() === email.trim().toLowerCase());
}
export async function syncNewsletter(admin: any, id: string) {
  const { data: row } = await admin.from('tda_newsletter_signups').select('email,status').eq('id',id).single();
  if(!row || row.status==='unsubscribed') return false;
  try {
    const u = process.env['EVERLYTIC_USERNAME'], k = process.env['EVERLYTIC_API_KEY'];
    if(!u || !k) throw Error('Everlytic is not connected');
    await syncContactToLists(row.email,TDA_DEFAULT_LIST_IDS,u,k);
    await admin.from('tda_newsletter_signups').update({everlytic_synced:true,everlytic_error:null}).eq('id',id);
    return true;
  } catch(e) {
    await admin.from('tda_newsletter_signups').update({everlytic_synced:false,everlytic_error:(e as Error).message.slice(0,300)}).eq('id',id);
    return false;
  }
}
export async function handleTdaNewsletter(request: Request) {
  const origin=request.headers.get('origin'), headers=tdaCorsHeaders(origin);
  const json=(v: unknown,status=200)=>Response.json(v,{status,headers:{...headers,'cache-control':'no-store'}});
  if(!isAllowedTdaOrigin(origin)) return json({ok:false,error:'This form accepts sign-ups from tourdeaddo.com only.'},403);
  if(Number(request.headers.get('content-length')??0)>16000) return json({ok:false,error:'The form is too large.'},413);
  let form: FormData;
  try { form=await request.formData(); } catch { return json({ok:false,error:'Please check the form.'},400); }
  if(String(form.get('_gotcha')??'').trim()) return json({ok:true});
  const parsed=newsletterSchema.safeParse({email:form.get('email'),name:form.get('name')??undefined,source:form.get('source')??undefined});
  if(!parsed.success) return json({ok:false,error:parsed.error.issues[0]?.message??'Please check your email address.'},400);
  const {supabaseAdmin:admin}=await import('@/integrations/supabase/client.server');
  const actor=request.headers.get('cf-connecting-ip')??request.headers.get('x-real-ip')??'unknown';
  const hash=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))),b=>b.toString(16).padStart(2,'0')).join('');
  for(const [scope,key,limit,seconds] of [['tda-newsletter-all','all',30,60],['tda-newsletter-ip',actor,10,3600],['tda-newsletter-email',parsed.data.email,5,3600]] as const) {
    const {data,error}=await admin.rpc('consume_request_quota',{_scope:scope,_actor_hash:await hash(key),_limit:limit,_window_seconds:seconds});
    if(error || data!==true) return json({ok:false,error:'Please try again in a little while.'},429);
  }
  const {data:id,error}=await admin.rpc('subscribe_tda_newsletter',{_email:parsed.data.email,_name:parsed.data.name,_source:parsed.data.source});
  if(error || !id) return json({ok:false,error:'Could not save your sign-up. Please try again.'},500);
  await syncNewsletter(admin,id).catch(()=>false);
  // All downstream failures preserve the successful, stored submission.
  await processTdaNewsletter(admin,{id,limit:1}).catch(()=>null);
  return json({ok:true});
}
export async function newsletterPreview(admin:any,number:number,name:string,unsubscribeUrl:string) {
  const counts=await newsletterCounts(admin);
  return {subject:newsletterSubject(number,counts),html:await renderTdaNewsletter({number,name,counts,unsubscribeUrl}),counts};
}

function providerId(payload:any) {
  const id=payload?.item?.id??payload?.data?.id??payload?.id??payload?.response?.id??(typeof payload==='number'?payload:null);
  if(!/^\d+$/.test(String(id))) throw Error('Could not verify Everlytic record');
  return String(id);
}
export async function sendNewsletterTest(admin:any,email:string,name:string,number:number) {
  const preview=await newsletterPreview(admin,number,name,'https://riderhub.redcherryevents.co.za/tda-newsletter-unsubscribe?test=1');
  const u=process.env['EVERLYTIC_USERNAME'],k=process.env['EVERLYTIC_API_KEY'];
  if(!u||!k) throw Error('Everlytic is not connected');
  // Composing draft has NO audience. Preview action targets the verified admin only.
  const draft=await everlyticRequest('/api/2.0/emails','POST',u,k,{campaign_name:`TDA newsletter reference 924774 test ${number} ${Date.now()}`,subject:`[TEST ${number}/4] ${preview.subject}`,from_email:'Team@redcherryevents.co.za',from_name:'M&G Investments Tour de Addo',reply_email:'team@redcherryevents.co.za',html_original:preview.html,list_ids:'',insert_unsubscribe_link:'yes'});
  const id=providerId(draft);
  const accepted=await everlyticRequest(`/api/2.0/email_preview/${id}/${encodeURIComponent(email)}`,'POST',u,k);
  if(accepted.boolean!==true&&accepted.boolean!=='true') throw Error('Everlytic did not confirm the preview send.');
  return {ok:true,messageId:id,counts:preview.counts};
}

export async function processTdaNewsletter(admin:any,opts:{id?:string;limit?:number}={}) {
  const {data:pending}=await admin.from('tda_newsletter_signups').select('id').eq('everlytic_synced',false).eq('status','active').limit(10);
  for(const row of pending??[]) await syncNewsletter(admin,row.id);
  const {data:config}=await admin.from('tda_newsletter_campaign').select('*').eq('id',true).maybeSingle();
  if(!config?.enabled || !config.delivery_verified) return {sent:0,disabled:true};
  let query=admin.from('tda_newsletter_signups').select('*').eq('status','active').order('consent_at').limit(10000);
  if(opts.id) query=query.eq('id',opts.id);
  const {data:rows,error}=await query;
  if(error) throw Error('Could not load sign-ups');
  let sent=0;
  for(const row of rows??[]) {
    if(sent>=(opts.limit??30)) break;
    let claimId:string|undefined;
    try {
      if(await hasTdaEntry(admin,row.email)) {await admin.from('tda_newsletter_signups').update({status:'entered'}).eq('id',row.id);continue;}
      const c=await newsletterCounts(admin);
      if(seriesStopped(c)) {await admin.from('tda_newsletter_signups').update({status:'finished'}).eq('id',row.id);continue;}
      const start=row.series_started_at??new Date().toISOString();
      if(!row.series_started_at) await admin.from('tda_newsletter_signups').update({series_started_at:start}).eq('id',row.id).eq('generation',row.generation);
      if(!emailDue(start,row.next_email)) continue;
      const {data:claim,error:claimError}=await admin.from('tda_newsletter_sends').insert({signup_id:row.id,generation:row.generation,email_number:row.next_email}).select('id').single();
      if(claimError||!claim) continue; // Unique claim prevents duplicate or uncertain re-sends.
      claimId=claim.id;
      const {data:fresh}=await admin.from('tda_newsletter_signups').select('status,generation').eq('id',row.id).single();
      if(fresh?.status!=='active'||fresh.generation!==row.generation) {await admin.from('tda_newsletter_sends').update({status:'stopped'}).eq('id',claim.id);continue;}
      const u=process.env['EVERLYTIC_USERNAME'],k=process.env['EVERLYTIC_API_KEY'];
      if(!u||!k) throw Error('Everlytic is not connected');
      const raw=await everlyticRequest(`/api/2.0/contacts?filters[email]=${encodeURIComponent(row.email)}&count=25`,'GET',u,k);
      const state=newsletterContactState(raw,row.email);
      if(state==='missing'||state==='suppressed') throw Error(`Everlytic contact is ${state}. No message sent.`);
      if(state==='unsubscribed') {
        await admin.from('tda_newsletter_signups').update({status:'unsubscribed',unsubscribed_at:new Date().toISOString()}).eq('id',row.id);
        await admin.from('tda_newsletter_sends').update({status:'stopped'}).eq('id',claim.id);continue;
      }
      const unsub=`https://riderhub.redcherryevents.co.za/tda-newsletter-unsubscribe?token=${row.unsubscribe_token}`;
      const html=await renderTdaNewsletter({number:row.next_email,name:row.name,counts:c,unsubscribeUrl:unsub});
      const delivery=await sendIndividualNewsletter(row.email,row.name??'',newsletterSubject(row.next_email,c),html,`${row.id}:${row.generation}:${row.next_email}`,async(listId,messageId)=>{
        const {error}=await admin.from('tda_newsletter_sends').update({provider_list_id:listId,provider_email_id:messageId}).eq('id',claim.id);
        if(error) throw Error('Could not save prepared delivery. No send attempted.');
      },async()=>{
        const {data:latest}=await admin.from('tda_newsletter_signups').select('status,generation').eq('id',row.id).single();
        return latest?.status==='active'&&latest.generation===row.generation&&!(await hasTdaEntry(admin,row.email))&&!seriesStopped(await newsletterCounts(admin));
      });
      const {error:saveError}=await admin.from('tda_newsletter_sends').update({status:'accepted',provider_email_id:delivery.messageId}).eq('id',claim.id);
      if(saveError) throw Error('Everlytic accepted delivery but progress could not be saved');
      const {error:progressError}=await admin.from('tda_newsletter_signups').update({next_email:row.next_email+1,status:row.next_email===4?'finished':'active',everlytic_error:null}).eq('id',row.id).eq('generation',row.generation).eq('status','active');
      if(progressError) throw Error('Everlytic accepted delivery but subscriber progress could not be saved');
      sent++;
    } catch(e) {
      const message=(e as Error).message.slice(0,1800);
      if(claimId) await admin.from('tda_newsletter_sends').update({status:'uncertain',error:message}).eq('id',claimId).eq('status','claimed');
      await admin.from('tda_newsletter_signups').update({everlytic_error:message}).eq('id',row.id);
    }
  }
  return {sent,disabled:!config?.enabled};
}