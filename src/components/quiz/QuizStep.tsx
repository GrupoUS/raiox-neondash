import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
	title: string;
	helperText?: string;
	canBack: boolean;
	canAdvance: boolean;
	isLast: boolean;
	isSubmitting: boolean;
	error?: string;
	onBack: () => void;
	onAdvance: () => void;
	children: ReactNode;
};

export function QuizStep({
	title,
	helperText,
	canBack,
	canAdvance,
	isLast,
	isSubmitting,
	error,
	onBack,
	onAdvance,
	children,
}: Props) {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h2 className="font-serif text-2xl leading-tight text-foreground sm:text-3xl">
					{title}
				</h2>
				{helperText ? (
					<p className="mt-2 text-sm text-muted">{helperText}</p>
				) : null}
			</div>

			<div>{children}</div>

			{error ? (
				<div
					role="alert"
					className="rounded-lg border border-gold/40 bg-gold-soft px-4 py-3 text-sm text-foreground"
				>
					{error}
				</div>
			) : null}

			<div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
				<button
					type="button"
					onClick={onBack}
					disabled={!canBack || isSubmitting}
					className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-5 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
				>
					<ArrowLeft className="h-4 w-4" aria-hidden="true" />
					Voltar
				</button>
				<button
					type="button"
					onClick={onAdvance}
					disabled={!canAdvance || isSubmitting}
					className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3 text-base font-semibold text-navy transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-gold-light active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isSubmitting
						? "Enviando..."
						: isLast
							? "Receber meu diagnóstico"
							: "Continuar"}
					{!isSubmitting ? (
						<ArrowRight className="h-4 w-4" aria-hidden="true" />
					) : null}
				</button>
			</div>
		</div>
	);
}
