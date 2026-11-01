<script lang="ts">
	import { FORM_INPUT_CLASS, FORM_LABEL_CLASS, PASSWORD_CRITERIA } from '#src/constants.ts';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';

	interface Props {
		autocomplete: 'current-password' | 'new-password';
		id: string;
		label: string;
		name?: string;
		placeholder: string;
		strength?: boolean;
		value: string;
	}

	let { autocomplete, id, label, name, placeholder, strength = false, value = $bindable() }: Props = $props();

	let visible = $state(false);

	const met = $derived(PASSWORD_CRITERIA.map(criterion => criterion.test(value)));
	const score = $derived(met.filter(Boolean).length);
	const scoreColor = $derived(['bg-gray-700', 'bg-red-500', 'bg-yellow-400', 'bg-green-500'][score]);
</script>

<div>
	<label class={FORM_LABEL_CLASS} for={id}>{label}</label>
	<div class="relative">
		<input
			{autocomplete}
			bind:value
			class={[FORM_INPUT_CLASS, 'pr-10']}
			{id}
			{name}
			{placeholder}
			required
			type={visible ? 'text' : 'password'}
		/>
		<button
			aria-label={visible ? 'Hide password' : 'Show password'}
			class="absolute inset-y-0 right-0 flex items-center rounded-md px-3 text-gray-400 transition-colors hover:text-gold-400 focus-visible:outline-hidden focus-visible:text-gold-400"
			onclick={() => (visible = !visible)}
			title={visible ? 'Hide password' : 'Show password'}
			type="button"
		>
			{#if visible}<EyeOffIcon size={18} />{:else}<EyeIcon size={18} />{/if}
		</button>
	</div>

	{#if strength}
		<div class="mt-2 h-1.5 w-full rounded-sm bg-gray-700">
			<div class={['h-1.5 rounded-sm transition-all duration-300', scoreColor]} style="width: {(score / PASSWORD_CRITERIA.length) * 100}%"></div>
		</div>
		<ul class="mt-2 space-y-0.5 text-xs text-gray-500">
			{#each PASSWORD_CRITERIA as criterion, index (criterion.id)}
				<li class={met[index] ? 'text-green-400' : undefined}>• {criterion.label}</li>
			{/each}
		</ul>
	{/if}
</div>
