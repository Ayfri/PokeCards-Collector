<script lang="ts">
    import LoaderIcon from 'lucide-svelte/icons/loader';
    import { fade, fly } from 'svelte/transition';
    
    export let message: string = "Loading...";
    export let size: number = 48;
    export let color: string = "text-gold-400";
</script>

<div 
    class="flex items-center justify-center w-full h-64" 
    in:fade={{ duration: 200 }}
    out:fly={{ y: -20, duration: 300, easing: t => t * t }}
>
    <div class="flex flex-col items-center">
        <div class="loader-spin mb-4">
            <LoaderIcon {size} class="{color}" />
        </div>
        <p class="text-white text-xl">{message}</p>
    </div>
</div>

<style>
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .loader-spin {
        animation: spin 2s linear infinite;
        display: inline-flex;
    }
</style> 