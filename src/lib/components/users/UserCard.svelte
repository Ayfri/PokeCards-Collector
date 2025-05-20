<script lang="ts">
	import Avatar from '@components/auth/Avatar.svelte';
	import CalendarDaysIcon from 'lucide-svelte/icons/calendar-days';
	import HashIcon from 'lucide-svelte/icons/hash';
	import { timeAgo } from '$helpers/dates';
	import { goto } from '$app/navigation';
    import { ChevronRight } from 'lucide-svelte';

	export let user: {
		auth_id: string;
		username: string;
		profile_color?: string | null;
		created_at: string;
		unique_card_count: number;
	};
	export let highlightClass: string = 'text-blue-300 group-hover:text-blue-300'; // Default for search
	export let hoverBorderClass: string = 'hover:border-blue-400/80';
	export let hoverShadowClass: string = 'hover:shadow-blue-500/25';
	export let countTextPrefix: string = '';
	export let countTextSuffix: string = 'unique card';

	function viewProfile(username: string) {
		goto(`/profile/${encodeURIComponent(username)}`);
	}
</script>

<a
	class="group bg-gray-800 border border-gray-700 rounded-xl overflow-hidden transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-xl {hoverBorderClass} {hoverShadowClass} cursor-pointer focus:outline-none focus:ring-0"
	aria-label={`View profile of ${user.username}`}
	href={`/profile/${encodeURIComponent(user.username)}`}
>
	<div class="p-4 flex flex-col items-center text-center space-y-1.5">
		<Avatar username={user.username} size="size-16 text-2xl" profileColor={user.profile_color} />
		<h4 class="text-lg font-semibold text-white group-hover:text-gold-400 transition-colors duration-200 truncate w-full pt-1">{user.username}</h4>
		<div class="text-sm text-gray-300 space-y-0.5">
			<p class="flex items-center justify-center gap-1.5 {highlightClass}">
				<ChevronRight size={14} />
				{countTextPrefix}{user.unique_card_count} {countTextSuffix}{user.unique_card_count !== 1 ? 's' : ''}
			</p>
			<p class="flex items-center justify-center gap-1.5 text-gray-400 text-xs">
				<CalendarDaysIcon size={12} />
				Joined {timeAgo(user.created_at)}
			</p>
		</div>
	</div>
</a>
