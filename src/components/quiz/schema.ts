import { z } from "zod";

export const quizOptionSchema = z.object({
	id: z.string(),
	label: z.string(),
	weight: z.number(),
});
export type QuizOption = z.infer<typeof quizOptionSchema>;

const stepMultipleChoice = z.object({
	id: z.string(),
	type: z.literal("multiple-choice"),
	title: z.string(),
	helperText: z.string().optional(),
	scoreField: z.string(),
	options: z.array(quizOptionSchema),
});
export type StepMultipleChoice = z.infer<typeof stepMultipleChoice>;

const stepScale = z.object({
	id: z.string(),
	type: z.literal("scale"),
	title: z.string(),
	helperText: z.string().optional(),
	scoreField: z.string(),
	scale: z.object({
		min: z.number(),
		max: z.number(),
		minLabel: z.string(),
		maxLabel: z.string(),
		weights: z.array(z.number()),
	}),
});
export type StepScale = z.infer<typeof stepScale>;

export const contactFieldName = z.enum([
	"name",
	"whatsapp",
	"email",
	"instagram",
	"cityState",
]);
export type ContactFieldName = z.infer<typeof contactFieldName>;

const stepContact = z.object({
	id: z.string(),
	type: z.literal("contact"),
	title: z.string(),
	helperText: z.string().optional(),
	fields: z.array(
		z.object({
			name: contactFieldName,
			label: z.string(),
			placeholder: z.string().optional(),
			required: z.boolean().default(false),
		}),
	),
});
export type StepContact = z.infer<typeof stepContact>;

export const quizStepSchema = z.discriminatedUnion("type", [
	stepMultipleChoice,
	stepScale,
	stepContact,
]);
export type QuizStep = z.infer<typeof quizStepSchema>;

export const quizContentSchema = z.object({
	slug: z.string(),
	version: z.string(),
	intro: z.object({
		eyebrow: z.string().optional(),
		headline: z.string(),
		subhead: z.string().optional(),
		helperText: z.string().optional(),
	}),
	steps: z.array(quizStepSchema),
	consent: z.object({
		label: z.string(),
		linkText: z.string(),
		privacyPolicyHref: z.string(),
	}),
	thanksScreen: z.object({
		headline: z.string(),
		body: z.string(),
		nextSteps: z.array(z.string()),
		cta: z
			.object({
				label: z.string(),
				href: z.string().optional(),
				whatsappMessage: z.string().optional(),
			})
			.optional(),
	}),
	errorScreen: z.object({
		headline: z.string(),
		body: z.string(),
		retryLabel: z.string(),
		fallbackLabel: z.string(),
		fallbackWhatsappTemplate: z.string(),
	}),
	scoring: z.object({
		maxScore: z.number(),
		thresholds: z.object({
			warm: z.number(),
			hot: z.number(),
		}),
	}),
});
export type QuizContent = z.infer<typeof quizContentSchema>;

export const contactSchema = z.object({
	name: z.string().trim().min(2, "Informe seu nome."),
	whatsapp: z
		.string()
		.trim()
		.refine((v) => v.replace(/\D/g, "").length >= 10, {
			message: "Informe um WhatsApp válido com DDD.",
		}),
	email: z.string().trim().email("Informe um e-mail válido."),
	instagram: z.string().trim().optional(),
	cityState: z.string().trim().optional(),
	consentGiven: z.literal(true, {
		message: "É necessário aceitar a Política de Privacidade.",
	}),
});
export type ContactInput = z.infer<typeof contactSchema>;

export type AnswerValue =
	| { type: "multiple-choice"; optionId: string; weight: number }
	| { type: "scale"; value: number; weight: number };

export type AnswersMap = Record<string, AnswerValue>;
