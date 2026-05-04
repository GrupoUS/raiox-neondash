type Props = { current: number; total: number };

export function ProgressBar({ current, total }: Props) {
	const safeTotal = Math.max(total, 1);
	const ratio = Math.min(Math.max(current / safeTotal, 0), 1);
	return (
		<div className="w-full">
			<div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted mb-2">
				<span>
					Etapa {Math.min(current, safeTotal)} de {safeTotal}
				</span>
				<span aria-hidden="true">{Math.round(ratio * 100)}%</span>
			</div>
			<div
				className="relative h-1.5 w-full overflow-hidden rounded-full bg-navy-light"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={safeTotal}
				aria-valuenow={Math.min(current, safeTotal)}
			>
				<div
					className="absolute left-0 top-0 h-full w-full origin-left rounded-full bg-gold transition-transform duration-300 ease-out"
					style={{ transform: `scaleX(${ratio})` }}
				/>
			</div>
		</div>
	);
}
