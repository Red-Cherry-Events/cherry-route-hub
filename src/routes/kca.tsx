import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, ExternalLink, Heart } from "lucide-react";
import kcaLogo from "@/assets/kca-logo.png.asset.json";
import discoveryLogo from "@/assets/discovery-logo.jpg.asset.json";
import { PageHeader } from "@/components/ui-bits";
import {
  RaisedProgress,
  SLSC_GRADIENT,
  SLSC_PINK,
  SUN_YELLOW,
  formatRand,
  isSabrinaLoveEvent,
} from "@/components/slsc-kca-card";
import { KCA_URL, kcaDonateUrl } from "@/lib/sabrina-love";
import { useAdminStore } from "@/lib/store";
import { useHydratedStore } from "@/lib/use-hydrated-store";
import { formatDate } from "@/lib/mock-data";
import { ogImageMeta, appOgImageUrl, OG_SITE } from "@/lib/og";

const TITLE = "Give once, make twice the difference — Sabrina Love Summer Challenge";
const DESCRIPTION =
  "Keep A Child Alive (KCA) matches every Sabrina Love Summer Challenge entry and every donation, rand for rand. Let's raise a million.";

export const Route = createFileRoute("/kca")({
  head: () => ({
    meta: [
      ...ogImageMeta(
        appOgImageUrl(
          "Give once, make twice the difference",
          "KCA matches every entry and donation",
        ),
        "KCA match funding",
      ),
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${OG_SITE}/kca` },
    ],
    links: [{ rel: "canonical", href: `${OG_SITE}/kca` }],
  }),
  component: KcaMatchPage,
});

const STEPS = [
  {
    title: "Enter or donate",
    body: "Enter any Summer Challenge event, add a donation to your entry, or give on GivenGain.",
  },
  {
    title: "KCA matches it",
    body: "Keep A Child Alive matches every entry and every donation, rand for rand.",
  },
  {
    title: "Twice the difference",
    body: "Your support goes twice as far for children with disabilities and their families in Plettenberg Bay and the Bitou region.",
  },
];

function KcaMatchPage() {
  useHydratedStore();
  const campaign = useAdminStore((s) => s.settings.kcaCampaign);
  const events = useAdminStore((s) => s.events);
  const donateUrl = kcaDonateUrl(campaign.donateUrl);
  const hasRaisedFigure = campaign.raised !== null && Number.isFinite(campaign.raised);

  const challengeEvents = events
    .filter(
      (e) =>
        isSabrinaLoveEvent(e.name) &&
        e.lifecycle !== "draft" &&
        e.lifecycle !== "archived" &&
        !e.isReviewEvent,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const titleSponsorLogo =
    challengeEvents.find((e) => e.titleSponsorLogoUrl)?.titleSponsorLogoUrl || discoveryLogo.url;

  return (
    <div data-section="kca_page">
      <PageHeader title="KCA match funding" subtitle="Sabrina Love Summer Challenge" />

      <div className="space-y-5 px-5 py-5">
        {/* Hero */}
        <section
          className="overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-md sm:p-6"
          style={{ background: SLSC_GRADIENT }}
        >
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground/90 sm:text-[11px]">
            <span
              className="h-2 w-2 shrink-0 animate-pulse rounded-full motion-reduce:animate-none"
              style={{ backgroundColor: SUN_YELLOW }}
            />
            Sabrina Love Summer Challenge · 27–30 Dec 2026
          </p>
          <h2 className="mt-3 font-display text-3xl font-black leading-[1.1] tracking-tight text-primary-foreground sm:text-4xl">
            Give once. Make <span style={{ color: SUN_YELLOW }}>twice</span> the difference.
          </h2>
          <p
            className="mt-2 text-2xl leading-tight text-primary-foreground"
            style={{
              fontFamily: '"Segoe Print", "Bradley Hand", cursive',
              transform: "rotate(-1deg)",
            }}
          >
            Let's raise a million!
          </p>
          <p
            className="mt-4 flex items-start gap-2 text-base font-bold leading-snug"
            style={{ color: SUN_YELLOW }}
          >
            <Heart className="mt-1 h-4 w-4 shrink-0 fill-current" aria-hidden="true" />
            <span>R1 = R2 · Every rand you give is doubled for the children.</span>
          </p>

          {hasRaisedFigure ? (
            <RaisedProgress
              raised={campaign.raised!}
              goal={campaign.goal}
              updated={campaign.updated}
            />
          ) : (
            <div className="mt-5 flex items-end justify-between gap-4 border-y border-primary-foreground/25 py-3">
              <p className="pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-foreground/80">
                Our shared goal
              </p>
              <p className="font-display text-2xl font-black text-primary-foreground">
                {formatRand(campaign.goal)}
              </p>
            </div>
          )}

          <a
            href={donateUrl}
            target="_blank"
            rel="noreferrer"
            data-track-action="kca_page_donate_opened"
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-foreground px-4 py-3 text-center text-base font-black transition-transform active:scale-[0.98]"
            style={{ color: SLSC_PINK }}
          >
            Donate on GivenGain <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
          </a>
          <p className="mt-2 text-center text-[11px] font-medium text-primary-foreground/85">
            Donations go to the Sabrina Love Foundation through GivenGain.
          </p>
        </section>

        {/* How it works */}
        <section className="rounded-2xl bg-card p-5 ring-1 ring-border">
          <h2 className="font-display text-lg font-bold text-ink">How the match works</h2>
          <ol className="mt-4 space-y-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-sm font-black text-primary-foreground"
                  style={{ backgroundColor: SLSC_PINK }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Events */}
        {challengeEvents.length > 0 ? (
          <section>
            <h2 className="px-1 font-display text-lg font-bold text-ink">
              Enter a Summer Challenge event
            </h2>
            <p className="px-1 text-xs text-ink-soft">
              Every entry is matched too, so entering counts as giving.
            </p>
            <ul className="mt-3 space-y-3">
              {challengeEvents.map((e) => (
                <li key={e.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                  <Link
                    to="/my-events/$eventId"
                    params={{ eventId: e.id }}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display font-bold text-ink">{e.name}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {e.datesTbc ? "Dates to be confirmed" : formatDate(e.date)} · {e.discipline}
                      </p>
                    </div>
                    <ChevronRight
                      className="h-5 w-5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                  {e.entryUrl ? (
                    <a
                      href={e.entryUrl}
                      target="_blank"
                      rel="noreferrer"
                      data-track-action="kca_page_entry_opened"
                      className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-primary-foreground transition-transform active:scale-[0.98]"
                      style={{ backgroundColor: SLSC_PINK }}
                    >
                      Enter &amp; add a donation{" "}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Partners: title sponsor and match partner kept as separate tiles */}
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-card p-4 text-center ring-1 ring-border">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
              Summer Challenge brought to you by
            </p>
            <div className="mt-2 flex h-14 items-center justify-center">
              <img
                src={titleSponsorLogo}
                alt="Discovery Vitality"
                className="h-14 w-full object-contain"
                loading="lazy"
              />
            </div>
          </div>
          <div className="rounded-2xl bg-card p-4 text-center ring-1 ring-border">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
              Every entry &amp; donation matched by
            </p>
            <div className="mt-2 flex h-14 items-center justify-center">
              <img
                src={kcaLogo.url}
                alt="Keep a Child Alive"
                className="h-14 w-full object-contain"
                loading="lazy"
              />
            </div>
            <a
              href={KCA_URL}
              target="_blank"
              rel="noreferrer"
              data-track-action="kca_link_opened"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink underline underline-offset-4"
            >
              About KCA <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>
      <div className="pb-6" />
    </div>
  );
}
