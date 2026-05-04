/**
 * Tracking helper for Raio-X / Neon Dash.
 *
 * Multiplexes a single `track()` call across:
 *   - Plausible custom events (window.plausible)
 *   - Vercel Analytics (window.va custom events via `va("event", { name, ...props })`)
 *   - dataLayer push (GTM-style fallback)
 *
 * IMPORTANT — privacy contract: NEVER pass PII (name, whatsapp, email,
 * clinicName, cityState) in event props. Only opaque IDs (sessionId, stepId,
 * answerId), enums (intent, segment), and numeric scores. This is enforced by
 * code review — there is no runtime scrubber.
 */

export type TrackProps = Record<string, string | number | boolean | undefined>;

type PlausibleFn = (
	eventName: string,
	options?: { props?: TrackProps; callback?: () => void },
) => void;

type DataLayerEntry = { event: string } & TrackProps;

declare global {
	interface Window {
		plausible?: PlausibleFn;
		dataLayer?: DataLayerEntry[];
	}
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
			track("quiz_cta_clicked", { location, label });
		},
		{ passive: true },
	);
}
