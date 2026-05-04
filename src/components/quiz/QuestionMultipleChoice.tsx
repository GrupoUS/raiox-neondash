import type { AnswerValue, StepMultipleChoice } from "./schema";

type Props = {
	step: StepMultipleChoice;
	value?: AnswerValue;
	onChange: (answer: AnswerValue) => void;
};

export function QuestionMultipleChoice({ step, value, onChange }: Props) {
	const selectedId =
		value?.type === "multiple-choice" ? value.optionId : undefined;
	const groupName = `q_${step.id}`;
	return (
		<fieldset className="flex flex-col gap-3">
			<legend className="sr-only">{step.title}</legend>
			{step.options.map((opt) => {
				const checked = selectedId === opt.id;
				return (
					<label
						key={opt.id}
						className={`group flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition-colors ${
							checked
								? "border-gold bg-gold-soft text-foreground"
								: "border-navy-lighter bg-navy-light text-muted hover:border-gold/60 hover:bg-navy-light/80"
						}`}
					>
						<input
							type="radio"
							name={groupName}
							value={opt.id}
							checked={checked}
							onChange={() =>
								onChange({
									type: "multiple-choice",
									optionId: opt.id,
									weight: opt.weight,
								})
							}
							className="mt-1 h-4 w-4 accent-gold"
						/>
						<span className="text-sm leading-relaxed sm:text-base">
							{opt.label}
						</span>
					</label>
				);
			})}
		</fieldset>
	);
}
