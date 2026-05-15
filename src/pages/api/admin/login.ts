import type { APIRoute } from "astro";
import {
	createAdminSession,
	setAdminSessionCookie,
	verifyAdminLogin,
} from "../../../lib/server/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const form = await request.formData();
	const username = String(form.get("username") ?? "").trim();
	const password = String(form.get("password") ?? "");

	if (!username || !password || !(await verifyAdminLogin(username, password))) {
		return redirect("/admin?error=invalid", 303);
	}

	const token = await createAdminSession(username);
	setAdminSessionCookie(cookies, token);
	return redirect("/admin/leads", 303);
};
