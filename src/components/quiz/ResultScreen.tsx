import {
	ArrowRight,
	CheckCircle2,
	MessageCircle,
	RefreshCw,
} from "lucide-react";
import { useEffect } from "react";
import { track } from "../../lib/analytics";
import { whatsappUrlWithText } from "../../lib/whatsapp";
import type { ContactInput, QuizContent } from "./schema";
import type { ScoreResult } from "./scoring";

type CommonProps = {
	quiz: QuizContent;
	sessionId: string;
};

type Props = CommonProps &
	(
		| { mode: "success" }
		| {
				mode: "fallback";
				contact: Partial<ContactInput>;
				score: ScoreResult;
				reason?: string;
		  }
		| {
				mode: "error";
				reason?: string;
				onRetry: () => void;
				score?: ScoreResult;
		  }
	);

const SEGMENT_LABELS: Record<ScoreResult["segment"], string> = {
	"clinica-inicial": "Clínica em validação",
	"em-crescimento": "Clínica em crescimento",
	estabelecida: "Clínica estabelecida",
	"pronta-para-diagnostico": "Pronta para diagnóstico",
};

function buildFallbackMessage(
	template: string,
	contact: Partial<ContactInput>,
	score: ScoreResult,
): string {
	const name = contact.name?.trim() || "Olá";
	return `${template}\n\nNome: ${name}\nSegmento: ${SEGMENT_LABELS[score.segment]}\nScore: ${score.total}/100`;
}

export function ResultScreen(props: Props) {
	const { quiz, sessionId, mode } = props;

	// biome-ignore lint/correctness/useExhaustiveDependencies: fire-once on mount per session+mode; reason captured at first render.
	useEffect(() => {
		if (mode === "fallback") {
			track("whatsapp_fallback_offered", { sessionId, reason: props.reason });
		}
	}, [mode, sessionId]);

	if (mode === "success") {
		const cta = quiz.thanksScreen.cta;
		const ctaHref = cta?.whatsappMessage
			? whatsappUrlWithText(cta.whatsappMessage)
			: cta?.href;
		return (
			<section className="relative w-full px-4 py-16 sm:py-20">
				<div className="mx-auto w-full max-w-2xl text-center">
					<div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gold-soft">
						<CheckCircle2 className="h-8 w-8 text-gold" aria-hidden="true" />
					</div>
					<h1 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">
						{quiz.thanksScreen.headline}
					</h1>
					<p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
						{quiz.thanksScreen.body}
					</p>
					<ol className="glass-card mx-auto mt-8 flex max-w-xl flex-col gap-3 rounded-2xl p-6 text-left text-sm text-muted sm:text-base">
						{quiz.thanksScreen.nextSteps.map((nextStep, i) => (
							<li key={nextStep} className="flex gap-3">
								<span className="font-serif text-gold">{i + 1}.</span>
								<span className="leading-relaxed">{nextStep}</span>
							</li>
						))}
					</ol>
					{cta && ctaHref ? (
						<a
							href={ctaHref}
							target="_blank"
							rel="noopener noreferrer"
							onClick={() =>
								track("whatsapp_post_success_clicked", { sessionId })
							}
							className="mt-8 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-gold bg-transparent px-6 py-3 text-base font-semibold text-gold transition-colors hover:bg-gold hover:text-navy"
						>
							<MessageCircle className="h-5 w-5" aria-hidden="true" />
							{cta.label}
						</a>
					) : null}
				</div>
			</section>
		);
	}

	if (mode === "fallback") {
		const message = buildFallbackMessage(
			quiz.errorScreen.fallbackWhatsappTemplate,
			props.contact,
			props.score,
		);
		const whatsappHref = whatsappUrlWithText(message);
		return (
			<section className="relative w-full px-4 py-16 sm:py-20">
				<div className="mx-auto w-full max-w-2xl text-center">
					<h1 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">
						{quiz.errorScreen.headline}
					</h1>
					<p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
						{quiz.errorScreen.body}
					</p>
					<div className="mt-8 flex flex-col items-center gap-3">
						<a
							href={whatsappHref}
							target="_blank"
							rel="noopener noreferrer"
							onClick={() =>
								track("whatsapp_fallback_used", {
									sessionId,
									reason: props.reason ?? "unknown",
								})
							}
							className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3 text-base font-semibold text-navy transition-colors hover:bg-gold-light"
						>
							<MessageCircle className="h-5 w-5" aria-hidden="true" />
							{quiz.errorScreen.fallbackLabel}
						</a>
					</div>
				</div>
			</section>
		);
	}

	// error mode
	return (
		<section className="relative w-full px-4 py-16 sm:py-20">
			<div className="mx-auto w-full max-w-2xl text-center">
				<h1 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">
					Não foi dessa vez
				</h1>
				<p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
					Tivemos um problema ao registrar suas respostas. Tente novamente ou
					fale com a Laura direto pelo WhatsApp.
				</p>
				<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
					<button
						type="button"
						onClick={props.onRetry}
						className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3 text-base font-semibold text-navy transition-colors hover:bg-gold-light"
					>
						<RefreshCw className="h-4 w-4" aria-hidden="true" />
						{quiz.errorScreen.retryLabel}
					</button>
					<a
						href={whatsappUrlWithText(
							quiz.errorScreen.fallbackWhatsappTemplate,
						)}
						target="_blank"
						rel="noopener noreferrer"
						onClick={() =>
							track("whatsapp_fallback_used", {
								sessionId,
								reason: "error-retry",
							})
						}
						className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-gold bg-transparent px-6 py-3 text-base font-semibold text-gold transition-colors hover:bg-gold hover:text-navy"
					>
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
						{quiz.errorScreen.fallbackLabel}
					</a>
				</div>
			</div>
		</section>
	);
}
