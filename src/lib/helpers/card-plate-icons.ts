import type { LucideIcon } from '@lucide/svelte';
import Backpack from '@lucide/svelte/icons/backpack';
import Bone from '@lucide/svelte/icons/bone';
import Briefcase from '@lucide/svelte/icons/briefcase';
import CircleDot from '@lucide/svelte/icons/circle-dot';
import Disc3 from '@lucide/svelte/icons/disc-3';
import FlaskConical from '@lucide/svelte/icons/flask-conical';
import Landmark from '@lucide/svelte/icons/landmark';
import Rainbow from '@lucide/svelte/icons/rainbow';
import UserRoundStar from '@lucide/svelte/icons/user-round-star';
import Wrench from '@lucide/svelte/icons/wrench';

/** The icon of each lowercase Trainer kind, plus the rainbow of a Special Energy with no type. Energy types draw their `TYPE_SYMBOLS` glyph instead. */
export const PLATE_ICONS: Record<string, LucideIcon> = {
	ball: CircleDot,
	fossil: Bone,
	item: Backpack,
	machine: Disc3,
	potion: FlaskConical,
	rainbow: Rainbow,
	stadium: Landmark,
	supporter: UserRoundStar,
	tool: Wrench,
	trainer: Briefcase
};
