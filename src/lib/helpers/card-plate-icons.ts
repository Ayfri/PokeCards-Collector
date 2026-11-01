import type { LucideIcon } from '@lucide/svelte';
import Backpack from '@lucide/svelte/icons/backpack';
import Bone from '@lucide/svelte/icons/bone';
import CircleDot from '@lucide/svelte/icons/circle-dot';
import Cog from '@lucide/svelte/icons/cog';
import Disc3 from '@lucide/svelte/icons/disc-3';
import Droplet from '@lucide/svelte/icons/droplet';
import Eye from '@lucide/svelte/icons/eye';
import Flame from '@lucide/svelte/icons/flame';
import FlaskConical from '@lucide/svelte/icons/flask-conical';
import Gem from '@lucide/svelte/icons/gem';
import HandFist from '@lucide/svelte/icons/hand-fist';
import Heart from '@lucide/svelte/icons/heart';
import Landmark from '@lucide/svelte/icons/landmark';
import Leaf from '@lucide/svelte/icons/leaf';
import Moon from '@lucide/svelte/icons/moon';
import Rainbow from '@lucide/svelte/icons/rainbow';
import Star from '@lucide/svelte/icons/star';
import UserRoundStar from '@lucide/svelte/icons/user-round-star';
import Wrench from '@lucide/svelte/icons/wrench';
import Zap from '@lucide/svelte/icons/zap';
import Briefcase from '@lucide/svelte/icons/briefcase';

/** The icon of each lowercase energy type and Trainer kind, shared by the plate's emblem and the type badges. */
export const PLATE_ICONS: Record<string, LucideIcon> = {
	ball: CircleDot,
	colorless: Star,
	darkness: Moon,
	dragon: Gem,
	fairy: Heart,
	fighting: HandFist,
	fire: Flame,
	fossil: Bone,
	grass: Leaf,
	item: Backpack,
	lightning: Zap,
	machine: Disc3,
	metal: Cog,
	potion: FlaskConical,
	psychic: Eye,
	rainbow: Rainbow,
	stadium: Landmark,
	supporter: UserRoundStar,
	tool: Wrench,
	trainer: Briefcase,
	water: Droplet
};
