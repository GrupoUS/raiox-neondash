import { z } from "zod";

/**
 * Payload for the first-party tracking beacon (`POST /api/track/event`).
 *
 * Top-of-funnel only: PageView / ViewContent / Contact. NEVER carries PII —
 * the server adds IP / user-agent / `_fbp` / `_fbc` from the request and
 * (optionally) synthesizes `_fbc` from `fbclid`. `eventId` is shared with the
 * browser Pixel's `eventID` so Meta dedupes browser + CAPI by (event_name, id).
 */
export const trackBeaconSchema = z.object({
	event: z.enum(["PageView", "ViewContent", "Contact"]),
	eventId: z.string().min(6),
	landingPath: z.string().optional(),
	fbclid: z.string().optional(),
});

export type TrackBeaconPayload = z.infer<typeof trackBeaconSchema>;
