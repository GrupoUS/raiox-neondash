import type { APIRoute } from "astro";
import { readAdminSession } from "../../../lib/server/auth";
import { setLeadContacted } from "../../../lib/server/leads-store";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const session = await readAdminSession(cookies);
	if (!session) return redirect("/admin", 303);

	const form = await request.formData();
	const id = String(form.get("id") ?? "").trim();
	const contacted = String(form.get("contacted") ?? "true") === "true";
	const filter = String(form.get("filter") ?? "all");

	if (id) {
		try {
			await setLeadContacted(id, contacted);
		} catch {
			/* degrada silenciosamente; recarrega a lista */
		}
	}

	const suffix =
		filter && filter !== "all" ? `?filter=${encodeURIComponent(filter)}` : "";
	return redirect(`/admin/leads${suffix}`, 303);
};
