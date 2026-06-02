/**
 * Shared DOM interactions — mouse-glow, 3D tilt, scroll parallax.
 *
 * One bundled module, imported once in Layout.astro. MPA-safe: it runs on each
 * full page load (no SPA router). Every effect degrades:
 *  - prefers-reduced-motion → tilt/parallax skipped, glow stays static.
 *  - coarse pointer (touch)  → tilt skipped (kept smooth on phones).
 * All effects write only CSS custom properties / transforms → zero layout cost.
 */

import { attachCtaClickListener, track, trackOnce } from "../lib/analytics";

const prefersReducedMotion = window.matchMedia(
	"(prefers-reduced-motion: reduce)",
).matches;
const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

/* ---- Mouse-follow glow (activates [data-glow-card] radial highlight) ---- */
function initGlow(): void {
	const cards = document.querySelectorAll<HTMLElement>("[data-glow-card]");
	for (const card of cards) {
		card.addEventListener("pointermove", (event) => {
			const rect = card.getBoundingClientRect();
			card.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
			card.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
		});
	}
}

/* ---- 3D tilt (fine pointer + motion allowed only) ---- */
function initTilt(): void {
	if (!hasFinePointer || prefersReducedMotion) return;
	const max =
		Number.parseFloat(
			getComputedStyle(document.documentElement).getPropertyValue(
				"--tilt-max-deg",
			),
		) || 8;

	for (const el of document.querySelectorAll<HTMLElement>("[data-tilt]")) {
		let raf = 0;
		el.addEventListener("pointermove", (event) => {
			const rect = el.getBoundingClientRect();
			const px = (event.clientX - rect.left) / rect.width - 0.5;
			const py = (event.clientY - rect.top) / rect.height - 0.5;
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				el.style.setProperty("--ry", `${(px * max).toFixed(2)}deg`);
				el.style.setProperty("--rx", `${(-py * max).toFixed(2)}deg`);
			});
		});
		el.addEventListener("pointerleave", () => {
			cancelAnimationFrame(raf);
			el.style.setProperty("--rx", "0deg");
			el.style.setProperty("--ry", "0deg");
		});
	}
}

/* ---- Scroll parallax (writes --py; CSS applies translate3d) ---- */
function initParallax(): void {
	if (prefersReducedMotion) return;
	const items = [...document.querySelectorAll<HTMLElement>("[data-parallax]")];
	if (!items.length) return;

	let ticking = false;
	const update = (): void => {
		const vh = window.innerHeight;
		for (const el of items) {
			const speed = Number.parseFloat(el.dataset.parallax || "0.15");
			const rect = el.getBoundingClientRect();
			const progress = (rect.top + rect.height / 2 - vh / 2) / vh; // -1..1
			el.style.setProperty("--py", `${(-progress * speed * 100).toFixed(1)}px`);
		}
		ticking = false;
	};

	window.addEventListener(
		"scroll",
		() => {
			if (!ticking) {
				ticking = true;
				requestAnimationFrame(update);
			}
		},
		{ passive: true },
	);
	update();
}

/* ---- Scroll progress bar + scroll-depth events ---- */
function initScrollProgress(): void {
	const bar = document.querySelector<HTMLElement>("[data-scroll-progress]");
	let ticking = false;
	const update = (): void => {
		const doc = document.documentElement;
		const max = doc.scrollHeight - doc.clientHeight;
		const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
		bar?.style.setProperty("--scroll-progress", progress.toFixed(4));
		const pct = progress * 100;
		if (pct >= 25) trackOnce("scroll_25", "scroll_25");
		if (pct >= 50) trackOnce("scroll_50", "scroll_50");
		if (pct >= 75) trackOnce("scroll_75", "scroll_75");
		if (pct >= 90) trackOnce("scroll_90", "scroll_90");
		ticking = false;
	};
	window.addEventListener(
		"scroll",
		() => {
			if (!ticking) {
				ticking = true;
				requestAnimationFrame(update);
			}
		},
		{ passive: true },
	);
	update();
}

/* ---- section_view_* once per section ---- */
function initSectionViews(): void {
	const sections = document.querySelectorAll<HTMLElement>("[data-section]");
	if (!sections.length || !("IntersectionObserver" in window)) return;
	const obs = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				const name = (entry.target as HTMLElement).dataset.section ?? "unknown";
				trackOnce(`section_view_${name}`, `section_view_${name}`);
				obs.unobserve(entry.target);
			}
		},
		{ threshold: 0.4 },
	);
	for (const section of sections) obs.observe(section);
}

/* ---- faq_open on native <details> toggle ---- */
function initFaqTracking(): void {
	for (const details of document.querySelectorAll<HTMLDetailsElement>(
		"details",
	)) {
		details.addEventListener("toggle", () => {
			if (!details.open) return;
			const question =
				details.querySelector("summary")?.textContent?.trim().slice(0, 80) ??
				"";
			track("faq_open", { question });
		});
	}
}

/* ---- Count-up for [data-countup] stats (skipped on reduced motion) ---- */
function initCountUp(): void {
	const els = document.querySelectorAll<HTMLElement>("[data-countup]");
	if (
		!els.length ||
		prefersReducedMotion ||
		!("IntersectionObserver" in window)
	)
		return;

	const animate = (el: HTMLElement): void => {
		const raw = el.textContent?.trim() ?? "";
		const match = raw.match(/^(\D*)([\d.,]+)(.*)$/s);
		if (!match) return;
		const [, prefix, numStr, suffix] = match;
		const target = Number.parseFloat(
			numStr.replace(/\./g, "").replace(",", "."),
		);
		if (!Number.isFinite(target)) return;

		const duration = 1200;
		const t0 = performance.now();
		const step = (now: number): void => {
			const p = Math.min((now - t0) / duration, 1);
			const eased = 1 - (1 - p) ** 3;
			if (p < 1) {
				el.textContent = `${prefix}${Math.round(target * eased).toLocaleString("pt-BR")}${suffix}`;
				requestAnimationFrame(step);
			} else {
				el.textContent = raw; // restore exact original formatting
			}
		};
		requestAnimationFrame(step);
	};

	const obs = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				animate(entry.target as HTMLElement);
				obs.unobserve(entry.target);
			}
		},
		{ threshold: 0.5 },
	);
	for (const el of els) obs.observe(el);
}

/* ---- Sticky desktop offer card: show past hero, hide at final CTA ---- */
function initOfferCard(): void {
	const card = document.querySelector<HTMLElement>("[data-offer-card]");
	if (!card) return;

	let finalCtaVisible = false;
	let ticking = false;
	const update = (): void => {
		const pastHero = window.scrollY > window.innerHeight * 0.7;
		card.classList.toggle("is-visible", pastHero && !finalCtaVisible);
		ticking = false;
	};

	const finalCta = document.querySelector("[data-section='finalCta']");
	if (finalCta && "IntersectionObserver" in window) {
		new IntersectionObserver(
			(entries) => {
				finalCtaVisible = entries[0]?.isIntersecting ?? false;
				update();
			},
			{ threshold: 0.1 },
		).observe(finalCta);
	}

	window.addEventListener(
		"scroll",
		() => {
			if (!ticking) {
				ticking = true;
				requestAnimationFrame(update);
			}
		},
		{ passive: true },
	);
	update();
}

try {
	initGlow();
	initTilt();
	initParallax();
	initScrollProgress();
	initSectionViews();
	initFaqTracking();
	initCountUp();
	initOfferCard();
	attachCtaClickListener();
} catch {
	/* interactions are progressive enhancement — never break the page */
}
