<script lang="ts">
	import { pokemonKey } from '#helpers/card-search.ts';
	import { titleCase } from '#helpers/format.ts';
	import { getPokemonSpriteSrc } from '#helpers/pokemon-utils.ts';
	import type { GridPokemon } from '#lib/types.js';
	import PawPrintIcon from '@lucide/svelte/icons/paw-print';

	interface Props {
		id: string;
		label: string;
		onClear: () => void;
		/** Receives the Pokédex number as a string, the form the filter and the URL hold. */
		onPick: (numero: string) => void;
		pokemons: GridPokemon[];
		/** The applied Pokédex number, or an empty string. */
		value: string;
	}

	let { id, label, onClear, onPick, pokemons, value }: Props = $props();

	const MAX_SUGGESTIONS = 8;
	const DEBOUNCE_MS = 120;
	const listId = $props.id();

	/**
	 * What the visitor is typing, valid while the applied value is one of `owned`: the value it was typed over and the one the typing
	 * applies. Any other change (a reset, the URL) falls back to the applied Pokémon's name.
	 */
	let draft = $state<{ owned: string[]; text: string } | null>(null);
	let open = $state(false);
	let active = $state(0);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const entries = $derived(pokemons.map(pokemon => ({ key: pokemonKey(pokemon.name.toLowerCase()), name: titleCase(pokemon.name), pokemon })));
	const names = $derived(new Map(entries.map(entry => [entry.pokemon.id, entry.name])));
	/** An unknown number (a stale URL) shows as typed. */
	const appliedLabel = $derived(value ? (names.get(Number(value)) ?? value) : '');
	const shown = $derived(draft?.owned.includes(value) ? draft.text : appliedLabel);

	const suggestions = $derived.by(() => {
		const text = shown.trim();
		const digits = /^#?(\d+)$/.exec(text)?.[1];
		const matches: { name: string; pokemon: GridPokemon; rank: number }[] = [];

		if (digits !== undefined) {
			const wanted = String(Number(digits));
			for (const { name, pokemon } of entries) {
				const number = String(pokemon.id);
				if (number.startsWith(wanted)) matches.push({ name, pokemon, rank: number === wanted ? 0 : 1 });
			}
		} else if (text) {
			const key = pokemonKey(text.toLowerCase());
			for (const entry of entries) {
				const index = entry.key.indexOf(key);
				if (index >= 0) matches.push({ name: entry.name, pokemon: entry.pokemon, rank: index === 0 ? 0 : 1 });
			}
		}

		return matches.toSorted((a, b) => a.rank - b.rank || a.pokemon.id - b.pokemon.id).slice(0, MAX_SUGGESTIONS);
	});
	const listVisible = $derived(open && suggestions.length > 0);
	/** The highlighted row, kept inside the list when the matches shrink under it. */
	const current = $derived(suggestions.length > 0 ? Math.min(active, suggestions.length - 1) : -1);

	function apply(numero: string) {
		clearTimeout(timer);
		draft = null;
		open = false;
		onPick(numero);
	}

	/** A number applies as typed, a name only when it is exactly one Pokémon's; other partial text waits for a pick. */
	function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
		const text = event.currentTarget.value;
		const trimmed = text.trim();
		const digits = /^#?(\d+)$/.exec(trimmed)?.[1];
		const key = pokemonKey(trimmed.toLowerCase());
		const exact = entries.filter(entry => entry.key === key);
		const target = !trimmed ? '' : digits !== undefined ? String(Number(digits)) : exact.length === 1 ? String(exact[0].pokemon.id) : null;

		draft = { owned: target === null ? [value] : [value, target], text };
		open = true;
		active = 0;
		clearTimeout(timer);
		if (target === null || target === value) return;

		timer = setTimeout(() => (target ? onPick(target) : onClear()), DEBOUNCE_MS);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!listVisible) open = true;
			else if (suggestions.length > 0) active = (current + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
		} else if (event.key === 'Enter' && listVisible && current >= 0) {
			event.preventDefault();
			apply(String(suggestions[current].pokemon.id));
		} else if (event.key === 'Escape' && listVisible) {
			/** The drawer closes on a window Escape, which must not fire for the keypress that only closes the list. */
			event.stopPropagation();
			open = false;
		}
	}

	function handleBlur() {
		open = false;
		draft = null;
	}
</script>

<div class="flex flex-col gap-1 min-w-32 flex-1">
	<label class="text-xs text-gray-300" for={id}>{label}</label>
	<div class="relative flex">
		<PawPrintIcon
			class={['absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none', shown ? 'text-gold-400' : 'text-gray-400']}
			size={16}
		/>
		<input
			aria-activedescendant={listVisible && current >= 0 ? `${listId}-${current}` : undefined}
			aria-autocomplete="list"
			aria-controls={listId}
			aria-expanded={listVisible}
			autocomplete="off"
			class={[
				'bg-transparent border-2 rounded-sm h-8 pl-8 pr-2 text-sm w-full transition-all duration-200 focus:outline-hidden focus:border-gold-400',
				shown ? 'border-gold-400 text-gold-400' : 'border-white text-white',
			]}
			{id}
			onblur={handleBlur}
			onclick={() => (open = true)}
			oninput={handleInput}
			onkeydown={handleKeydown}
			placeholder="Name or Pokédex number..."
			role="combobox"
			spellcheck="false"
			type="text"
			value={shown}
		/>

		{#if listVisible}
			<ul
				class="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-white/15 bg-gray-900 shadow-lg"
				id={listId}
				role="listbox"
			>
				{#each suggestions as { name, pokemon }, index (pokemon.id)}
					<!-- The rows are driven from the combobox input (arrows and Enter) and pick on pointerdown, so the input keeps its focus. -->
					<li
						aria-selected={index === current}
						class={['flex cursor-pointer items-center gap-2 px-2 py-1 text-sm text-white', index === current && 'bg-white/10']}
						id="{listId}-{index}"
						onpointerdown={event => {
							event.preventDefault();
							apply(String(pokemon.id));
						}}
						onpointerenter={() => (active = index)}
						role="option"
					>
						<img alt="" class="size-8 shrink-0" height="32" loading="lazy" src={getPokemonSpriteSrc(pokemon.id)} width="32" />
						<span class="min-w-0 flex-1 truncate">{name}</span>
						<span class="shrink-0 text-xs text-gray-400 tabular-nums">#{String(pokemon.id).padStart(3, '0')}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
