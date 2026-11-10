<script lang="ts">
	import { resolve } from '$app/paths';
	import Avatar from '#components/auth/Avatar.svelte';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import { timeAgo } from '#helpers/format.ts';

	interface Props {
		user: {
		created_at: string;
		profile_color?: string | null;
		unique_card_count: number;
		username: string;
	};
	}

	let { user }: Props = $props();
</script>

<a
	aria-label={`View profile of ${user.username}`}
	class="group bg-gray-800 border border-gray-700 rounded-xl overflow-hidden transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-xl hover:border-gold-400/70 hover:shadow-gold-400/30 cursor-pointer focus-ring"
	href={resolve('/profile/[user]', { user: encodeURIComponent(user.username) })}
	title={`View profile of ${user.username}`}
>
	<div class="p-4 flex flex-col items-center text-center space-y-1.5">
		<Avatar class="size-16 text-2xl" profileColor={user.profile_color} username={user.username} />
		<h3 class="text-lg font-semibold text-white group-hover:text-gold-400 transition-colors duration-200 truncate w-full pt-1">{user.username}</h3>
		<div class="text-sm text-gray-300 space-y-0.5">
			<p class="flex items-center justify-center gap-1.5 text-gold-400 group-hover:text-gold-300" title={`${user.unique_card_count} unique cards collected`}>
				<LayersIcon size={14} />
				{user.unique_card_count} unique card{user.unique_card_count !== 1 ? 's' : ''}
			</p>
			<p class="flex items-center justify-center gap-1.5 text-gray-400 text-xs" title={`Joined on ${new Date(user.created_at).toLocaleDateString()}`}>
				<CalendarDaysIcon size={12} />
				Joined {timeAgo(user.created_at)}
			</p>
		</div>
	</div>
</a>
