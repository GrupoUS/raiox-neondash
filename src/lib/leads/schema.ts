import { z } from "zod";

export const leadContactSchema = z.object({
	name: z.string().trim().min(2),
	whatsapp: z.string().trim().min(10),
	email: z.string().trim().email(),
	instagram: z.string().trim().optional(),
	cityState: z.string().trim().optional(),
	consentGiven: z.literal(true),
	consentTimestamp: z.string().datetime(),
});

export const leadMetaSchema = z.object({
	utm: z.record(z.string(), z.string()).default({}),
	referrer: z.string().optional(),
	userAgent: z.string().optional(),
	landingPath: z.string().optional(),
});

export const leadScoreSchema = z.object({
	total: z.number(),
	rawTotal: z.number(),
	intent: z.enum(["cold", "warm", "hot"]),
	segment: z.enum([
		"gargalo-gestao",
		"gargalo-marketing",
		"gargalo-vendas",
		"gargalos-distribuidos",
	]),
});

export const answersExportSchema = z.record(
	z.string(),
	z.union([z.string(), z.number()]),
);

const leadBasePayloadSchema = z.object({
	quizId: z.string(),
	quizVersion: z.string(),
	sessionId: z.string().min(6),
	contact: leadContactSchema,
	meta: leadMetaSchema,
});

export const partialLeadPayloadSchema = leadBasePayloadSchema.extend({
	capturedAt: z.string().datetime(),
	eventType: z.literal("partial_contact"),
});

export const completedLeadPayloadSchema = leadBasePayloadSchema.extend({
	submittedAt: z.string().datetime(),
	answers: answersExportSchema,
	score: leadScoreSchema,
});

export const storedLeadEventSchema = z.object({
	type: z.enum(["partial_contact", "completed_quiz"]),
	at: z.string().datetime(),
});

export const storedLeadSchema = z.object({
	id: z.string(),
	status: z.enum(["partial", "completed"]),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	completedAt: z.string().datetime().optional(),
	quizId: z.string(),
	quizVersion: z.string(),
	sessionId: z.string(),
	contact: leadContactSchema,
	answers: answersExportSchema.optional(),
	score: leadScoreSchema.optional(),
	meta: leadMetaSchema,
	events: z.array(storedLeadEventSchema).default([]),
});

export type LeadContact = z.infer<typeof leadContactSchema>;
export type LeadMeta = z.infer<typeof leadMetaSchema>;
export type PartialLeadPayload = z.infer<typeof partialLeadPayloadSchema>;
export type CompletedLeadPayload = z.infer<typeof completedLeadPayloadSchema>;
export type StoredLead = z.infer<typeof storedLeadSchema>;
export type StoredLeadEvent = z.infer<typeof storedLeadEventSchema>;
