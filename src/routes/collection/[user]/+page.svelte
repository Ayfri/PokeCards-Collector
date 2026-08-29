<script lang="ts">
	import UserCardsView from '@components/list/UserCardsView.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<UserCardsView {data} kind="collection" />
