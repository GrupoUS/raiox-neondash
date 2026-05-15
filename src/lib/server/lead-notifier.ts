import type { StoredLead } from "../leads/schema";
import { getServerEnv } from "./env";

type LeadNotificationEvent = "partial_contact" | "completed_quiz";

type NotificationResult =
	| { status: "skipped" }
	| { status: "sent" }
	| { status: "failed"; reason: string };

function buildLeadNotificationMessage(
	eventType: LeadNotificationEvent,
	lead: StoredLead,
): string {
	const status =
		eventType === "partial_contact"
			? "Lead capturado antes de finalizar o Raio-X"
			: "Lead finalizou o Raio-X";
	const score = lead.score
		? `${lead.score.total}/100 (${lead.score.intent}, ${lead.score.segment})`
		: "Ainda sem score";

	return [
		`[Raio-X] ${status}`,
		`Nome: ${lead.contact.name}`,
		`WhatsApp: ${lead.contact.whatsapp}`,
		`E-mail: ${lead.contact.email}`,
		`Instagram: ${lead.contact.instagram || "Não informado"}`,
		`Cidade/UF: ${lead.contact.cityState || "Não informado"}`,
		`Score: ${score}`,
		`ID: ${lead.id}`,
	].join("\n");
}

export async function notifyLeadOwner(
	eventType: LeadNotificationEvent,
	lead: StoredLead,
): Promise<NotificationResult> {
	const webhookUrl = getServerEnv("LEAD_NOTIFY_WEBHOOK_URL");
	if (!webhookUrl) return { status: "skipped" };

	const ctrl = new AbortController();
	const timeout = setTimeout(() => ctrl.abort(), 6000);
	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(getServerEnv("LEAD_NOTIFY_WEBHOOK_SECRET")
					? {
							"X-Lead-Webhook-Secret": getServerEnv(
								"LEAD_NOTIFY_WEBHOOK_SECRET",
							) as string,
						}
					: {}),
			},
			body: JSON.stringify({
				eventType,
				message: buildLeadNotificationMessage(eventType, lead),
				lead,
			}),
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
