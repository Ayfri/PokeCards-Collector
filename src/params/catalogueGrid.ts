import { BY_GRID } from '$helpers/catalogues';

export function match(param: string): param is keyof typeof BY_GRID {
	return Object.hasOwn(BY_GRID, param);
}
