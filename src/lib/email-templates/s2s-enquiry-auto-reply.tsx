import * as React from 'react';
import { Heading, Link, Text } from '@react-email/components';
import { EmailShell, h1, text } from './theme';
import type { TemplateEntry } from './registry';

const Email = ({ name = '' }: { name?: string }) => (
  <EmailShell preview="We've got your message and one of the team will reply." siteName="JBFE Sea to Sea">
    <Heading style={h1}>Thanks{ name.trim() ? `, ${name.trim().split(/\s+/)[0]}` : ''}.</Heading>
    <Text style={text}>We've got your message. One of the team will reply, usually within one working day.</Text>
    <Text style={text}>JBFE Sea to Sea is a 3-day navigational team enduro. South 2027 runs 7–11 May 2027 from Trennerys Hotel (Seagulls) and Kob Inn. <Link href="https://entries.redcherryevents.co.za/events/84861">South entries are open here</Link>.</Text>
    <Text style={text}>North dates are still to be confirmed. If you ticked the news box for North, we'll let you know when entries open.</Text>
    <Text style={text}>The Red Cherry Events team</Text>
  </EmailShell>
);
export const template = { component: Email, subject: 'Thanks for your JBFE Sea to Sea enquiry', displayName: 'JBFE Sea to Sea website enquiry (reply)' } satisfies TemplateEntry;