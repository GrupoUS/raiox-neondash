interface BreadcrumbItem {
	name: string;
	url: string;
}

export function buildOrganizationSchema(siteUrl: string) {
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: "Grupo US",
		url: siteUrl,
		logo: `${siteUrl}/favicon.svg`,
		contactPoint: {
			"@type": "ContactPoint",
			telephone: "+55 62 9470-5081",
			contactType: "sales",
			areaServed: "BR",
			availableLanguage: ["Portuguese"],
		},
	};
}

export function buildBreadcrumbSchema(
	items: BreadcrumbItem[],
	siteUrl: string,
) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			item: item.url.startsWith("http") ? item.url : `${siteUrl}${item.url}`,
		})),
	};
}

export type { BreadcrumbItem };
