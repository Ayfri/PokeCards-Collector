<script lang="ts">
	import { fly } from 'svelte/transition';
	import Modal from '@components/ui/Modal.svelte';

	export let showHelp: boolean;
	export let toggleHelp: () => void;
</script>

<Modal
	open={showHelp} 
	on:close={toggleHelp} 
	transitionFn={fly} 
	transitionParams={{ y: 20, duration: 200 }} 
	title="Binder Builder - Help"
	containerClass="max-w-xl lg:max-w-4xl"
>
	<svelte:fragment slot="header">
		<h2 id="modal-title" class="text-xl text-gold-400 font-bold">Binder Builder - Help</h2>
	</svelte:fragment>

	<div class="space-y-4 text-gray-200 text-sm">
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
				<li>Add cards in multiple ways:
					<ul class="list-disc list-inside ml-6 mt-1">
						<li>Search for individual cards using the search bar in the header and add them to your binder</li>
						<li>Use the "Add set" button to add an entire set to your storage at once</li>
						<li>Use the "Add from URL" button to add cards from direct image URLs</li>
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
				<li><span class="font-medium">Multiple Adding Methods:</span> Add individual cards via search, entire sets at once, or from image URLs</li>
				<li><span class="font-medium">Bulk URL Import:</span> Add multiple cards at once by pasting a list of URLs</li>
				<li><span class="font-medium">Local Storage:</span> Your binder configuration is saved in your browser</li>
			</ul>
		</section>
		
		<section>
			<h3 class="text-lg font-semibold mb-2">Tips and Tricks</h3>
			<ul class="list-disc list-inside space-y-2">
				<li>Use the reset button to clear your grid but keep cards in storage</li>
				<li>Search for specific cards using the search bar at the top of the page and click the + icon to add them</li>
				<li>Add complete sets with the "Add set" button when building themed pages</li>
				<li>Use the "Add from URL" button to add cards from image URLs you find online</li>
				<li>For bulk imports, paste multiple URLs in the textarea - either one URL per line or multiple URLs separated by semicolons</li>
				<li>The grid will automatically maintain the aspect ratio of card sleeves</li>
				<li>Remove cards from storage by clicking the X icon that appears on hover</li>
			</ul>
		</section>
	</div>
</Modal> 