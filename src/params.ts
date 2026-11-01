import {defineParams} from '@sveltejs/kit/params';
import {BY_GRID, BY_ROUTE_CODE} from '#helpers/catalogues.ts';

function isKey<T extends object>(table: T, param: string): param is Extract<keyof T, string> {
	return Object.hasOwn(table, param);
}

export const params = defineParams({
	catalogue: (param) => (isKey(BY_ROUTE_CODE, param) ? param : undefined),
	catalogueGrid: (param) => (isKey(BY_GRID, param) ? param : undefined),
	/** A card code always holds `_` and a slug never does, so the codes that predate the slugs get their redirect route and the slugs fall through to the page. */
	cardCode: (param) => (param.includes('_') ? param : undefined),
});
