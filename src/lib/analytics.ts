/**
 * Tracking helper for Raio-X / Neon Dash.
 *
 * Multiplexes a single `track()` call across:
 *   - Plausible custom events (window.plausible)
 *   - Vercel Analytics (window.va custom events via `va("event", { name, ...props })`)
 *   - dataLayer push (GTM-style fallback)
 *
 * IMPORTANT — privacy contract: NEVER pass PII (name, whatsapp, email,
 * instagram, cityState) in event props. Only opaque IDs (sessionId, stepId,
 * answerId), enums (intent, segment), and numeric scores. This is enforced by
 * code review — there is no runtime scrubber.
 */

import { isWhatsAppDestination } from "./whatsapp";

export type TrackProps = Record<string, string | number | boolean | undefined>;

type PlausibleFn = (
	eventName: string,
	options?: { props?: TrackProps; callback?: () => void },
) => void;

type DataLayerEntry = { event: string } & TrackProps;

type FbqFn = (...args: unknown[]) => void;

declare global {
	interface Window {
		plausible?: PlausibleFn;
		dataLayer?: DataLayerEntry[];
		fbq?: FbqFn;
		/** Set true by the Meta Pixel bootstrap only after consent + fbevents.js load. */
		__fbReady?: boolean;
	}
}

/**
 * Maps internal event names to Meta Standard Events. Unmapped events fall back
 * to `trackCustom` with the original name. `click_whatsapp_*` is matched by
 * prefix (dynamic location suffix). No PII reaches Meta — see toMetaProps.
 */
const META_EVENT_MAP: Record<string, string> = {
	quiz_started: "ViewContent",
	lead_partial_captured: "Lead",
	quiz_completed: "CompleteRegistration",
};

function metaStandardEvent(eventName: string): string | undefined {
	if (eventName.startsWith("click_whatsapp")) return "Contact";
	return META_EVENT_MAP[eventName];
}

// Only opaque enums / numerics ever forwarded to Meta (no sessionId, no PII).
const META_SAFE_KEYS = new Set([
	"value",
	"currency",
	"intent",
	"segment",
	"score",
	"location",
	"label",
]);

function toMetaProps(props?: TrackProps): TrackProps | undefined {
	if (!props) return undefined;
	const out: TrackProps = {};
	for (const [k, v] of Object.entries(props)) {
		if (META_SAFE_KEYS.has(k) && v !== undefined) out[k] = v;
	}
	return Object.keys(out).length ? out : undefined;
}

const seen = new Set<string>();

export function track(eventName: string, props?: TrackProps): void {
	if (typeof window === "undefined") return;

	try {
		window.plausible?.(eventName, props ? { props } : undefined);
	} catch {
		/* noop */
	}

	try {
		// Vercel Analytics custom event signature: va("event", { name, ...props })
		const va = (window as unknown as { va?: (...args: unknown[]) => void }).va;
		va?.("event", { name: eventName, ...props });
	} catch {
		/* noop */
	}

	try {
		if (!window.dataLayer) window.dataLayer = [];
		window.dataLayer.push({ event: eventName, ...props });
	} catch {
		/* noop */
	}

	try {
		// Meta Pixel — gated: __fbReady is only true after marketing consent +
		// fbevents.js load (Layout.astro bootstrap). No-op until then.
		if (window.__fbReady && typeof window.fbq === "function") {
			const std = metaStandardEvent(eventName);
			const fbProps = toMetaProps(props);
			if (std) window.fbq("track", std, fbProps);
			else window.fbq("trackCustom", eventName, fbProps);
		}
	} catch {
		/* noop */
	}
}

export function trackOnce(
	key: string,
	eventName: string,
	props?: TrackProps,
): void {
	if (seen.has(key)) return;
	seen.add(key);
	track(eventName, props);
}

export function attachCtaClickListener(): void {
	if (typeof window === "undefined") return;
	document.addEventListener(
		"click",
		(event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const cta = target.closest<HTMLElement>("[data-cta-location]");
			if (!cta) return;
			const location = cta.dataset.ctaLocation ?? "unknown";
			const label =
				cta.dataset.ctaLabel ??
				cta.getAttribute("aria-label") ??
				cta.textContent?.trim().slice(0, 60) ??
				"";
			const href =
				cta.getAttribute("href") ??
				cta.closest("a")?.getAttribute("href") ??
				"";
			const eventName =
				href && isWhatsAppDestination(href)
					? `click_whatsapp_${location}`
					: `click_cta_${location}`;
			track(eventName, { location, label });
		},
		{ passive: true },
	);
}
