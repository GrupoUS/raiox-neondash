import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const HEX_LITERAL = /#[0-9a-f]{3,6}\b/i;

const internalOrAbsoluteUrl = z
	.string()
	.refine(
		(value) => value.startsWith("/") || /^https?:\/\//i.test(value),
		"primaryCta.url must be an absolute URL (https://…) or an internal path (/…).",
	);

const landings = defineCollection({
	loader: glob({ pattern: "**/*.json", base: "src/content/landings" }),
	schema: ({ image }) =>
		z
			.object({
				slug: z.string(),
				seo: z.object({
					title: z.string().max(70),
					description: z.string().min(120).max(200),
					ogImage: z.string().optional(),
					canonical: z.string().url().optional(),
				}),
				hero: z.object({
					eyebrow: z.string().optional(),
					headline: z.string(),
					headlineParts: z
						.object({
							lead: z.string(),
							highlight: z.string(),
							tail: z.string().optional(),
						})
						.optional(),
					tagline: z.string(),
					subhead: z.string(),
					problemPills: z.array(z.string().max(60)).length(3).optional(),
					cta: z.object({
						label: z.string(),
						helperText: z.string().optional(),
					}),
					image: z
						.object({
							src: image(),
							alt: z.string().min(10),
							priority: z.boolean().default(true),
							objectPosition: z.string().optional(),
						})
						.optional(),
					trustSignals: z
						.object({
							doctorBio: z.string().optional(),
							urgencyMicrocopy: z.string().optional(),
						})
						.optional(),
					trustStrip: z
						.array(
							z.object({
								icon: z.string(),
								label: z.string(),
								value: z.string(),
							}),
						)
						.length(3)
						.optional(),
				}),
				problem: z
					.object({
						eyebrow: z.string().optional(),
						headline: z.string(),
						paragraphs: z.array(z.string()).min(1),
						costs: z
							.array(
								z.object({
									icon: z.string(),
									label: z.string(),
									description: z.string(),
								}),
							)
							.min(3)
							.max(4),
					})
					.optional(),
				benefits: z.object({
					headline: z.string(),
					items: z
						.array(
							z.object({
								icon: z.string(),
								title: z.string(),
								description: z.string().optional(),
							}),
						)
						.min(3),
				}),
				howItWorks: z
					.object({
						headline: z.string(),
						subhead: z.string().optional(),
						image: z
							.object({
								src: image(),
								alt: z.string().min(10),
								objectPosition: z.string().optional(),
							})
							.optional(),
						steps: z
							.array(
								z.object({
									number: z.string(),
									title: z.string(),
									description: z.string(),
									duration: z.string().optional(),
								}),
							)
							.length(4),
					})
					.optional(),
				qualification: z.object({
					headline: z.string(),
					intro: z.string().optional(),
					items: z.array(z.string()).min(3),
				}),
				notFor: z
					.object({
						headline: z.string(),
						intro: z.string().optional(),
						items: z.array(z.string()).min(3).max(5),
					})
					.optional(),
				faq: z
					.object({
						headline: z.string(),
						subhead: z.string().optional(),
						items: z
							.array(
								z.object({
									q: z.string(),
									a: z.string(),
								}),
							)
							.min(4)
							.max(10),
					})
					.optional(),
				finalCta: z.object({
					headline: z.string(),
					paragraphs: z.array(z.string()).min(1),
					cta: z.object({
						label: z.string(),
						microcopy: z.string().optional(),
					}),
					secondaryCta: z
						.object({
							label: z.string(),
							whatsappMessage: z.string().startsWith("Olá, Laura!"),
						})
						.optional(),
					image: z
						.object({
							src: image(),
							alt: z.string().min(10),
							objectPosition: z.string().optional(),
						})
						.optional(),
					socialProof: z
						.object({
							stars: z.number().int().min(1).max(5).optional(),
							text: z.string().min(8),
						})
						.optional(),
				}),
				primaryCta: z.object({
					mode: z.enum([
						"typebot-iframe",
						"typebot-popup",
						"external-url",
						"whatsapp",
						"native-quiz",
					]),
					url: internalOrAbsoluteUrl,
					whatsappMessage: z.string().startsWith("Olá, Laura!").optional(),
				}),
			})
			.refine((data) => !HEX_LITERAL.test(JSON.stringify(data)), {
				message:
					"Hex color literals are forbidden in landing copy (cardinal #7). Use semantic tokens or named utilities.",
			}),
});

const quizOptionSchema = z.object({
	id: z.string(),
	label: z.string(),
	weight: z.number().min(0).max(100),
});

const stepMultipleChoice = z.object({
	id: z.string(),
	type: z.literal("multiple-choice"),
	title: z.string(),
	helperText: z.string().optional(),
	scoreField: z.string(),
	options: z.array(quizOptionSchema).min(2).max(6),
});

const stepScale = z.object({
	id: z.string(),
	type: z.literal("scale"),
	title: z.string(),
	helperText: z.string().optional(),
	scoreField: z.string(),
	scale: z.object({
		min: z.number().int(),
		max: z.number().int(),
		minLabel: z.string(),
		maxLabel: z.string(),
		weights: z.array(z.number().min(0).max(100)),
	}),
});

const stepContact = z.object({
	id: z.string(),
	type: z.literal("contact"),
	title: z.string(),
	helperText: z.string().optional(),
	fields: z
		.array(
			z.object({
				name: z.enum(["name", "whatsapp", "email", "instagram", "cityState"]),
				label: z.string(),
				placeholder: z.string().optional(),
				required: z.boolean().default(false),
			}),
		)
		.min(1),
});

const quizStepSchema = z.discriminatedUnion("type", [
	stepMultipleChoice,
	stepScale,
	stepContact,
]);

const quizzes = defineCollection({
	loader: glob({ pattern: "**/*.json", base: "src/content/quizzes" }),
	schema: z
		.object({
			slug: z.string(),
			version: z.string().regex(/^\d+\.\d+\.\d+$/, "Use semver (x.y.z)."),
			intro: z.object({
				eyebrow: z.string().optional(),
				headline: z.string(),
				subhead: z.string().optional(),
				helperText: z.string().optional(),
			}),
			steps: z.array(quizStepSchema).min(1),
			consent: z.object({
				label: z.string(),
				linkText: z.string(),
				privacyPolicyHref: z.string().startsWith("/"),
			}),
			thanksScreen: z.object({
				headline: z.string(),
				body: z.string(),
				nextSteps: z.array(z.string()).min(1),
				cta: z
					.object({
						label: z.string(),
						href: z.string().optional(),
						whatsappMessage: z.string().startsWith("Olá, Laura!").optional(),
					})
					.optional(),
			}),
			errorScreen: z.object({
				headline: z.string(),
				body: z.string(),
				retryLabel: z.string(),
				fallbackLabel: z.string(),
				fallbackWhatsappTemplate: z.string().startsWith("Olá,"),
			}),
			scoring: z.object({
				maxScore: z.number().int().min(1).max(1000),
				thresholds: z.object({
					warm: z.number().int(),
					hot: z.number().int(),
				}),
			}),
		})
		.refine((data) => !HEX_LITERAL.test(JSON.stringify(data)), {
			message:
				"Hex color literals are forbidden in quiz copy (cardinal #7). Use semantic tokens or named utilities.",
		}),
});

export const collections = { landings, quizzes };
