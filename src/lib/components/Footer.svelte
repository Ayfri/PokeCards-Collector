<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import BinderIcon from '@lucide/svelte/icons/book-open';
	import BugIcon from '@lucide/svelte/icons/bug';
	import CardStackIcon from '@lucide/svelte/icons/layers';
	import LibraryIcon from '@lucide/svelte/icons/library';
	import PokedexIcon from '@lucide/svelte/icons/paw-print';
	import ShuffleIcon from '@lucide/svelte/icons/shuffle';
	import TrainersIcon from '@lucide/svelte/icons/backpack';
	import Flag from '#components/Flag.svelte';
	import type { Language } from '#helpers/catalogues.ts';
	import { NO_IMAGES } from '#helpers/card-images.ts';
	import { SITE_NAME } from '#src/constants.ts';
	import pokecardsCollector from '#src/assets/pokecards-collector.png';

	interface FooterLink {
		href: string;
		name: string;
		/** Drawn in place of `icon` for the catalogue entries. */
		flag?: Language;
		icon?: LucideIcon;
	}

	/** Same routes and icons as the header's Browse menu. */
	const exploreLinks: FooterLink[] = [
		{ href: '/cards-list', icon: CardStackIcon, name: 'Cards' },
		{ href: '/sets', icon: LibraryIcon, name: 'Sets' },
		{ href: '/pokemons', icon: PokedexIcon, name: 'Pokémon' },
		{ href: '/trainers', icon: TrainersIcon, name: 'Trainers & Energy' },
		{ flag: 'ja', href: '/japan', name: 'Japan' },
		{ flag: 'fr', href: '/france', name: 'France' },
		{ href: '/binder', icon: BinderIcon, name: 'Binder' },
	];

	const authors: FooterLink[] = [
		{ href: 'https://github.com/Ayfri', name: 'Ayfri' },
		{ href: 'https://github.com/antaww', name: 'Anta' },
		{ href: 'https://github.com/Bahsiik', name: 'Bahsiik' },
	];

	const repositoryUrl = 'https://github.com/Ayfri/PokeCards-Collector';
	const discordInviteUrl = 'https://discord.com/invite/7c7nzHqxJx';
	const year = new Date().getFullYear();

	const linkClass = 'group flex w-fit items-center gap-2 text-gray-300 transition-colors duration-200 hover:text-gold-400';
	const iconClass = 'shrink-0 text-gold-400/70 transition-colors duration-200 group-hover:text-gold-400';
	const smallLinkClass = 'underline decoration-gray-600 underline-offset-2 transition-colors duration-200 hover:text-gold-400';
	const titleClass = 'mb-2 text-sm font-bold tracking-wider text-gold-300 uppercase';
</script>

{#snippet external(href: string, label: string, className: string)}
	<a class={className} {href} rel="noopener noreferrer" target="_blank">{label}</a>
{/snippet}

<footer class="relative mx-2 mt-10 mb-2 rounded-3xl bg-gray-800 px-5 py-4 text-sm text-gray-300 sm:py-5 lg:px-8">
	<div class="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-gold-400 to-transparent"></div>

	<div class="grid gap-x-8 gap-y-4 sm:grid-cols-2 sm:gap-y-5 lg:grid-cols-[1.4fr_1fr_1fr]">
		<div class="flex flex-col items-start gap-1.5 sm:col-span-2 lg:col-span-1">
			<a class="flex items-center gap-2" href="/">
				{#if !NO_IMAGES}
					<img alt="" class="aspect-square h-8 w-8 object-contain" height="32" loading="lazy" src={pokecardsCollector} width="32" />
				{/if}
				<span class="text-lg font-bold text-gold-400">{SITE_NAME}</span>
			</a>
			<p>Track, price and collect every Pokémon TCG card.</p>
			<a
				class="my-1 inline-flex items-center gap-2 rounded-full bg-gold-400 px-4 py-1.5 font-semibold text-black transition-colors duration-200 hover:bg-gold-300"
				href="/random"
			>
				<ShuffleIcon aria-hidden="true" size={16} />
				Random Card
			</a>
			<p class="flex flex-wrap gap-x-1">
				<span>Made with ❤️ by</span>
				{#each authors as author, index (author.name)}
					<span>{@render external(author.href, author.name, 'font-semibold text-gray-200 transition-colors duration-200 hover:text-gold-400')}{index < authors.length - 1 ? ',' : ''}</span>
				{/each}
			</p>
		</div>

		<nav aria-label="Explore">
			<h2 class={titleClass}>Explore</h2>
			<ul class="grid grid-cols-2 gap-x-4 gap-y-1.5">
				{#each exploreLinks as link (link.href)}
					<li>
						<a class={linkClass} href={link.href}>
							{#if link.flag}
								<Flag class="h-[11px] w-4 shrink-0 rounded-[2px]" language={link.flag} />
							{:else if link.icon}
								<link.icon aria-hidden="true" class={iconClass} size={16} />
							{/if}
							{link.name}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<nav aria-label="Community">
			<h2 class={titleClass}>Community</h2>
			<ul class="flex flex-wrap gap-x-4 gap-y-1.5 sm:flex-col">
				<li>
					<a class={linkClass} href={repositoryUrl} rel="noopener noreferrer" target="_blank">
						<svg aria-hidden="true" class={iconClass} fill="currentColor" height="16" viewBox="0 0 24 24" width="16">
							<path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
						</svg>
						GitHub
					</a>
				</li>
				<li>
					<a class={linkClass} href={discordInviteUrl} rel="noopener noreferrer" target="_blank">
						<svg aria-hidden="true" class={iconClass} fill="currentColor" height="16" viewBox="0 0 24 24" width="16">
							<path d="M20.317 4.369A19.791 19.791 0 0 0 16.885 3.2a.077.077 0 0 0-.082.038c-.357.63-.755 1.453-1.037 2.104a18.524 18.524 0 0 0-5.49 0 12.683 12.683 0 0 0-1.05-2.104.077.077 0 0 0-.082-.038A19.736 19.736 0 0 0 3.677 4.369a.069.069 0 0 0-.03.027C.533 9.09-.32 13.579.099 18.021a.082.082 0 0 0 .031.056c2.104 1.548 4.144 2.488 6.138 3.115a.077.077 0 0 0 .084-.027c.472-.65.893-1.34 1.248-2.066a.076.076 0 0 0-.041-.104c-.669-.252-1.304-.558-1.917-.892a.077.077 0 0 1-.008-.128c.129-.098.258-.2.381-.304a.074.074 0 0 1 .077-.01c4.014 1.83 8.36 1.83 12.326 0a.073.073 0 0 1 .078.009c.123.104.252.206.381.304a.077.077 0 0 1-.006.128 12.298 12.298 0 0 1-1.918.892.076.076 0 0 0-.04.105c.36.726.78 1.416 1.247 2.066a.076.076 0 0 0 .084.028c1.995-.627 4.036-1.567 6.139-3.115a.077.077 0 0 0 .031-.055c.5-5.177-.838-9.637-3.548-13.625a.061.061 0 0 0-.03-.028ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.213 0 2.177 1.095 2.157 2.418 0 1.334-.955 2.419-2.157 2.419Zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.213 0 2.177 1.095 2.157 2.418 0 1.334-.944 2.419-2.157 2.419Z" />
						</svg>
						Discord
					</a>
				</li>
				<li>
					<a class={linkClass} href="{repositoryUrl}/issues" rel="noopener noreferrer" target="_blank">
						<BugIcon aria-hidden="true" class={iconClass} size={16} />
						Report a bug
					</a>
				</li>
			</ul>
		</nav>
	</div>

	<div class="mt-3 flex flex-col items-center gap-2 border-t border-gray-700 pt-3 text-center text-[11px] leading-snug text-gray-400 sm:flex-row sm:items-end sm:justify-between sm:text-left">
		<div class="flex flex-col gap-0.5">
			<p>
				Data: {@render external('https://tcgdex.dev', 'TCGdex', smallLinkClass)}, {@render external('https://pokeapi.co', 'PokéAPI', smallLinkClass)}
				· Prices: {@render external('https://www.cardmarket.com', 'Cardmarket', smallLinkClass)}
				· Symbols: EssentiarumTCG by {@render external('https://pokemonaaah.net/art/fonts/', 'Pokémon Aaah!', smallLinkClass)} (CC BY-NC)
			</p>
			<p>Pokémon © Nintendo, Creatures, GAME FREAK, The Pokémon Company. Not affiliated.</p>
		</div>
		<p class="shrink-0 whitespace-nowrap">© {year} {SITE_NAME}</p>
	</div>
</footer>
