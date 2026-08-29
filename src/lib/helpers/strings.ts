export function pascalCase(str: string): string {
	return str.replace(/(\w)(\w*)/g, (_, g1, g2) => g1.toUpperCase() + g2.toLowerCase());
}
