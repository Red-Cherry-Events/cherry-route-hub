import { everlyticRequest } from './everlytic.server';

export function newsletterContactState(payload:any,email:string) {
  const contacts=(payload.collection??[]).map((r:any)=>r.data??r).filter((r:any)=>String(r.email).trim().toLowerCase()===email.trim().toLowerCase());
  if(!contacts.length) return 'missing';
  if(contacts.some((c:any)=>['unsubscribed','off'].includes(c.email_status)||c.status==='off')) return 'unsubscribed';
  return contacts.some((c:any)=>c.status==='on'&&['none','on','subscribed','confirmed'].includes(c.email_status??''))?'active':'suppressed';
}

export function transactionalRequest(email:string,name:string,subject:string,html:string,key:string) {
  return { headers: { to: { [email]: name || email }, from: { 'Team@redcherryevents.co.za': 'M&G Investments Tour de Addo' }, reply_to: { 'team@redcherryevents.co.za': 'Red Cherry Events' }, subject, 'trans-group-name': 'Tour de Addo newsletter', 'trans-series-key': key }, body: { html }, attachments: [], options: { track_opens: 'yes', track_links: 'yes', batch_send: 'no' } };
}
export function transactionId(payload:any):string {
  const item=payload?.item?.data??payload?.item??payload;
  const id=item?.transaction_id??payload?.transaction_id;
  if(typeof id!=='string'||!id.trim()) throw Error(`Everlytic did not confirm individual delivery: ${JSON.stringify(payload).slice(0,1500)}`);
  return id;
}
export function isolatedListVerified(payload:any,listId:string,contactId:string) {
  const rows=(payload.collection??[]).map((r:any)=>r.data??r);
  return rows.length===1&&String(rows[0].list_id)===listId&&String(rows[0].contact_id)===contactId&&rows[0].email_status==='subscribed';
}
function recordId(payload:any) {
  const id=payload.item?.id??payload.id;
  if(!/^\d+$/.test(String(id))) throw Error(`Everlytic record was not confirmed: ${JSON.stringify(payload).slice(0,1500)}`);
  return String(id);
}
export function campaignAccepted(payload:any,messageId:string,listId:string) {
  const d=payload.item?.data??payload.item;
  return String(d?.id)===messageId&&String(d?.list_ids)===listId&&['pre-queue','queued','sending','sent'].includes(d?.status);
}
export async function sendIndividualNewsletter(email:string,name:string,subject:string,html:string,key:string,onPrepared?:(listId:string,messageId:string)=>Promise<void>,canSend?:()=>Promise<boolean>) {
  const u=process.env['EVERLYTIC_USERNAME'],k=process.env['EVERLYTIC_API_KEY'];
  if(!u||!k) throw Error('Everlytic is not connected');
  // This account returns 401 / 10001 Access Denied for trans_mails.
  // A new, private, one-contact list is used for each send, never a master list.
  const request=(path:string,method:'GET'|'POST',body?:unknown)=>everlyticRequest(path,method,u,k,body);
  const raw=await request(`/api/2.0/contacts?filters[email]=${encodeURIComponent(email)}&count=25`,'GET');
  if(newsletterContactState(raw,email)!=='active') throw Error('Everlytic recipient is not subscribed');
  const contact=(raw.collection??[]).map((r:any)=>r.data??r).find((c:any)=>String(c.email).trim().toLowerCase()===email.trim().toLowerCase()&&c.status==='on'&&['none','on','subscribed','confirmed'].includes(c.email_status));
  if(!contact?.id) throw Error('Could not verify the recipient');
  const listId=recordId(await request('/api/2.0/lists','POST',{name:`TDA isolated ${key}`,owner_email:'Team@redcherryevents.co.za',owner_reply_email:'team@redcherryevents.co.za',is_public:'no',notify_owner_on_list_subscribe:'no',notify_owner_on_list_unsubscribe:'no',send_unsubscribe_confirmation:'no'}));
  const empty=await request(`/api/2.0/list_subscriptions/${listId}?count=2`,'GET');
  if(!Array.isArray(empty.collection)||empty.collection.length!==0) throw Error('New Everlytic list is not empty. No send attempted.');
  await request(`/api/2.0/list_subscriptions/${listId}`,'POST',{contact_id:contact.id,email_status:'subscribed'});
  const verifyList=async()=>{
    const members=await request(`/api/2.0/list_subscriptions/${listId}?count=2`,'GET');
    if(!isolatedListVerified(members,listId,String(contact.id))) throw Error('Everlytic list does not contain exactly the intended recipient. No send attempted.');
  };
  await verifyList();
  const messageId=recordId(await request('/api/2.0/emails','POST',{campaign_name:`TDA newsletter ${key}`,subject,from_email:'Team@redcherryevents.co.za',from_name:'M&G Investments Tour de Addo',reply_email:'team@redcherryevents.co.za',html_original:html,list_ids:listId,insert_unsubscribe_link:'yes'}));
  await onPrepared?.(listId,messageId);
  const draft=await request(`/api/2.0/emails/${messageId}`,'GET');
  const data=draft.item?.data??draft.item;
  const audience=Array.isArray(data?.list_ids)?data.list_ids.map(String):String(data?.list_ids??'').split(',').map((s:string)=>s.trim());
  if(audience.length!==1||audience[0]!==listId||data?.status!=='composing') throw Error('Everlytic campaign audience or state did not match. No send attempted.');
  await verifyList();
  if(canSend&&!(await canSend())) throw Error('Subscriber stopped before dispatch. No send attempted.');
  const current=await request(`/api/2.0/contacts?filters[email]=${encodeURIComponent(email)}&count=25`,'GET');
  if(newsletterContactState(current,email)!=='active') throw Error('Recipient opted out before dispatch. No send attempted.');
  const accepted=await request(`/api/2.0/email_actions/send/${messageId}`,'POST');
  if(!campaignAccepted(accepted,messageId,listId)) {
    const readback=await request(`/api/2.0/emails/${messageId}`,'GET');
    if(!campaignAccepted(readback,messageId,listId)) throw Error(`Everlytic did not confirm campaign send: ${JSON.stringify({id:readback.item?.id,status:readback.item?.status,list_ids:readback.item?.list_ids})}`);
  }
  return { messageId, listId, method:'isolated one-contact campaign' };
}