/**
 * Shared DOM interactions — mouse-glow, 3D tilt, scroll parallax.
 *
 * One bundled module, imported once in Layout.astro. MPA-safe: it runs on each
 * full page load (no SPA router). Every effect degrades:
 *  - prefers-reduced-motion → tilt/parallax skipped, glow stays static.
 *  - coarse pointer (touch)  → tilt skipped (kept smooth on phones).
 * All effects write only CSS custom properties / transforms → zero layout cost.
 */

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

try {
	initGlow();
	initTilt();
	initParallax();
} catch {
	/* interactions are progressive enhancement — never break the page */
}
