<script lang="ts">
	import Button from '$lib/components/filters/Button.svelte';
	import { fade, fly } from 'svelte/transition';

	export let showHelp: boolean;
	export let toggleHelp: () => void;
</script>

{#if showHelp}
	<div 
		class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" 
		on:click={toggleHelp}
		transition:fade={{ duration: 200 }}
	>
		<div 
			class="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" 
			on:click|stopPropagation
			transition:fly={{ y: 20, duration: 200 }}
		>
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-xl text-gold-400 font-bold">Binder Builder - Help</h2>
				<Button class="p-1.5" onClick={toggleHelp}>Close</Button>
			</div>
			
			<div class="space-y-4 text-gray-200">
				<section>
					<h3 class="text-lg font-semibold mb-2">Overview</h3>
					<p>
						The Binder Builder is a tool that lets you create a digital representation of your 
						physical card binder. You can customize the grid size, add cards individually or complete sets at once,
						and arrange them just as you would in a real binder.
					</p>
				</section>
				
				<section>
					<h3 class="text-lg font-semibold mb-2">Getting Started</h3>
					<ol class="list-decimal list-inside space-y-2">
						<li>Configure your binder grid by adjusting the number of rows and columns (2-6)</li>
						<li>Add cards in two ways:
							<ul class="list-disc list-inside ml-6 mt-1">
								<li>Search for individual cards using the search bar in the header and add them to your binder</li>
								<li>Use the "Add set" button to add an entire set to your storage at once</li>
							</ul>
						</li>
						<li>Drag cards from your storage area and drop them into grid positions</li>
						<li>Rearrange cards by dragging them between positions</li>
					</ol>
				</section>
				
				<section>
					<h3 class="text-lg font-semibold mb-2">Features</h3>
					<ul class="list-disc list-inside space-y-2">
						<li><span class="font-medium">Customizable Grid:</span> Configure rows and columns to match your physical binder</li>
						<li><span class="font-medium">Drag and Drop:</span> Easily position cards with intuitive drag and drop</li>
						<li><span class="font-medium">Card Storage:</span> Store cards separately from your binder arrangement</li>
						<li><span class="font-medium">Multiple Adding Methods:</span> Add individual cards via search or entire sets at once</li>
						<li><span class="font-medium">Local Storage:</span> Your binder configuration is saved in your browser</li>
					</ul>
				</section>
				
				<section>
					<h3 class="text-lg font-semibold mb-2">Tips and Tricks</h3>
					<ul class="list-disc list-inside space-y-2">
						<li>Use the reset button to clear your grid but keep cards in storage</li>
						<li>Search for specific cards using the search bar at the top of the page and click the + icon to add them</li>
						<li>Add complete sets with the "Add set" button when building themed pages</li>
						<li>The grid will automatically maintain the aspect ratio of card sleeves</li>
						<li>Remove cards from storage by clicking the X icon that appears on hover</li>
					</ul>
				</section>
			</div>
		</div>
	</div>
{/if} 