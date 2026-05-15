import type { AnswersMap, QuizContent } from "./schema";

export type Intent = "cold" | "warm" | "hot";
export type Segment =
	| "gargalo-gestao"
	| "gargalo-marketing"
	| "gargalo-vendas"
	| "gargalos-distribuidos";

export type ScoreResult = {
	total: number; // 0..100 normalized
	rawTotal: number;
	intent: Intent;
	segment: Segment;
};

const SEGMENT_BY_SCORE_FIELD: Record<string, Segment> = {
	gestao: "gargalo-gestao",
	marketing: "gargalo-marketing",
	vendas: "gargalo-vendas",
};

type PillarScore = {
	raw: number;
	max: number;
	ratio: number;
};

function getStepMaxWeight(step: QuizContent["steps"][number]): number {
	if (step.type === "multiple-choice") {
		return Math.max(...step.options.map((option) => option.weight), 0);
	}
	if (step.type === "scale") {
		return Math.max(...step.scale.weights, 0);
	}
	return 0;
}

function calculatePillarScores(
	answers: AnswersMap,
	quiz: QuizContent,
): Record<string, PillarScore> {
	const scores: Record<string, PillarScore> = {};

	for (const step of quiz.steps) {
		if (step.type === "contact") continue;

		const field = step.scoreField;
		const existing = scores[field] ?? { raw: 0, max: 0, ratio: 0 };
		const answer = answers[step.id];
		const raw = existing.raw + (answer?.weight ?? 0);
		const max = existing.max + getStepMaxWeight(step);
		scores[field] = {
			raw,
			max,
			ratio: max > 0 ? raw / max : 0,
		};
	}

	return scores;
}

function getDominantSegment(scores: Record<string, PillarScore>): Segment {
	const ranked = Object.entries(scores)
		.filter(([field]) => field in SEGMENT_BY_SCORE_FIELD)
		.sort((a, b) => b[1].ratio - a[1].ratio);

	if (ranked.length === 0) return "gargalos-distribuidos";

	const [topField, topScore] = ranked[0];
	const secondScore = ranked[1]?.[1];

	if (!secondScore || topScore.ratio > secondScore.ratio) {
		return SEGMENT_BY_SCORE_FIELD[topField] ?? "gargalos-distribuidos";
	}

	return "gargalos-distribuidos";
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
	const segment = getDominantSegment(calculatePillarScores(answers, quiz));

	return { total, rawTotal, intent, segment };
}

export function isHighIntent(score: ScoreResult): boolean {
	return score.intent === "hot";
}
