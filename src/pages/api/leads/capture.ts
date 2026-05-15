import type { APIRoute } from "astro";
import { partialLeadPayloadSchema } from "../../../lib/leads/schema";
import { notifyLeadOwner } from "../../../lib/server/lead-notifier";
import {
	capturePartialLead,
	getLeadStoreConfigStatus,
} from "../../../lib/server/leads-store";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	if (
		request.headers.get("Content-Type")?.includes("application/json") !== true
	) {
		return Response.json({ error: "invalid_content_type" }, { status: 415 });
	}

	const storeStatus = getLeadStoreConfigStatus();
	if (!storeStatus.configured) {
		return Response.json(
			{ error: "lead_store_not_configured", missing: storeStatus.missing },
			{ status: 503 },
		);
	}

	const body = await request.json().catch(() => null);
	const parsed = partialLeadPayloadSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json({ error: "invalid_payload" }, { status: 400 });
	}

	const result = await capturePartialLead(parsed.data);
	const notification = result.shouldNotify
		? await notifyLeadOwner("partial_contact", result.lead)
		: { status: "skipped" as const };

	return Response.json({
		ok: true,
		leadId: result.lead.id,
		created: result.created,
		notification,
	});
};
