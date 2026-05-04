import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const landings = defineCollection({
	loader: glob({ pattern: "**/*.json", base: "src/content/landings" }),
	schema: z.object({
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
	}),
});

export const collections = { landings };
