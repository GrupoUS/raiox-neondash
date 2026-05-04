import { useEffect, useMemo, useState } from "react";
import { track, trackOnce } from "../../lib/analytics";
import { ProgressBar } from "./ProgressBar";
import { QuestionContact } from "./QuestionContact";
import { QuestionMultipleChoice } from "./QuestionMultipleChoice";
import { QuestionScale } from "./QuestionScale";
import { QuizContainer } from "./QuizContainer";
import { QuizStep } from "./QuizStep";
import { ResultScreen } from "./ResultScreen";
import {
	type AnswersMap,
	type ContactInput,
	contactSchema,
	type QuizContent,
} from "./schema";
import { calculateScore, isHighIntent } from "./scoring";
import { useQuizState } from "./useQuizState";

type Props = {
	quiz: QuizContent;
	webhookUrl?: string;
	landingPath?: string;
};

type ContactErrors = Partial<Record<keyof ContactInput, string>>;

function getAnswerExportShape(answers: AnswersMap) {
	const out: Record<string, string | number | undefined> = {};
	for (const [k, v] of Object.entries(answers)) {
		if (v.type === "multiple-choice") out[k] = v.optionId;
		else if (v.type === "scale") out[k] = v.value;
	}
	return out;
}

function readUtm(): Record<string, string> {
	if (typeof window === "undefined") return {};
	const params = new URLSearchParams(window.location.search);
	const out: Record<string, string> = {};
	for (const key of [
		"utm_source",
		"utm_medium",
		"utm_campaign",
		"utm_term",
		"utm_content",
	]) {
		const v = params.get(key);
		if (v) out[key.replace("utm_", "")] = v;
	}
	return out;
}

function normalizeWhatsapp(raw: string): string {
	const digits = raw.replace(/\D/g, "");
	if (digits.startsWith("55")) return `+${digits}`;
	if (digits.length >= 10) return `+55${digits}`;
	return raw;
}

export default function Quiz({
	quiz,
	webhookUrl,
	landingPath = "/raio-x/perguntas",
}: Props) {
	const [state, dispatch] = useQuizState(quiz);
	const [contactErrors, setContactErrors] = useState<ContactErrors>({});
	const total = quiz.steps.length;
	const step = quiz.steps[state.currentStep];

	// quiz_started once per session
	// biome-ignore lint/correctness/useExhaustiveDependencies: trackOnce dedupes by sessionId; quiz.version captured at first call.
	useEffect(() => {
		trackOnce(`quiz_started:${state.sessionId}`, "quiz_started", {
			sessionId: state.sessionId,
			version: quiz.version,
		});
	}, [state.sessionId]);

	// quiz_step_viewed each render of new step (when idle)
	useEffect(() => {
		if (state.status !== "idle" || !step) return;
		trackOnce(
			`quiz_step:${state.sessionId}:${state.currentStep}`,
			"quiz_step_viewed",
			{
				sessionId: state.sessionId,
				step: state.currentStep,
				stepId: step.id,
			},
		);
	}, [state.currentStep, state.status, state.sessionId, step]);

	// abandon detection
	useEffect(() => {
		if (state.status !== "idle") return;
		const onLeave = () => {
			if (state.currentStep < total) {
				trackOnce(`quiz_abandoned:${state.sessionId}`, "quiz_abandoned", {
					sessionId: state.sessionId,
					lastStep: state.currentStep,
				});
			}
		};
		const visHandler = () => {
			if (document.visibilityState === "hidden") onLeave();
		};
		document.addEventListener("visibilitychange", visHandler);
		window.addEventListener("beforeunload", onLeave);
		return () => {
			document.removeEventListener("visibilitychange", visHandler);
			window.removeEventListener("beforeunload", onLeave);
		};
	}, [state.currentStep, state.sessionId, state.status, total]);

	const canAdvance = useMemo(() => {
		if (!step) return false;
		if (step.type === "contact") {
			// validation done at submit
			return Boolean(
				state.contact.name &&
					state.contact.whatsapp &&
					state.contact.email &&
					state.consentGiven,
			);
		}
		return Boolean(state.answers[step.id]);
	}, [step, state.answers, state.contact, state.consentGiven]);

	const isLast = state.currentStep === total - 1;

	const handleAnswer = (answer: AnswersMap[string]) => {
		if (!step) return;
		dispatch({ type: "SET_ANSWER", stepId: step.id, answer });
		if (answer.type === "multiple-choice") {
			track("quiz_question_answered", {
				sessionId: state.sessionId,
				stepId: step.id,
				answerId: answer.optionId,
			});
		} else if (answer.type === "scale") {
			track("quiz_question_answered", {
				sessionId: state.sessionId,
				stepId: step.id,
				answerId: String(answer.value),
			});
		}
	};

	const handleSubmit = async () => {
		const parse = contactSchema.safeParse({
			...state.contact,
			consentGiven: state.consentGiven,
		});
		if (!parse.success) {
			const errors: ContactErrors = {};
			for (const issue of parse.error.issues) {
				const field = issue.path[0] as keyof ContactInput | undefined;
				if (field) errors[field] = issue.message;
			}
			setContactErrors(errors);
			return;
		}
		setContactErrors({});

		const score = calculateScore(state.answers, quiz);
		track("quiz_completed", {
			sessionId: state.sessionId,
			score: score.total,
			intent: score.intent,
			segment: score.segment,
		});
		if (isHighIntent(score)) {
			track("high_intent_lead", {
				sessionId: state.sessionId,
				score: score.total,
				intent: score.intent,
			});
		}

		if (!webhookUrl) {
			dispatch({ type: "SUBMIT_FALLBACK", reason: "no-webhook-url" });
			track("lead_submission_failed", {
				sessionId: state.sessionId,
				errorCode: "no-webhook-url",
			});
			return;
		}

		const submittedAt = new Date().toISOString();
		const payload = {
			quizId: quiz.slug,
			quizVersion: quiz.version,
			submittedAt,
			sessionId: state.sessionId,
			answers: getAnswerExportShape(state.answers),
			contact: {
				name: parse.data.name,
				whatsapp: normalizeWhatsapp(parse.data.whatsapp),
				email: parse.data.email,
				clinicName: parse.data.clinicName ?? undefined,
				cityState: parse.data.cityState ?? undefined,
				consentGiven: true,
				consentTimestamp: submittedAt,
			},
			score,
			meta: {
				utm: readUtm(),
				referrer:
					typeof document !== "undefined" ? document.referrer : undefined,
				userAgent:
					typeof navigator !== "undefined"
						? navigator.userAgent.slice(0, 200)
						: undefined,
				landingPath,
			},
		};

		dispatch({ type: "SUBMIT_START" });

		const ctrl = new AbortController();
		const timeout = setTimeout(() => ctrl.abort(), 8000);
		try {
			const res = await fetch(webhookUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
				keepalive: true,
				signal: ctrl.signal,
			});
			clearTimeout(timeout);
			if (!res.ok) throw new Error(`http_${res.status}`);
			dispatch({ type: "SUBMIT_OK" });
			track("lead_submitted", {
				sessionId: state.sessionId,
				score: score.total,
				intent: score.intent,
			});
		} catch (err) {
			clearTimeout(timeout);
			const code = err instanceof Error ? err.message.slice(0, 60) : "unknown";
			dispatch({ type: "SUBMIT_FALLBACK", reason: code });
			track("lead_submission_failed", {
				sessionId: state.sessionId,
				errorCode: code,
			});
		}
	};

	const handleAdvance = () => {
		if (isLast) {
			void handleSubmit();
		} else {
			dispatch({ type: "NEXT" });
		}
	};

	if (state.status === "success") {
		return (
			<ResultScreen mode="success" quiz={quiz} sessionId={state.sessionId} />
		);
	}

	if (state.status === "fallback") {
		return (
			<ResultScreen
				mode="fallback"
				quiz={quiz}
				sessionId={state.sessionId}
				contact={state.contact}
				score={calculateScore(state.answers, quiz)}
				reason={state.errorMsg}
			/>
		);
	}

	if (state.status === "error") {
		return (
			<ResultScreen
				mode="error"
				quiz={quiz}
				sessionId={state.sessionId}
				reason={state.errorMsg}
				score={calculateScore(state.answers, quiz)}
				onRetry={() => dispatch({ type: "RESET_STATUS" })}
			/>
		);
	}

	if (!step) {
		return null;
	}

	return (
		<QuizContainer intro={quiz.intro}>
			<div className="flex flex-col gap-8">
				<ProgressBar current={state.currentStep + 1} total={total} />
				<QuizStep
					title={step.title}
					helperText={step.helperText}
					canBack={state.currentStep > 0}
					canAdvance={canAdvance}
					isLast={isLast}
					isSubmitting={state.status === "submitting"}
					error={
						isLast && Object.keys(contactErrors).length > 0
							? "Revise os campos destacados antes de continuar."
							: undefined
					}
					onBack={() => dispatch({ type: "BACK" })}
					onAdvance={handleAdvance}
				>
					{step.type === "multiple-choice" ? (
						<QuestionMultipleChoice
							step={step}
							value={state.answers[step.id]}
							onChange={handleAnswer}
						/>
					) : null}
					{step.type === "scale" ? (
						<QuestionScale
							step={step}
							value={state.answers[step.id]}
							onChange={handleAnswer}
						/>
					) : null}
					{step.type === "contact" ? (
						<QuestionContact
							step={step}
							contact={state.contact}
							consentGiven={state.consentGiven}
							consent={quiz.consent}
							errors={contactErrors}
							onChangeContact={(patch) =>
								dispatch({ type: "SET_CONTACT", contact: patch })
							}
							onChangeConsent={(c) =>
								dispatch({ type: "SET_CONSENT", consent: c })
							}
						/>
					) : null}
				</QuizStep>
			</div>
		</QuizContainer>
	);
}
