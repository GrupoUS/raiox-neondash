import {
	type CompletedLeadPayload,
	type PartialLeadPayload,
	type StoredLead,
	storedLeadSchema,
} from "../leads/schema";
import { getMissingEnv, getServerEnv } from "./env";

const LEADS_INDEX_KEY = "raiox:leads:index";
const LEAD_TTL_SECONDS = 730 * 24 * 60 * 60;
const MAX_STORED_LEADS = 500;
const PARTIAL_CONTACT_EVENT_TYPE = "partial_contact" as const;
const COMPLETED_QUIZ_EVENT_TYPE = "completed_quiz" as const;

type RedisResponse<T> = {
	result?: T;
	error?: string;
};

type UpsertResult = {
	lead: StoredLead;
	created: boolean;
	shouldNotify: boolean;
};

function getRedisConfig() {
	const url = getServerEnv("UPSTASH_REDIS_REST_URL")?.replace(/\/$/, "");
	const token = getServerEnv("UPSTASH_REDIS_REST_TOKEN");
	return { url, token };
}

export function getLeadStoreConfigStatus() {
	const missing = getMissingEnv([
		"UPSTASH_REDIS_REST_URL",
		"UPSTASH_REDIS_REST_TOKEN",
	]);
	return {
		configured: missing.length === 0,
		missing,
	};
}

async function redisCommand<T>(command: unknown[]): Promise<T> {
	const { url, token } = getRedisConfig();
	if (!url || !token) throw new Error("lead_store_not_configured");

	const response = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(command),
	});
	const body = (await response.json().catch(() => ({}))) as RedisResponse<T>;
	if (!response.ok || body.error) {
		throw new Error(body.error ?? `redis_http_${response.status}`);
	}
	return body.result as T;
}

function leadKey(id: string): string {
	return `raiox:lead:${id}`;
}

function sessionKey(sessionId: string): string {
	return `raiox:lead-session:${sessionId}`;
}

function createLeadId(): string {
	const random =
		typeof crypto !== "undefined" && "randomUUID" in crypto
			? crypto.randomUUID().slice(0, 8)
			: Math.random().toString(36).slice(2, 10);
	return `lead_${Date.now()}_${random}`;
}

async function getLeadBySession(sessionId: string): Promise<StoredLead | null> {
	const existingId = await redisCommand<string | null>([
		"GET",
		sessionKey(sessionId),
	]);
	if (!existingId) return null;
	return getLead(existingId);
}

async function persistLead(lead: StoredLead, created: boolean): Promise<void> {
	await redisCommand([
		"SET",
		leadKey(lead.id),
		JSON.stringify(lead),
		"EX",
		LEAD_TTL_SECONDS,
	]);
	await redisCommand([
		"SET",
		sessionKey(lead.sessionId),
		lead.id,
		"EX",
		LEAD_TTL_SECONDS,
	]);
	if (created) {
		await redisCommand(["LPUSH", LEADS_INDEX_KEY, lead.id]);
		await redisCommand(["LTRIM", LEADS_INDEX_KEY, 0, MAX_STORED_LEADS - 1]);
	}
}

function mergePartialLead(payload: PartialLeadPayload): UpsertResult["lead"] {
	return {
		id: createLeadId(),
		status: "partial",
		createdAt: payload.capturedAt,
		updatedAt: payload.capturedAt,
		quizId: payload.quizId,
		quizVersion: payload.quizVersion,
		sessionId: payload.sessionId,
		contact: payload.contact,
		meta: payload.meta,
		events: [{ type: PARTIAL_CONTACT_EVENT_TYPE, at: payload.capturedAt }],
	};
}

function mergeCompletedLead(
	payload: CompletedLeadPayload,
	existing: StoredLead | null,
): StoredLead {
	const events = existing?.events ?? [];
	const hasCompletedEvent = events.some(
		(event) => event.type === COMPLETED_QUIZ_EVENT_TYPE,
	);

	return {
		id: existing?.id ?? createLeadId(),
		status: "completed",
		createdAt: existing?.createdAt ?? payload.submittedAt,
		updatedAt: payload.submittedAt,
		completedAt: payload.submittedAt,
		quizId: payload.quizId,
		quizVersion: payload.quizVersion,
		sessionId: payload.sessionId,
		contact: payload.contact,
		answers: payload.answers,
		score: payload.score,
		meta: payload.meta,
		events: hasCompletedEvent
			? events
			: [
					...events,
					{ type: COMPLETED_QUIZ_EVENT_TYPE, at: payload.submittedAt },
				].slice(-20),
	};
}

export async function capturePartialLead(
	payload: PartialLeadPayload,
): Promise<UpsertResult> {
	const existing = await getLeadBySession(payload.sessionId);
	const hasPartialEvent = existing?.events.some(
		(event) => event.type === PARTIAL_CONTACT_EVENT_TYPE,
	);
	if (existing) {
		const lead = storedLeadSchema.parse({
			...existing,
			updatedAt: payload.capturedAt,
			contact: payload.contact,
			meta: { ...existing.meta, ...payload.meta },
			events: hasPartialEvent
				? existing.events
				: [
						...existing.events,
						{ type: PARTIAL_CONTACT_EVENT_TYPE, at: payload.capturedAt },
					].slice(-20),
		});
		await persistLead(lead, false);
		return { lead, created: false, shouldNotify: !hasPartialEvent };
	}

	const lead = storedLeadSchema.parse(mergePartialLead(payload));
	await persistLead(lead, true);
	return { lead, created: true, shouldNotify: true };
}

export async function completeLead(
	payload: CompletedLeadPayload,
): Promise<UpsertResult> {
	const existing = await getLeadBySession(payload.sessionId);
	const hadCompletedEvent = existing?.events.some(
		(event) => event.type === COMPLETED_QUIZ_EVENT_TYPE,
	);
	const lead = storedLeadSchema.parse(mergeCompletedLead(payload, existing));
	await persistLead(lead, !existing);
	return { lead, created: !existing, shouldNotify: !hadCompletedEvent };
}

export async function getLead(id: string): Promise<StoredLead | null> {
	const raw = await redisCommand<string | null>(["GET", leadKey(id)]);
	if (!raw) return null;
	return storedLeadSchema.parse(JSON.parse(raw));
}

export async function listLeads(limit = 100): Promise<StoredLead[]> {
	const ids = await redisCommand<string[]>([
		"LRANGE",
		LEADS_INDEX_KEY,
		0,
		limit - 1,
	]);
	const leads = await Promise.all(ids.map((id) => getLead(id)));
	return leads.filter((lead): lead is StoredLead => Boolean(lead));
}
