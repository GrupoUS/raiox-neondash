import { motion, useReducedMotion } from "motion/react";
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
	const prefersReducedMotion = useReducedMotion();
	return (
		<fieldset className="flex flex-col gap-3">
			<legend className="sr-only">{step.title}</legend>
			{step.options.map((opt) => {
				const checked = selectedId === opt.id;
				return (
					<motion.label
						key={opt.id}
						whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
						className={`group flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition-[border-color,background-color,box-shadow] ${
							checked
								? "border-gold bg-gold-soft text-foreground shadow-glow-gold-sm"
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
					</motion.label>
				);
			})}
		</fieldset>
	);
}
