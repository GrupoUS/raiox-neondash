// @ts-check

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";
import { EnumChangefreq } from "sitemap";

const SITEMAP_EXCLUDE_RE = /\/raio-x\/perguntas\/?$/;
const SITEMAP_RAIO_X_RE = /\/raio-x\/?$/;
const SITEMAP_PRIVACY_RE = /\/politica-de-privacidade\/?$/;

// https://astro.build/config
export default defineConfig({
	site: "https://harmonic-pascal.grupous.com.br",
	fonts: [
		{
			name: "Playfair Display",
			cssVariable: "--font-playfair",
			provider: fontProviders.google(),
			weights: [400, 600, 700],
			styles: ["normal"],
		},
		{
			name: "Inter",
			cssVariable: "--font-inter",
			provider: fontProviders.google(),
			weights: [300, 400, 500, 600, 700],
			styles: ["normal"],
		},
	],
	integrations: [
		react(),
		sitemap({
			filter: (page) => !SITEMAP_EXCLUDE_RE.test(page),
			serialize(item) {
				if (SITEMAP_RAIO_X_RE.test(item.url)) {
					item.priority = 0.9;
					item.changefreq = EnumChangefreq.MONTHLY;
				} else if (SITEMAP_PRIVACY_RE.test(item.url)) {
					item.priority = 0.3;
					item.changefreq = EnumChangefreq.YEARLY;
				}
				return item;
			},
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
