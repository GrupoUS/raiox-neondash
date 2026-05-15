import type { APIRoute } from "astro";
import { readAdminSession } from "../../../lib/server/auth";
import {
	getLeadStoreConfigStatus,
	listLeads,
} from "../../../lib/server/leads-store";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
	const session = await readAdminSession(cookies);
	if (!session) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
	}

	const storeStatus = getLeadStoreConfigStatus();
	if (!storeStatus.configured) {
		return Response.json(
			{ error: "lead_store_not_configured", missing: storeStatus.missing },
			{ status: 503 },
		);
	}

	const leads = await listLeads(150);
	return Response.json({ leads });
};
