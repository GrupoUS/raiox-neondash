import type { APIRoute } from "astro";
import { completedLeadPayloadSchema } from "../../../lib/leads/schema";
import { getServerEnv } from "../../../lib/server/env";
import { notifyLeadOwner } from "../../../lib/server/lead-notifier";
import {
	completeLead,
	getLeadStoreConfigStatus,
} from "../../../lib/server/leads-store";

export const prerender = false;

async function forwardToExternalWebhook(payload: unknown): Promise<{
	status: "skipped" | "sent" | "failed";
	reason?: string;
}> {
	const webhookUrl =
		getServerEnv("QUIZ_WEBHOOK_URL") ?? getServerEnv("PUBLIC_QUIZ_WEBHOOK_URL");
	if (!webhookUrl) return { status: "skipped" };

	const ctrl = new AbortController();
	const timeout = setTimeout(() => ctrl.abort(), 8000);
	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
			signal: ctrl.signal,
		});
		clearTimeout(timeout);
		if (!response.ok)
			return { status: "failed", reason: `http_${response.status}` };
		return { status: "sent" };
	} catch (error) {
		clearTimeout(timeout);
		return {
			status: "failed",
			reason: error instanceof Error ? error.message : "unknown",
		};
	}
}

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
	const parsed = completedLeadPayloadSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json({ error: "invalid_payload" }, { status: 400 });
	}

	const result = await completeLead(parsed.data);
	const [externalWebhook, notification] = await Promise.all([
		forwardToExternalWebhook(parsed.data),
		result.shouldNotify
			? notifyLeadOwner("completed_quiz", result.lead)
			: Promise.resolve({ status: "skipped" as const }),
	]);

	return Response.json({
		ok: true,
		leadId: result.lead.id,
		created: result.created,
		externalWebhook,
		notification,
	});
};
