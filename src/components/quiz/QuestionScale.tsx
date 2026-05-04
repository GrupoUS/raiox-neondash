import type { AnswerValue, StepScale } from "./schema";

type Props = {
	step: StepScale;
	value?: AnswerValue;
	onChange: (answer: AnswerValue) => void;
};

export function QuestionScale({ step, value, onChange }: Props) {
	const current = value?.type === "scale" ? value.value : undefined;
	const { min, max, minLabel, maxLabel, weights } = step.scale;
	const points: number[] = [];
	for (let i = min; i <= max; i++) points.push(i);
	const groupName = `q_${step.id}`;
	return (
		<fieldset className="flex flex-col gap-4">
			<legend className="sr-only">{step.title}</legend>
			<div className="flex justify-between gap-2">
				{points.map((n, idx) => {
					const checked = current === n;
					const weight = weights[idx] ?? 0;
					return (
						<label
							key={n}
							className={`flex flex-1 cursor-pointer flex-col items-center gap-2 rounded-xl border px-2 py-4 text-center transition-colors ${
								checked
									? "border-gold bg-gold-soft text-foreground"
									: "border-navy-lighter bg-navy-light text-muted hover:border-gold/60"
							}`}
						>
							<input
								type="radio"
								name={groupName}
								value={n}
								checked={checked}
								onChange={() => onChange({ type: "scale", value: n, weight })}
								className="sr-only"
							/>
							<span className="font-serif text-2xl font-semibold">{n}</span>
						</label>
					);
				})}
			</div>
			<div className="flex justify-between text-xs uppercase tracking-[0.14em] text-muted">
				<span>{minLabel}</span>
				<span>{maxLabel}</span>
			</div>
		</fieldset>
	);
}
