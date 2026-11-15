import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { manageTdaNewsletter } from '@/lib/tda-newsletter.functions';

export const Route=createFileRoute('/admin/tda-newsletter')({head:()=>({meta:[{title:'Tour de Addo newsletter · Red Cherry Events Admin'},{name:'description',content:'Review Tour de Addo newsletter emails and subscriber progress.'},{property:'og:title',content:'Tour de Addo newsletter · Admin'},{property:'og:description',content:'Tour de Addo newsletter review and consent controls.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex,nofollow'}]}),component:NewsletterAdmin});
function NewsletterAdmin(){
  const manage=useServerFn(manageTdaNewsletter),qc=useQueryClient();
  const [number,setNumber]=useState(1),[busy,setBusy]=useState(false);
  const q=useQuery({queryKey:['tda-newsletter'],queryFn:()=>manage({data:{action:'list'}})});
  const preview=useQuery({queryKey:['tda-newsletter-preview',number],queryFn:()=>manage({data:{action:'preview',number}})});
  const info=q.data&&'rows' in q.data?q.data:null;
  const html=preview.data&&'html' in preview.data?preview.data.html:'';
  const subject=preview.data&&'subject' in preview.data?preview.data.subject:'';
  const perform=async(action:'toggle'|'test'|'retry',id?:string)=>{setBusy(true);try{const result=await manage({data:{action,number,enabled:!info?.config.enabled,id}});toast.success(action==='test'?'Everlytic accepted your admin preview.':action==='retry'&&'ok' in result&&!result.ok?'Sync is still pending.':'Saved.');await qc.invalidateQueries({queryKey:['tda-newsletter']});}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}};
  return <div className="space-y-6 min-w-0"><div className="flex flex-wrap items-center justify-between gap-4"><h1 className="font-display text-2xl font-bold">Tour de Addo newsletter</h1><label className="flex items-center gap-3 text-sm font-semibold">Series {info?.config.enabled?'ON':'OFF'}<Switch aria-label="Newsletter series" checked={info?.config.enabled??false} disabled={busy||!info?.config.delivery_verified} onCheckedChange={()=>perform('toggle')}/></label></div>
    {!info?.config.delivery_verified&&<p className="text-sm text-ink-soft">Series off. Everlytic delivery verification is required before it can be enabled.</p>}
    {q.error&&<p className="text-destructive">{(q.error as Error).message}</p>}
    <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-1" role="tablist" aria-label="Newsletter emails">{[1,2,3,4].map(n=><Button key={n} role="tab" aria-selected={number===n} variant={number===n?'default':'outline'} onClick={()=>setNumber(n)}>Email {n}</Button>)}</div><Button variant="outline" disabled={busy||!html} onClick={()=>perform('test')}><Mail/>Send me a test</Button></div><h2 className="font-semibold">{subject||'Loading email…'}</h2>{preview.error?<p className="text-destructive">{(preview.error as Error).message}</p>:<iframe title={`Email ${number} preview`} sandbox="" srcDoc={html} className="h-[900px] w-full max-w-[660px] border border-border rounded-md bg-card"/>}</section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Newsletter sign-ups · {info?.rows.length??0}</h2><p className="text-xs text-ink-soft">Entry Ninja refresh: 06:00, 10:00, 14:00 and 18:00 UTC. Entry matching uses email, not names.</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border"><th className="p-2">Person</th><th className="p-2">Status</th><th className="p-2">Email</th><th className="p-2">Consent</th><th className="p-2">Everlytic</th></tr></thead><tbody>{info?.rows.map(r=><tr key={r.id} className="border-b border-border"><td className="p-2"><span className="font-semibold">{r.name||'No name'}</span><br/>{r.email}</td><td className="p-2">{r.status}</td><td className="p-2">{r.next_email===5?'4 sent':r.series_started_at?`${r.next_email} next`:'1, waiting for switch'}</td><td className="p-2 whitespace-nowrap">{new Date(r.consent_at).toLocaleDateString('en-ZA')}</td><td className="p-2">{r.everlytic_synced?'Synced':<Button size="sm" variant="outline" disabled={busy} onClick={()=>perform('retry',r.id)}><RefreshCw/>Retry sync</Button>}{r.everlytic_error&&<p className="text-xs text-destructive max-w-48">{r.everlytic_error}</p>}</td></tr>)}</tbody></table></div>{info?.rows.length===0&&<p className="text-sm text-ink-soft">No newsletter sign-ups yet.</p>}</section></div>;
}