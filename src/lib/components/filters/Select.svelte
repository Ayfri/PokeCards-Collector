<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	interface Option {
		label: string;
		value: string;
	}

	interface Props {
		activeCondition?: boolean;
		icon?: LucideIcon;
		id: string;
		label: string;
		/**
		 * Rich content for one option and the selected value, through the customizable select (`appearance: base-select`).
		 * Browsers without it draw the plain label instead.
		 */
		option?: Snippet<[Option]>;
		options: Option[];
		placeholder?: string | undefined;
		value: string;
	}

	let {
		value = $bindable(),
		activeCondition = value !== 'all',
		icon: Icon,
		id,
		label,
		option,
		options,
		placeholder = undefined
	}: Props = $props();

	const selectClass = $derived([
		'bg-transparent border-2 cursor-pointer rounded-sm text-white h-8 px-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-gold-400',
		activeCondition ? 'border-gold-400 text-gold-400' : 'border-white',
		Icon && 'pl-8',
	]);

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		value = target.value;
	}
</script>

<div class="flex flex-col gap-1 min-w-32 flex-1">
	{#if label}
		<label class="text-xs text-gray-300" for={id}>{label}</label>
	{/if}
	<div class="relative flex">
		{#if Icon}
			<Icon class={['absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none', activeCondition ? 'text-gold-400' : 'text-gray-400']} size={16} />
		{/if}
		<!-- Two selects: the compiler flags a `<select>` holding a snippet as customizable from its template, which costs every plain select a hydration rebuild. -->
		{#if option}
			<select
				class={[
					selectClass,
					'[appearance:base-select] [&::picker(select)]:[appearance:base-select] [&::picker(select)]:mt-1 [&::picker(select)]:max-h-72 [&::picker(select)]:rounded-md [&::picker(select)]:border [&::picker(select)]:border-white/15 [&::picker(select)]:bg-gray-900 [&::picker(select)]:p-1 [&::picker(select)]:shadow-lg',
				]}
				{id}
				onchange={handleChange}
				value={value}
			>
				<button class="flex w-full items-center gap-2 text-left" type="button">
					<selectedcontent></selectedcontent>
				</button>
				{#if placeholder}
					<option disabled selected value="">{placeholder}</option>
				{/if}
				{#each options as item, index (index)}
					<option
						class="flex items-center gap-2 rounded-sm bg-gray-900 px-2 py-1.5 text-white hover:bg-white/10 checked:text-gold-400"
						value={item.value}
					>
						{@render option(item)}
					</option>
				{/each}
			</select>
		{:else}
			<select class={selectClass} {id} onchange={handleChange} value={value}>
				{#if placeholder}
					<option disabled selected value="">{placeholder}</option>
				{/if}
				{#each options as item, index (index)}
					<option class="bg-black text-white" value={item.value}>{item.label}</option>
				{/each}
			</select>
		{/if}
	</div>
</div>
