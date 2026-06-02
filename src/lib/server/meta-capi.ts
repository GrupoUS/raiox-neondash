/**
 * Meta Conversions API (server-side) — ad-blocker-proof conversion tracking.
 *
 * Sends conversion events (Lead, CompleteRegistration) server→server to the
 * Meta Graph API, so browser ad-blockers (which block connect.facebook.net and
 * facebook.com/tr) never interfere. Deduplicated against the browser Pixel via a
 * shared `event_id` + matching `event_name`.
 *
 * PII contract: customer data (email, phone, name) is SHA-256 hashed before it
 * leaves the server, per Meta's CAPI requirements. Only sent for leads who
 * already gave explicit contact consent (the quiz requires consentGiven=true).
 *
 * Inert unless META_CAPI_TOKEN + PUBLIC_FB_PIXEL_ID are set.
 */

import { createHash } from "node:crypto";
import type { StoredLead } from "../leads/schema";
import { getServerEnv } from "./env";

const DEFAULT_GRAPH_VERSION = "v21.0";

export type CapiResult =
	| { status: "skipped"; reason?: string }
	| { status: "sent" }
	| { status: "failed"; reason: string };

export type CapiEventName = "Lead" | "CompleteRegistration";

function sha256(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

function hashEmail(email: string | undefined): string | undefined {
	if (!email) return undefined;
	const normalized = email.trim().toLowerCase();
	return normalized ? sha256(normalized) : undefined;
}

function hashPhone(phone: string | undefined): string | undefined {
	if (!phone) return undefined;
	// Meta wants digits only, including country code, no "+".
	const digits = phone.replace(/\D/g, "");
	return digits ? sha256(digits) : undefined;
}

function hashName(name: string | undefined): {
	fn?: string;
	ln?: string;
} {
	if (!name) return {};
	const parts = name.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return {};
	const fn = sha256(parts[0]);
	const ln = parts.length > 1 ? sha256(parts[parts.length - 1]) : undefined;
	return { fn, ln };
}

export function isCapiConfigured(): boolean {
	return Boolean(
		getServerEnv("META_CAPI_TOKEN") && getServerEnv("PUBLIC_FB_PIXEL_ID"),
	);
}

/** Pulls IP / user-agent / Meta browser cookies (_fbp, _fbc) for match quality. */
export function readCapiRequestContext(request: Request): {
	clientIp?: string;
	clientUserAgent?: string;
	fbp?: string;
	fbc?: string;
} {
	const headers = request.headers;
	const forwardedFor = headers.get("x-forwarded-for") ?? "";
	const clientIp = forwardedFor.split(",")[0]?.trim() || undefined;
	const clientUserAgent = headers.get("user-agent") ?? undefined;
	const cookieHeader = headers.get("cookie") ?? "";
	const readCookie = (name: string): string | undefined => {
		const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
		return match ? decodeURIComponent(match[1]) : undefined;
	};
	return {
		clientIp,
		clientUserAgent,
		fbp: readCookie("_fbp"),
		fbc: readCookie("_fbc"),
	};
}

export type CapiEventInput = {
	eventName: CapiEventName;
	eventId?: string;
	eventTime?: number;
	lead: StoredLead;
	eventSourceUrl?: string;
	clientIp?: string;
	clientUserAgent?: string;
	fbp?: string;
	fbc?: string;
};

export async function sendCapiEvent(
	input: CapiEventInput,
): Promise<CapiResult> {
	const token = getServerEnv("META_CAPI_TOKEN");
	const pixelId = getServerEnv("PUBLIC_FB_PIXEL_ID");
	if (!token || !pixelId)
		return { status: "skipped", reason: "not_configured" };

	const { lead } = input;
	const name = hashName(lead.contact.name);
	const userData: Record<string, unknown> = {
		em: hashEmail(lead.contact.email),
		ph: hashPhone(lead.contact.whatsapp),
		fn: name.fn,
		ln: name.ln,
	};
	if (input.clientIp) userData.client_ip_address = input.clientIp;
	if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent;
	if (input.fbp) userData.fbp = input.fbp;
	if (input.fbc) userData.fbc = input.fbc;
	for (const key of Object.keys(userData)) {
		if (userData[key] === undefined) delete userData[key];
	}

	const event: Record<string, unknown> = {
		event_name: input.eventName,
		event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
		action_source: "website",
		user_data: userData,
	};
	if (input.eventId) event.event_id = input.eventId;
	if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl;

	const payload: Record<string, unknown> = { data: [event] };
	const testEventCode = getServerEnv("META_CAPI_TEST_EVENT_CODE");
	if (testEventCode) payload.test_event_code = testEventCode;

	const version =
		getServerEnv("META_GRAPH_API_VERSION") ?? DEFAULT_GRAPH_VERSION;
	const url = `https://graph.facebook.com/${version}/${pixelId}/events?access_token=${encodeURIComponent(token)}`;

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 6000);
	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
			signal: controller.signal,
		});
		clearTimeout(timeout);
		if (!response.ok) {
			return { status: "failed", reason: `http_${response.status}` };
		}
		return { status: "sent" };
	} catch (error) {
		clearTimeout(timeout);
		return {
			status: "failed",
			reason: error instanceof Error ? error.message : "unknown",
		};
	}
}

/** Builds the event_source_url from the lead's landing path + request origin. */
export function buildEventSourceUrl(
	request: Request,
	landingPath: string | undefined,
): string | undefined {
	try {
		const origin = new URL(request.url).origin;
		return `${origin}${landingPath ?? "/"}`;
	} catch {
		return undefined;
	}
}
