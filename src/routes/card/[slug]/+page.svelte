<script lang="ts">
	import type { PageData } from './$types';
	import CardDisplay from '#components/card/CardDisplay.svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<div class="max-w-[100vw] p-4 mb-4 text-lg text-white">
	<div class="mt-4 mx-auto flex flex-col gap-8 w-[90%] -z-10">
		{#key data.prints[0].cardCode}
			<div in:fade={{ duration: 300 }}>
				<CardDisplay
					lowRes={true}
					neighbours={data.neighbours}
					pokemonPaths={data.pokemonPaths}
					pokemons={data.pokemons}
					prices={data.prices}
					prints={data.prints}
					sets={data.sets}
					versions={data.versions}
				/>
			</div>
		{/key}
	</div>
</div>
