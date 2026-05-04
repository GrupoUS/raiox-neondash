import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const HEX_LITERAL = /#[0-9a-f]{3,6}\b/i;

const landings = defineCollection({
	loader: glob({ pattern: "**/*.json", base: "src/content/landings" }),
	schema: z
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
				tagline: z.string(),
				subhead: z.string(),
				cta: z.object({
					label: z.string(),
					helperText: z.string().optional(),
				}),
				image: z
					.object({
						src: z.string(),
						alt: z.string().min(10),
						priority: z.boolean().default(true),
					})
					.optional(),
				trustSignals: z
					.object({
						doctorBio: z.string().optional(),
						urgencyMicrocopy: z.string().optional(),
					})
					.optional(),
			}),
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
			qualification: z.object({
				headline: z.string(),
				intro: z.string().optional(),
				items: z.array(z.string()).min(3),
			}),
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
			}),
			primaryCta: z.object({
				mode: z.enum([
					"typebot-iframe",
					"typebot-popup",
					"external-url",
					"whatsapp",
				]),
				url: z.string().url(),
				whatsappMessage: z.string().startsWith("Olá, Laura!").optional(),
			}),
		})
		.refine((data) => !HEX_LITERAL.test(JSON.stringify(data)), {
			message:
				"Hex color literals are forbidden in landing copy (cardinal #7). Use semantic tokens or named utilities.",
		}),
});

export const collections = { landings };
