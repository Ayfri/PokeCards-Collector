<script lang="ts">
	import Avatar from '@components/auth/Avatar.svelte';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import { timeAgo } from '$helpers/dates';

	interface Props {
		user: {
		auth_id: string;
		username: string;
		profile_color?: string | null;
		created_at: string;
		unique_card_count: number;
	};
		highlightClass?: string; // Default for search
		hoverBorderClass?: string;
		hoverShadowClass?: string;
		countTextPrefix?: string;
		countTextSuffix?: string;
	}

	let {
		user,
		highlightClass = 'text-blue-300 group-hover:text-blue-300',
		hoverBorderClass = 'hover:border-blue-400/80',
		hoverShadowClass = 'hover:shadow-blue-500/25',
		countTextPrefix = '',
		countTextSuffix = 'unique card'
	}: Props = $props();
</script>

<a
	class="group bg-gray-800 border border-gray-700 rounded-xl overflow-hidden transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-xl {hoverBorderClass} {hoverShadowClass} cursor-pointer focus:outline-hidden focus:ring-0"
	aria-label={`View profile of ${user.username}`}
	href={`/profile/${encodeURIComponent(user.username)}`}
	title={`View profile of ${user.username}`}
>
	<div class="p-4 flex flex-col items-center text-center space-y-1.5">
		<Avatar username={user.username} size="size-16 text-2xl" profileColor={user.profile_color} />
		<h3 class="text-lg font-semibold text-white group-hover:text-gold-400 transition-colors duration-200 truncate w-full pt-1">{user.username}</h3>
		<div class="text-sm text-gray-300 space-y-0.5">
			<p class="flex items-center justify-center gap-1.5 {highlightClass}" title={`${user.unique_card_count} unique cards collected`}>
				<LayersIcon size={14} />
				{countTextPrefix}{user.unique_card_count} {countTextSuffix}{user.unique_card_count !== 1 ? 's' : ''}
			</p>
			<p class="flex items-center justify-center gap-1.5 text-gray-400 text-xs" title={`Joined on ${new Date(user.created_at).toLocaleDateString()}`}>
				<CalendarDaysIcon size={12} />
				Joined {timeAgo(user.created_at)}
			</p>
		</div>
	</div>
</a>
