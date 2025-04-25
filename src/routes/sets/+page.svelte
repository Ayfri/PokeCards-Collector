<script lang="ts">
	import type { PageData } from './$types';
	import { NO_IMAGES } from '$lib/images';
	import SortControl from '$lib/components/filters/SortControl.svelte';
	import PageTitle from '$lib/components/PageTitle.svelte';
	import TextInput from '$lib/components/filters/TextInput.svelte';
	import type { Set } from '$lib/types';
	import { persistentWritable } from '$stores/persistentStore';
	export let data: PageData;
	
	type SetWithPrice = Set & { totalPrice: number; };
	
	let sortDirection = persistentWritable<'desc' | 'asc'>('sortDirection', 'desc');
	let sortValue = persistentWritable<'code' | 'name' | 'printedTotal' | 'releaseDate' | 'totalPrice'>('sortValue', 'releaseDate');
	
	$: typedSets = data.sets;
	let sortedSets = data.sets;
	
	let searchTerm = '';
	let debounceTimeout: number;

	function debounce(fn: Function, delay: number) {
		return (...args: any[]) => {
			clearTimeout(debounceTimeout);
			debounceTimeout = window.setTimeout(() => {
				fn(...args);
			}, delay);
		};
	}

	const debouncedSetSearchTerm = debounce((value: string) => {
		searchTerm = value;
	}, 300);

	$: if (sortValue && sortDirection && typedSets) {
		if ($sortValue === 'code') {
			sortedSets = [...typedSets].sort((a, b) => {
				const codeA = a.ptcgoCode || '';
				const codeB = b.ptcgoCode || '';
				return $sortDirection === 'desc' ? codeB.localeCompare(codeA) : codeA.localeCompare(codeB);
			});
		} else if ($sortValue === 'name') {
			sortedSets = [...typedSets].sort((a, b) => {
				return $sortDirection === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
			});
		}  else if ($sortValue === 'printedTotal') {
			sortedSets = [...typedSets].sort((a, b) => {
				return $sortDirection === 'desc' ? b.printedTotal - a.printedTotal : a.printedTotal - b.printedTotal;
			});
		} else if ($sortValue === 'releaseDate') {
			sortedSets = [...typedSets].sort((a, b) => {
				const aTime = new Date(a.releaseDate).getTime();
				const bTime = new Date(b.releaseDate).getTime();
				return $sortDirection === 'desc' ? bTime - aTime : aTime - bTime;
			});
		} else if ($sortValue === 'totalPrice') {
			sortedSets = [...typedSets].sort((a, b) => {
				return $sortDirection === 'desc' ? b.totalPrice - a.totalPrice : a.totalPrice - b.totalPrice;
			});
		}
	}
	
	$: filteredSets = searchTerm 
		? sortedSets.filter(set => 
			set.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
			(set.ptcgoCode && set.ptcgoCode.toLowerCase().includes(searchTerm.toLowerCase()))
		) 
		: sortedSets;

	$: groupedSets = filteredSets.reduce((acc, set) => {
		const series = set.series || 'Other';
		acc[series] ??= [];
		acc[series].push(set);
		return acc;
	}, {} as Record<string, SetWithPrice[]>);

	$: seriesKeys = Object.keys(groupedSets).sort((a, b) => {
		const firstSetA = groupedSets[a][0];
		const firstSetB = groupedSets[b][0];
		
		if ($sortValue === 'code') {
			const codeA = firstSetA.ptcgoCode || '';
			const codeB = firstSetB.ptcgoCode || '';
			return $sortDirection === 'desc' ? codeB.localeCompare(codeA) : codeA.localeCompare(codeB);
		} else if ($sortValue === 'name') {
			return $sortDirection === 'desc' ? b.localeCompare(a) : a.localeCompare(b);
		} else if ($sortValue === 'printedTotal') {
			return $sortDirection === 'desc' ? firstSetB.printedTotal - firstSetA.printedTotal : firstSetA.printedTotal - firstSetB.printedTotal;
		} else if ($sortValue === 'releaseDate') {
			const aTime = new Date(firstSetA.releaseDate).getTime();
			const bTime = new Date(firstSetB.releaseDate).getTime();
			return $sortDirection === 'desc' ? bTime - aTime : aTime - bTime;
		} else if ($sortValue === 'totalPrice') {
			return $sortDirection === 'desc' ? firstSetB.totalPrice - firstSetA.totalPrice : firstSetA.totalPrice - firstSetB.totalPrice;
		}
		return 0;
	});
	
	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex flex-col sm:flex-row items-center justify-between">
		<PageTitle title="Sets" />

		<div class="flex items-center gap-2">
			<div class="w-48">
				<TextInput
					id="setSearch"
					label="Search"
					bind:value={searchTerm}
					placeholder="Search sets..."
					debounceFunction={debouncedSetSearchTerm}
				/>
			</div>
			<SortControl
			bind:sortDirection={$sortDirection}
			bind:sortValue={$sortValue}
			options={[
				{ value: 'code', label: 'Code' },
				{ value: 'name', label: 'Name' },
				{ value: 'printedTotal', label: 'Total Cards' },
				{ value: 'totalPrice', label: 'Total Value' },
				{ value: 'releaseDate', label: 'Release Date' }
			]}
			/>
		</div>
	</div>
	<hr class="w-full border-t-[3px] border-gold-400 my-4" />

	<p class="text-gray-400 mb-6">
		Sets are collections of cards that are released together.<br>
		<span class="text-sm">Showing {filteredSets.length} of {sortedSets.length} sets.</span>
	</p>

	{#each seriesKeys as series}
		<div class="mb-8">
			<div class="mb-4">
				<div class="flex items-center gap-4">
					<h2 class="text-xl font-bold text-gold-400">{series}</h2>
					<p class="text-sm text-gray-400">{groupedSets[series].length} sets</p>
					<p class="text-sm text-gold-400 ml-auto">{formatCurrency(groupedSets[series].reduce((acc, set) => acc + set.totalPrice, 0))}</p>
				</div>
				<hr class="w-full border-t border-gray-700 my-2" />
			</div>
			
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{#each groupedSets[series] as set}
					<a href="/?set={encodeURIComponent(set.name)}" class="block h-full">
						<div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-[-4px] border border-transparent hover:border-gold-400 h-full flex flex-col">
							<div class="h-36 bg-gray-900 flex items-center justify-center p-4 {NO_IMAGES ? 'hidden' : ''}">
								{#if set.logo}
									<img src={set.logo} alt="{set.name} logo" class="max-h-full object-contain" loading="lazy" />
								{:else}
									<div class="text-gray-500 text-center">No image available</div>
								{/if}
							</div>
							<div class="p-4 flex-1 flex flex-col">
								<h2 class="text-lg font-semibold text-white">{set.name}</h2>
								<div class="flex justify-between mt-2 text-sm text-gray-400">
									<span>{set.printedTotal} cards</span>
									<span class="text-gold-400">{formatCurrency(set.totalPrice)}</span>
								</div>
								<div class="flex justify-between mt-1 text-sm text-gray-400">
									<span>{new Date(set.releaseDate).toLocaleDateString()}</span>
									{#if set.ptcgoCode}
										<span class="px-2 py-1 bg-gray-700 rounded text-gold-400 text-xs">{set.ptcgoCode}</span>
									{:else}
										<span class="px-2 py-1 bg-transparent">&nbsp;</span>
									{/if}
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/each}
</div>
