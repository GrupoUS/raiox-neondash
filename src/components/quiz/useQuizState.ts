import { useEffect, useMemo, useReducer } from "react";
import type {
	AnswersMap,
	AnswerValue,
	ContactInput,
	QuizContent,
} from "./schema";

const LEGACY_STORAGE_KEY = "raiox:quiz:v1";
const TTL_MS = 24 * 60 * 60 * 1000;

type Status = "idle" | "submitting" | "success" | "fallback" | "error";

export type QuizState = {
	sessionId: string;
	currentStep: number;
	answers: AnswersMap;
	contact: Partial<ContactInput>;
	consentGiven: boolean;
	status: Status;
	errorMsg?: string;
	startedAt: number;
};

export type QuizAction =
	| { type: "SET_ANSWER"; stepId: string; answer: AnswerValue }
	| { type: "SET_CONTACT"; contact: Partial<ContactInput> }
	| { type: "SET_CONSENT"; consent: boolean }
	| { type: "NEXT" }
	| { type: "BACK" }
	| { type: "GOTO"; step: number }
	| { type: "SUBMIT_START" }
	| { type: "SUBMIT_OK" }
	| { type: "SUBMIT_FALLBACK"; reason?: string }
	| { type: "SUBMIT_ERROR"; reason?: string }
	| { type: "RESET_STATUS" }
	| { type: "RESTART" }
	| { type: "HYDRATE"; state: QuizState };

function genSessionId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
	}
	return Math.random().toString(36).slice(2, 14);
}

function initialState(): QuizState {
	return {
		sessionId: genSessionId(),
		currentStep: 0,
		answers: {},
		contact: {},
		consentGiven: false,
		status: "idle",
		startedAt: Date.now(),
	};
}

function getStorageKey(quiz: QuizContent): string {
	return `raiox:quiz:${quiz.slug}:${quiz.version}`;
}

function reducer(state: QuizState, action: QuizAction): QuizState {
	switch (action.type) {
		case "SET_ANSWER":
			return {
				...state,
				answers: { ...state.answers, [action.stepId]: action.answer },
			};
		case "SET_CONTACT":
			return { ...state, contact: { ...state.contact, ...action.contact } };
		case "SET_CONSENT":
			return { ...state, consentGiven: action.consent };
		case "NEXT":
			return { ...state, currentStep: state.currentStep + 1 };
		case "BACK":
			return { ...state, currentStep: Math.max(0, state.currentStep - 1) };
		case "GOTO":
			return { ...state, currentStep: Math.max(0, action.step) };
		case "SUBMIT_START":
			return { ...state, status: "submitting", errorMsg: undefined };
		case "SUBMIT_OK":
			return { ...state, status: "success" };
		case "SUBMIT_FALLBACK":
			return { ...state, status: "fallback", errorMsg: action.reason };
		case "SUBMIT_ERROR":
			return { ...state, status: "error", errorMsg: action.reason };
		case "RESET_STATUS":
			return { ...state, status: "idle", errorMsg: undefined };
		case "RESTART":
			return initialState();
		case "HYDRATE":
			return action.state;
		default:
			return state;
	}
}

function loadPersisted(storageKey: string): QuizState | null {
	if (typeof sessionStorage === "undefined") return null;
	try {
		const raw = sessionStorage.getItem(storageKey);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { state: QuizState; savedAt: number };
		if (!parsed?.state || !parsed.savedAt) return null;
		if (Date.now() - parsed.savedAt > TTL_MS) {
			sessionStorage.removeItem(storageKey);
			return null;
		}
		// Reset terminal status on hydrate so user can resume editing.
		const status = parsed.state.status;
		const safeStatus: Status =
			status === "submitting" || status === "error" ? "idle" : status;
		return { ...parsed.state, status: safeStatus, errorMsg: undefined };
	} catch {
		return null;
	}
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(state: QuizState, storageKey: string): void {
	if (typeof sessionStorage === "undefined") return;
	if (persistTimer) clearTimeout(persistTimer);
	persistTimer = setTimeout(() => {
		try {
			sessionStorage.setItem(
				storageKey,
				JSON.stringify({ state, savedAt: Date.now() }),
			);
		} catch {
			/* quota / privacy mode */
		}
	}, 300);
}

export function clearPersistedQuiz(storageKey = LEGACY_STORAGE_KEY): void {
	if (typeof sessionStorage === "undefined") return;
	try {
		sessionStorage.removeItem(storageKey);
	} catch {
		/* noop */
	}
}

export function useQuizState(quiz: QuizContent) {
	const storageKey = useMemo(() => getStorageKey(quiz), [quiz]);
	const [state, dispatch] = useReducer(reducer, undefined, initialState);

	// Hydrate from sessionStorage once on mount.
	useEffect(() => {
		const persisted = loadPersisted(storageKey);
		if (persisted) {
			dispatch({ type: "HYDRATE", state: persisted });
		}
	}, [storageKey]);

	// Persist on change (debounced).
	useEffect(() => {
		if (state.status === "success") {
			clearPersistedQuiz(storageKey);
			return;
		}
		schedulePersist(state, storageKey);
	}, [state, storageKey]);

	return [state, dispatch] as const;
}
