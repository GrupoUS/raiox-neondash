import type { ReactNode } from "react";
import type { QuizContent } from "./schema";

type Props = {
	intro: QuizContent["intro"];
	children: ReactNode;
};

export function QuizContainer({ intro, children }: Props) {
	return (
		<section className="relative w-full px-4 py-12 sm:py-16 md:py-20">
			<div className="mx-auto w-full max-w-2xl">
				<header className="mb-8 text-center sm:mb-10">
					{intro.eyebrow ? (
						<span className="inline-block text-xs uppercase tracking-[0.18em] text-gold mb-3">
							{intro.eyebrow}
						</span>
					) : null}
					<h1 className="font-serif text-3xl leading-tight sm:text-4xl md:text-5xl text-foreground">
						{intro.headline}
					</h1>
					{intro.subhead ? (
						<p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
							{intro.subhead}
						</p>
					) : null}
				</header>
				<div className="glass-card-bright rounded-2xl p-6 sm:p-8 md:p-10">
					{children}
				</div>
				{intro.helperText ? (
					<p className="mt-6 text-center text-xs text-muted">
						{intro.helperText}
					</p>
				) : null}
			</div>
		</section>
	);
}
