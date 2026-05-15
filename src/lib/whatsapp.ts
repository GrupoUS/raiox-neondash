export const WHATSAPP_SDR_E164 = "5562994705081";

export const WHATSAPP_DEFAULT_SITE_MESSAGE =
	"Olá, Laura! Gostaria de falar sobre os programas do Grupo US e qual faz sentido para o meu momento.";

export const RAIO_X_WHATSAPP_MESSAGE =
	"Olá, quero agendar minha Sessão Raio-X!";

export const RAIO_X_WHATSAPP_E164_DESTINATIONS = [WHATSAPP_SDR_E164] as const;

export function normalizeWhatsappToE164(raw: string): string {
	const digits = raw.replace(/\D/g, "");
	if (digits.startsWith("55")) return digits;
	if (digits.length >= 10) return `55${digits}`;
	return digits;
}

function whatsappUrlWithNumber(
	destinationE164: string,
	message: string,
): string {
	const text = encodeURIComponent(message);
	return `https://wa.me/${destinationE164}?text=${text}`;
}

export function whatsappUrlWithText(message: string): string {
	return whatsappUrlWithNumber(WHATSAPP_SDR_E164, message);
}

export function raioXWhatsappUrls(): string[] {
	return RAIO_X_WHATSAPP_E164_DESTINATIONS.map((destination) =>
		whatsappUrlWithNumber(destination, RAIO_X_WHATSAPP_MESSAGE),
	);
}

export function whatsappUrlForLead(
	rawWhatsapp: string,
	message: string,
): string {
	return whatsappUrlWithNumber(normalizeWhatsappToE164(rawWhatsapp), message);
}

const WHATSAPP_DESTINATIONS = new Set([
	WHATSAPP_SDR_E164,
	...RAIO_X_WHATSAPP_E164_DESTINATIONS,
]);
const WA_DESTINATION_RE = /^https:\/\/wa\.me\/(\d+)(?:[/?].*)?$/;

export function isWhatsAppDestination(url: string): boolean {
	const match = url.match(WA_DESTINATION_RE);
	return Boolean(match?.[1] && WHATSAPP_DESTINATIONS.has(match[1]));
}
