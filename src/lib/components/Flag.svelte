<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import type { Language } from '#helpers/catalogues.ts';

	interface Props {
		class?: ClassValue;
		language: Language;
	}

	let { class: className, language }: Props = $props();

	/** Inline SVG because Windows renders flag emoji as two letters. `$props.id()` keeps the clip ids unique when several Union Jacks share a page. */
	const id = $props.id();
</script>

{#if language === 'fr'}
	<svg class={className} viewBox="0 0 3 2" aria-hidden="true">
		<rect width="1" height="2" fill="#002654" />
		<rect x="1" width="1" height="2" fill="#fff" />
		<rect x="2" width="1" height="2" fill="#ce1126" />
	</svg>
{:else if language === 'ja'}
	<svg class={className} viewBox="0 0 3 2" aria-hidden="true">
		<rect width="3" height="2" fill="#fff" />
		<circle cx="1.5" cy="1" r="0.6" fill="#bc002d" />
	</svg>
{:else}
	<svg class={className} viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
		<clipPath id="{id}-s"><path d="M0,0 v30 h60 v-30 z" /></clipPath>
		<clipPath id="{id}-t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
		<g clip-path="url(#{id}-s)">
			<path d="M0,0 v30 h60 v-30 z" fill="#012169" />
			<path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6" />
			<path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#{id}-t)" stroke="#C8102E" stroke-width="4" />
			<path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10" />
			<path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6" />
		</g>
	</svg>
{/if}
