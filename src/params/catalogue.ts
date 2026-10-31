import { BY_ROUTE_CODE } from '$helpers/catalogues';

export function match(param: string): param is keyof typeof BY_ROUTE_CODE {
	return Object.hasOwn(BY_ROUTE_CODE, param);
}
