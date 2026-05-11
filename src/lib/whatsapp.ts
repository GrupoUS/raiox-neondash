export const WHATSAPP_SDR_E164 = "5562994705081";

export const WHATSAPP_DEFAULT_SITE_MESSAGE =
	"Olá, Laura! Gostaria de falar sobre os programas do Grupo US e qual faz sentido para o meu momento.";

export function whatsappUrlWithText(message: string): string {
	const text = encodeURIComponent(message);
	return `https://wa.me/${WHATSAPP_SDR_E164}?text=${text}`;
}

const WA_DESTINATION_RE = new RegExp(
	`^https://wa\\.me/${WHATSAPP_SDR_E164}(?:[/?].*)?$`,
);

export function isWhatsAppDestination(url: string): boolean {
	return WA_DESTINATION_RE.test(url);
}
