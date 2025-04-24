<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { signIn } from '$lib/services/auth';
  import { authStore } from '$lib/stores/auth';
  import Loader from '$lib/components/Loader.svelte';

  const dispatch = createEventDispatcher();

  let email = '';
  let password = '';
  let loading = false;
  let errorMessage = '';

  async function handleSubmit() {
    if (!email || !password) {
      errorMessage = 'Please fill in all fields';
      return;
    }

    loading = true;
    errorMessage = '';
    
    // Ajouter un timeout visible pour l'utilisateur
    const loginTimeout = setTimeout(() => {
      if (loading) {
        errorMessage = "La connexion prend plus de temps que prévu. Vérifiez votre connexion internet ou réessayez plus tard.";
        loading = false;
      }
    }, 15000);

    try {
      // Utiliser la fonction signIn du service auth
      let result;
      try {
        result = await signIn(email, password);
      } catch (signInError) {
        throw signInError;
      }
      
      const { user, session, error } = result;
      
      // Nettoyer le timeout
      clearTimeout(loginTimeout);
      
      if (error) {
        console.error('Erreur pendant le login:', error);
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Incorrect email or password';
        } else {
          errorMessage = 'Error during login: ' + error.message;
        }
        loading = false;
        return;
      }
      
      // Login réussi
      clearTimeout(loginTimeout);
      loading = false;
      
      // Notifier le composant parent du succès
      dispatch('success');
      
      // Redirection vers la page d'accueil
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    } catch (error: any) {
      clearTimeout(loginTimeout);
      loading = false;
      
      // Message d'erreur plus descriptif
      if (error.message?.includes('Timeout') || error.message?.includes('pris trop de temps')) {
        errorMessage = "Impossible de se connecter au service d'authentification. Vérifiez votre connexion internet ou réessayez plus tard.";
      } else {
        errorMessage = `Échec de connexion: ${error?.message || 'Erreur inconnue'}`;
      }
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4">
  {#if errorMessage}
    <div class="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
      {errorMessage}
    </div>
  {/if}
  
  <div>
    <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      Email
    </label>
    <input
      type="email"
      id="email"
      bind:value={email}
      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
      placeholder="your@email.com"
      required
    />
  </div>
  
  <div>
    <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      Password
    </label>
    <input
      type="password"
      id="password"
      bind:value={password}
      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
      placeholder="••••••••"
      required
    />
  </div>
  
  <button
    type="submit"
    disabled={loading}
    class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
  >
    {#if loading}
      <div class="loader-spin mr-2" style="width: 16px; height: 16px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      </div>
      Logging in...
    {:else}
      Log in
    {/if}
  </button>
</form>

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