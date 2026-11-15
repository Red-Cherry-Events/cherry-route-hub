import { everlyticRequest } from './everlytic.server';

export function transactionalRequest(email:string,name:string,subject:string,html:string,key:string) {
  return { headers: { to: { [email]: name || email }, from: { 'Team@redcherryevents.co.za': 'M&G Investments Tour de Addo' }, reply_to: { 'team@redcherryevents.co.za': 'Red Cherry Events' }, subject, 'trans-group-name': 'Tour de Addo newsletter', 'trans-series-key': key }, body: { html }, attachments: [], options: { track_opens: 'yes', track_links: 'yes', batch_send: 'no' } };
}
export function transactionId(payload:any):string {
  const item=payload?.item?.data??payload?.item??payload;
  const id=item?.transaction_id??payload?.transaction_id;
  if(typeof id!=='string'||!id.trim()) throw Error(`Everlytic did not confirm individual delivery: ${JSON.stringify(payload).slice(0,1500)}`);
  return id;
}
export async function sendIndividualNewsletter(email:string,name:string,subject:string,html:string,key:string) {
  const u=process.env['EVERLYTIC_USERNAME'],k=process.env['EVERLYTIC_API_KEY'];
  if(!u||!k) throw Error('Everlytic is not connected');
  const result=await everlyticRequest('/api/2.0/trans_mails','POST',u,k,transactionalRequest(email,name,subject,html,key));
  return { messageId: transactionId(result), method:'trans_mails' };
}