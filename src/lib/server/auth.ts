import { getMissingEnv, getServerEnv } from "./env";

const SESSION_COOKIE = "raiox_admin_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

type CookieValue = { value: string };
type CookieReader = {
	get(name: string): CookieValue | undefined;
};
type CookieWriter = CookieReader & {
	set(
		name: string,
		value: string,
		options: {
			path: string;
			httpOnly: boolean;
			secure: boolean;
			sameSite: "lax";
			maxAge: number;
		},
	): void;
	delete(name: string, options: { path: string }): void;
};

type AdminSessionPayload = {
	username: string;
	exp: number;
};

function bytesToHex(bytes: ArrayBuffer): string {
	return Array.from(new Uint8Array(bytes))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
	const padded = value
		.replace(/-/g, "+")
		.replace(/_/g, "/")
		.padEnd(Math.ceil(value.length / 4) * 4, "=");
	const binary = atob(padded);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(value),
	);
	return bytesToHex(digest);
}

async function hmacSha256(value: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(value),
	);
	return bytesToBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string): boolean {
	const left = new TextEncoder().encode(a);
	const right = new TextEncoder().encode(b);
	if (left.length !== right.length) return false;
	let diff = 0;
	for (let i = 0; i < left.length; i += 1) {
		diff |= left[i] ^ right[i];
	}
	return diff === 0;
}

function getSessionSecret(): string | undefined {
	return getServerEnv("ADMIN_SESSION_SECRET");
}

export function getAdminAuthConfigStatus() {
	const missing = getMissingEnv([
		"ADMIN_USERNAME",
		"ADMIN_PASSWORD_SHA256",
		"ADMIN_SESSION_SECRET",
	]);
	return {
		configured: missing.length === 0,
		missing,
	};
}

export async function verifyAdminLogin(
	username: string,
	password: string,
): Promise<boolean> {
	const expectedUsername = getServerEnv("ADMIN_USERNAME");
	const expectedPasswordHash = getServerEnv("ADMIN_PASSWORD_SHA256");
	if (!expectedUsername || !expectedPasswordHash) return false;

	const passwordHash = await sha256Hex(password);
	return (
		timingSafeEqual(username, expectedUsername) &&
		timingSafeEqual(passwordHash, expectedPasswordHash)
	);
}

export async function createAdminSession(username: string): Promise<string> {
	const secret = getSessionSecret();
	if (!secret) throw new Error("admin_session_secret_missing");

	const payload: AdminSessionPayload = {
		username,
		exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
	};
	const body = bytesToBase64Url(
		new TextEncoder().encode(JSON.stringify(payload)),
	);
	const signature = await hmacSha256(body, secret);
	return `${body}.${signature}`;
}

export async function readAdminSession(
	cookies: CookieReader,
): Promise<AdminSessionPayload | null> {
	const secret = getSessionSecret();
	const token = cookies.get(SESSION_COOKIE)?.value;
	if (!secret || !token) return null;

	const [body, signature] = token.split(".");
	if (!body || !signature) return null;

	const expectedSignature = await hmacSha256(body, secret);
	if (!timingSafeEqual(signature, expectedSignature)) return null;

	try {
		const payload = JSON.parse(
			new TextDecoder().decode(base64UrlToBytes(body)),
		) as AdminSessionPayload;
		if (!payload.username || !payload.exp) return null;
		if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
		return payload;
	} catch {
		return null;
	}
}

export function setAdminSessionCookie(
	cookies: CookieWriter,
	token: string,
): void {
	cookies.set(SESSION_COOKIE, token, {
		path: "/",
		httpOnly: true,
		secure: import.meta.env.PROD,
		sameSite: "lax",
		maxAge: SESSION_TTL_SECONDS,
	});
}

export function clearAdminSessionCookie(cookies: CookieWriter): void {
	cookies.delete(SESSION_COOKIE, { path: "/" });
}
