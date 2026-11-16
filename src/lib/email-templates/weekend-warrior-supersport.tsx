// Marketing creative for Everlytic only. Never register with Lovable app emails.
import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text } from '@react-email/components'
import { WarriorPartners, ww } from './weekend-warrior-brand'
import hero from '@/assets/ww-email/ww_cadence_supersport_1080x1350.jpg.asset.json'

export const SUPERSPORT_SUBJECT = 'Catch Weekend Warrior on SuperSport tonight 📺'
export const SUPERSPORT_SUBJECT_ALTERNATES = ['You might be on TV tonight 👀', 'Lourensford hits SuperSport tonight'] as const
export const SUPERSPORT_PREHEADER = 'Toyota Cadence, 7pm on Channel 206. Plus your 2027 dates.'
export const SUPERSPORT_HERO_URL = new URL(hero.url, 'https://riderhub.redcherryevents.co.za').href
export const SUPERSPORT_HERO_ALT = 'Catch us on SuperSport: Tomorrow, 7pm, Channel 206'
// The app's own Otto1890 Weekend Warrior 2027 entry-alert sign-up page.
export const SUPERSPORT_REMINDER_URL = 'https://riderhub.redcherryevents.co.za/otto1890-signup'
const archival = '#FBFAF2'

export function WeekendWarriorSuperSport({ greetingName = '{{contact.contact_name|default("there")}}' }: { greetingName?: string }) {
  return <Html lang="en" dir="ltr"><Head /><Preview>{SUPERSPORT_PREHEADER}</Preview>
    <Body style={ww.body}><Container style={ww.container}>
      <Section style={{ backgroundColor: ww.forest, padding: '22px 24px' }}>
        <Text style={{ ...ww.label, color: ww.teal }}>RED CHERRY EVENTS · ON SUPERSPORT</Text>
        <Heading style={{ ...ww.heading, color: ww.white, margin: '0', fontSize: '30px' }}>Otto1890<br />Weekend Warrior</Heading>
      </Section>
      <Section style={{ padding: '24px 24px 16px' }}>
        <Text style={{ ...ww.text, color: ww.red, fontWeight: 700, margin: '0' }}>Hi {greetingName},</Text>
      </Section>
      <Img src={SUPERSPORT_HERO_URL} alt={SUPERSPORT_HERO_ALT} width="600" style={{ width: '100%', height: 'auto', display: 'block' }} />
      <Section style={ww.inner}>
        <Text style={ww.text}>Lourensford is going national. The Otto1890 Weekend Warrior Lourensford feature airs on SuperSport’s Toyota Cadence tonight: two days of racing, 690 riders and a race village full of good vibes. Keep your eyes peeled, because you might just spot yourself on TV.</Text>
        <Section style={{ backgroundColor: archival, borderLeft: `4px solid ${ww.red}`, padding: '16px 20px', margin: '4px 0 26px' }}>
          <Text style={{ ...ww.text, fontWeight: 700, color: ww.forest, margin: '0 0 6px' }}>📺 Tonight, Tuesday 17 November · 7pm</Text>
          <Text style={{ ...ww.text, fontWeight: 700, color: ww.forest, margin: '0' }}>📡 SuperSport Channel 206 · Toyota Cadence</Text>
        </Section>
        <Heading as="h2" style={{ ...ww.heading, fontSize: '24px' }}>Lock in 2027</Heading>
        <Section style={{ borderTop: `1px solid ${ww.line}`, padding: '16px 0' }}>
          <Text style={{ ...ww.label, margin: '0 0 5px' }}>GRABOUW · 2–4 APRIL 2027</Text>
          <Text style={{ ...ww.text, margin: '0' }}><strong>Oak Valley Estate.</strong> It’s the last weekend of the school holidays, so bring the whole family. Entries open 1 December 2026.</Text>
        </Section>
        <Section style={{ borderTop: `1px solid ${ww.line}`, borderBottom: `1px solid ${ww.line}`, padding: '16px 0', marginBottom: '24px' }}>
          <Text style={{ ...ww.label, margin: '0 0 5px' }}>LOURENSFORD · 8–10 OCTOBER 2027</Text>
          <Text style={{ ...ww.text, margin: '0' }}><strong>Lourensford Wine Estate.</strong></Text>
        </Section>
        <Section style={{ margin: '0 0 24px' }}>
          <Button href={SUPERSPORT_REMINDER_URL} style={{ ...ww.button, display: 'block', textAlign: 'center' }}>Set my entry reminder</Button>
        </Section>
        <Text style={{ ...ww.text, margin: '0 0 6px' }}>See you on the trails,<br />the Otto1890 Weekend Warrior team</Text>
      </Section>
      <WarriorPartners signOff={null} />
    </Container></Body>
  </Html>
}
