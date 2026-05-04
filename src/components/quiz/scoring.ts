import type { AnswersMap, QuizContent } from "./schema";

export type Intent = "cold" | "warm" | "hot";
export type Segment =
	| "clinica-inicial"
	| "em-crescimento"
	| "estabelecida"
	| "pronta-para-diagnostico";

export type ScoreResult = {
	total: number; // 0..100 normalized
	rawTotal: number;
	intent: Intent;
	segment: Segment;
};

function getOptionId(answers: AnswersMap, key: string): string | undefined {
	const a = answers[key];
	if (a?.type === "multiple-choice") return a.optionId;
	return undefined;
}

export function calculateScore(
	answers: AnswersMap,
	quiz: QuizContent,
): ScoreResult {
	const rawTotal = Object.values(answers).reduce((s, a) => s + a.weight, 0);
	const max = Math.max(quiz.scoring.maxScore, 1);
	const total = Math.round((rawTotal / max) * 100);

	const { warm, hot } = quiz.scoring.thresholds;
	const intent: Intent = total >= hot ? "hot" : total >= warm ? "warm" : "cold";

	const stage = getOptionId(answers, "stage");
	const revenue = getOptionId(answers, "revenue");
	const consultancy = getOptionId(answers, "consultancyHistory");

	let segment: Segment = "clinica-inicial";
	if (
		stage === "estabelecida" &&
		(revenue === "30-80k" || revenue === "80k-mais")
	) {
		segment = "estabelecida";
	} else if (
		stage === "crescimento" &&
		(revenue === "10-30k" || revenue === "30-80k")
	) {
		segment = "em-crescimento";
	}
	if (stage === "pronta") segment = "pronta-para-diagnostico";
	if (intent === "hot" && consultancy !== "atualmente") {
		segment = "pronta-para-diagnostico";
	}

	return { total, rawTotal, intent, segment };
}

export function isHighIntent(score: ScoreResult): boolean {
	return score.intent === "hot" || score.segment === "pronta-para-diagnostico";
}
