import type { APIRoute } from "astro";
import {
	buildEventSourceUrl,
	isCapiConfigured,
	readCapiRequestContext,
	sendCapiEvent,
} from "../../../lib/server/meta-capi";
import { trackBeaconSchema } from "../../../lib/track/schema";

export const prerender = false;

/**
 * First-party tracking beacon → Meta Conversions API (top-of-funnel reinforce).
 *
 * Receives PageView / ViewContent / Contact from the browser and fires the
 * matching CAPI event, deduplicated against the browser Pixel by a shared
 * `eventId`. Being first-party + same-origin, it survives ad-blockers that
 * would block connect.facebook.net / facebook.com/tr.
 *
 * Hybrid opt-out policy: this endpoint fires regardless of the cookie banner
 * decision (rejecting marketing cookies only revokes the *browser* Pixel). It
 * NEVER receives PII — only the event name, a dedupe id, and the landing path.
 * Inert unless CAPI is configured.
 */

/** Soft same-site guard: blocks obvious cross-site abuse without breaking beacons. */
function isSameSiteRequest(request: Request): boolean {
	const site = request.headers.get("sec-fetch-site");
	if (site) return site === "same-origin" || site === "same-site";
	const origin = request.headers.get("origin");
	if (!origin) return true; // some UAs omit Origin on beacons — don't hard-fail
	try {
		return new URL(origin).origin === new URL(request.url).origin;
	} catch {
		return false;
	}
}

export const POST: APIRoute = async ({ request }) => {
	if (!isSameSiteRequest(request)) {
		return Response.json({ error: "forbidden" }, { status: 403 });
	}

	// sendBeacon defaults to text/plain; parse the raw body instead of gating on
	// Content-Type so both sendBeacon and keepalive fetch reach us.
	const raw = await request.text();
	let body: unknown = null;
	try {
		body = JSON.parse(raw);
	} catch {
		body = null;
	}

	const parsed = trackBeaconSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json({ error: "invalid_payload" }, { status: 400 });
	}

	if (!isCapiConfigured()) {
		return Response.json({
			ok: true,
			capi: { status: "skipped", reason: "not_configured" },
		});
	}

	const capiContext = readCapiRequestContext(request);
	const capi = await sendCapiEvent({
		eventName: parsed.data.event,
		eventId: parsed.data.eventId,
		eventSourceUrl: buildEventSourceUrl(request, parsed.data.landingPath),
		fbclid: parsed.data.fbclid,
		...capiContext,
	});

	return Response.json({ ok: true, capi });
};
