type RuntimeProcess = {
	env?: Record<string, string | undefined>;
};

export function getServerEnv(name: string): string | undefined {
	const runtimeEnv = (globalThis as unknown as { process?: RuntimeProcess })
		.process?.env?.[name];
	const buildEnv = import.meta.env[name] as string | undefined;
	const value = runtimeEnv ?? buildEnv;
	return value && value.length > 0 ? value : undefined;
}

export function getMissingEnv(names: string[]): string[] {
	return names.filter((name) => !getServerEnv(name));
}
