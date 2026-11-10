<script lang="ts">
	import { page } from '$app/state';
	import PageNotice from '#components/PageNotice.svelte';
	import SearchX from '@lucide/svelte/icons/search-x';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

	const errorStatus = $derived(page.status);
	const errorMessage = $derived(page.error?.message);

	const displayTitle = $derived(errorStatus === 404 ? '404 - Page Not Found' : `Error ${errorStatus}`);
	const displayMessage = $derived(errorStatus === 404
		? "Looks like this page used Teleport, and it failed!"
		: errorMessage || 'Something went wrong on our end. Please try again later.');
</script>

<PageNotice icon={errorStatus === 404 ? SearchX : TriangleAlert} title={displayTitle}>
	{displayMessage}
</PageNotice>
