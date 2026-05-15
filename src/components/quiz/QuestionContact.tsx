import type {
	ContactFieldName,
	ContactInput,
	QuizContent,
	StepContact,
} from "./schema";

type Props = {
	step: StepContact;
	contact: Partial<ContactInput>;
	consentGiven: boolean;
	consent: QuizContent["consent"];
	errors?: Partial<Record<keyof ContactInput, string>>;
	onChangeContact: (patch: Partial<ContactInput>) => void;
	onChangeConsent: (v: boolean) => void;
};

const inputType: Record<ContactFieldName, string> = {
	name: "text",
	whatsapp: "tel",
	email: "email",
	instagram: "text",
	cityState: "text",
};

const autocomplete: Record<ContactFieldName, string> = {
	name: "name",
	whatsapp: "tel",
	email: "email",
	instagram: "off",
	cityState: "address-level2",
};

export function QuestionContact({
	step,
	contact,
	consentGiven,
	consent,
	errors,
	onChangeContact,
	onChangeConsent,
}: Props) {
	return (
		<div className="flex flex-col gap-4">
			{step.fields.map((field) => {
				const value = (contact[field.name] ?? "") as string;
				const fieldError = errors?.[field.name];
				const id = `quiz_${field.name}`;
				return (
					<div key={field.name} className="flex flex-col gap-1.5">
						<label htmlFor={id} className="text-sm font-medium text-foreground">
							{field.label}
							{field.required ? (
								<span aria-hidden="true" className="text-gold ml-1">
									*
								</span>
							) : null}
						</label>
						<input
							id={id}
							type={inputType[field.name]}
							value={value}
							onChange={(e) =>
								onChangeContact({ [field.name]: e.target.value })
							}
							placeholder={field.placeholder}
							required={field.required}
							autoComplete={autocomplete[field.name]}
							aria-invalid={fieldError ? "true" : undefined}
							aria-describedby={fieldError ? `${id}_err` : undefined}
							className="rounded-lg border border-navy-lighter bg-navy-light px-4 py-3 text-base text-foreground placeholder:text-muted/70 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
						/>
						{fieldError ? (
							<span id={`${id}_err`} className="text-xs text-gold">
								{fieldError}
							</span>
						) : null}
					</div>
				);
			})}

			<label className="mt-2 flex cursor-pointer items-start gap-3 text-sm text-muted">
				<input
					type="checkbox"
					checked={consentGiven}
					onChange={(e) => onChangeConsent(e.target.checked)}
					required
					aria-invalid={
						errors?.consentGiven && !consentGiven ? "true" : undefined
					}
					className="mt-1 h-4 w-4 accent-gold"
				/>
				<span>
					{consent.label}{" "}
					<a
						href={consent.privacyPolicyHref}
						target="_blank"
						rel="noopener noreferrer"
						className="text-gold underline-offset-2 hover:underline"
					>
						{consent.linkText}
					</a>
					.
				</span>
			</label>
			{errors?.consentGiven && !consentGiven ? (
				<span className="text-xs text-gold">{errors.consentGiven}</span>
			) : null}
		</div>
	);
}
