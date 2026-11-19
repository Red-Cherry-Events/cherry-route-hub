import type { TemplateEntry } from './registry'
import { welcomeHtml } from './entry-interest-confirmation-html'

// The registered HTML bypasses React rendering in sending and both previews.
const Email = () => null

export const template = {
  component: Email,
  html: welcomeHtml,
  subject: "You're on the Weekend Warrior list",
  displayName: 'Otto1890 Weekend Warrior 2027 sign-up confirmation',
  previewData: {},
} satisfies TemplateEntry
