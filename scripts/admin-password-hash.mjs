import { createHash } from "node:crypto";

const password = process.argv[2];

if (!password) {
	console.error("Uso: bun run admin:hash-password -- \"sua-senha-forte\"");
	process.exit(1);
}

console.log(createHash("sha256").update(password).digest("hex"));
