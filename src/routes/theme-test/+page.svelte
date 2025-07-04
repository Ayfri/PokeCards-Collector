<!-- Simple test page without server-side dependencies -->
<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { theme } from '$lib/stores/theme';
</script>

<svelte:head>
	<title>Theme Test - PokéCards Collector</title>
</svelte:head>

<div class="min-h-screen bg-white dark:bg-black">
	<!-- Simple header for testing -->
	<header class="fixed top-0 left-0 w-full p-2 pb-6 lg:pb-12 z-50 bg-gradient-to-b from-gray-100 dark:from-gray-900 to-transparent">
		<div class="relative py-1.5 xs:py-2.5 lg:py-3 px-4 xs:px-6 lg:px-8 flex items-center justify-between gap-4 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
			<div class="flex items-center gap-2">
				<a href="/" class="font-bold text-lg text-gray-900 dark:text-white hover:text-gold-400 transition-colors">PCC</a>
			</div>
			
			<div class="flex items-center gap-4">
				<ThemeToggle />
				<span class="text-gray-600 dark:text-gray-300 text-sm">Theme Test</span>
			</div>
		</div>
	</header>
	
	<main class="pt-24 lg:pt-32 p-8">
		<div class="max-w-4xl mx-auto">
			<h1 class="text-4xl font-bold mb-6 text-gray-900 dark:text-white">Theme Switcher Test</h1>
			
			<div class="space-y-6">
				<div class="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
					<h2 class="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Light/Dark Mode Implementation</h2>
					<p class="text-gray-600 dark:text-gray-400 mb-4">
						Use the sun/moon icon in the header to toggle between light and dark themes. 
						Your preference is automatically saved and will persist across browser sessions.
					</p>
					<div class="flex items-center gap-2 text-sm">
						<span class="text-gray-500 dark:text-gray-500">Current theme:</span>
						<span class="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{$theme}</span>
					</div>
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
						<h3 class="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">🌞 Light Theme</h3>
						<p class="text-blue-700 dark:text-blue-300">Bright, clean interface perfect for daytime browsing and well-lit environments.</p>
					</div>
					
					<div class="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
						<h3 class="text-lg font-semibold text-purple-900 dark:text-purple-200 mb-2">🌙 Dark Theme</h3>
						<p class="text-purple-700 dark:text-purple-300">Easy on the eyes for nighttime use and low-light situations.</p>
					</div>
				</div>

				<div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
					<h3 class="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">✨ Features</h3>
					<ul class="space-y-1 text-yellow-700 dark:text-yellow-300">
						<li>• Instant theme switching with visual feedback</li>
						<li>• Persistent storage using localStorage</li>
						<li>• Tailwind CSS dark mode classes throughout</li>
						<li>• Accessible sun/moon icon toggle</li>
						<li>• Default dark theme (matching app style)</li>
					</ul>
				</div>
			</div>
		</div>
	</main>
</div>