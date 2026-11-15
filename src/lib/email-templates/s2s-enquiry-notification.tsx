import * as React from 'react';
import { Heading, Text } from '@react-email/components';
import { EmailShell, h1, text } from './theme';
import type { TemplateEntry } from './registry';

interface Props { name?: string; email?: string; phone?: string; ride?: string; team_size?: string; message?: string; consent?: boolean }
const Email = ({ name, email, phone, ride, team_size, message, consent }: Props) => (
  <EmailShell preview={`New JBFE Sea to Sea enquiry from ${name}`} siteName="JBFE Sea to Sea">
    <Heading style={h1}>New website enquiry</Heading>
    <Text style={text}>Reply to this email to answer {name} directly.</Text>
    <Text style={text}>Name: {name}<br />Email: {email}<br />Phone: {phone || 'Not given'}<br />Ride: {ride}<br />Team size: {team_size || 'Not given'}<br />News opt-in: {consent ? 'Yes' : 'No'}</Text>
    <Text style={{ ...text, whiteSpace: 'pre-wrap' }}>{message}</Text>
  </EmailShell>
);
export const template = { component: Email, subject: (d: Record<string, any>) => `JBFE Sea to Sea enquiry: ${d.ride} · ${d.name}`, displayName: 'JBFE Sea to Sea website enquiry (team)', to: 'team@redcherryevents.co.za' } satisfies TemplateEntry;