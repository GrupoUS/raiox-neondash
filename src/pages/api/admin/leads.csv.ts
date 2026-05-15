import type { APIRoute } from "astro";
import { readAdminSession } from "../../../lib/server/auth";
import { listLeads } from "../../../lib/server/leads-store";

export const prerender = false;

function csvEscape(value: unknown): string {
	const text = value == null ? "" : String(value);
	return `"${text.replace(/"/g, '""')}"`;
}

export const GET: APIRoute = async ({ cookies }) => {
	const session = await readAdminSession(cookies);
	if (!session) return new Response("Unauthorized", { status: 401 });

	const leads = await listLeads(500);
	const rows = [
		[
			"id",
			"status",
			"createdAt",
			"updatedAt",
			"completedAt",
			"name",
			"whatsapp",
			"email",
			"instagram",
			"cityState",
			"score",
			"intent",
			"segment",
			"quizVersion",
		],
		...leads.map((lead) => [
			lead.id,
			lead.status,
			lead.createdAt,
			lead.updatedAt,
			lead.completedAt ?? "",
			lead.contact.name,
			lead.contact.whatsapp,
			lead.contact.email,
			lead.contact.instagram ?? "",
			lead.contact.cityState ?? "",
			lead.score?.total ?? "",
			lead.score?.intent ?? "",
			lead.score?.segment ?? "",
			lead.quizVersion,
		]),
	];
	const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
	return new Response(csv, {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": 'attachment; filename="raio-x-leads.csv"',
		},
	});
};
