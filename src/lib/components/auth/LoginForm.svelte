<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { signIn } from '$lib/services/auth';
  import { authStore } from '$lib/stores/auth';

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
    console.log('Login attempt...');

    try {
      // Utiliser fetch directement au lieu du client Supabase
      const supabaseUrl = import.meta.env.SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;
      
      console.log('Sending request to server...');
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      });
      
      console.log('Response received:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Login error:', errorText);
        
        if (errorText.includes('Invalid login credentials')) {
          errorMessage = 'Incorrect email or password';
        } else {
          errorMessage = 'Error during login: ' + errorText;
        }
        
        loading = false;
        return;
      }
      
      const data = await response.json();
      console.log('Login successful, data received');
      
      // Enregistrer le token dans le localStorage
      if (data.access_token) {
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        }));
      }
      
      // Recharger la page pour appliquer l'authentification
      window.location.reload();
      
      // Success - notify parent component
      console.log('Login successful, notifying parent');
      dispatch('success');
    } catch (error) {
      console.error('Exception during login:', error);
      errorMessage = 'An error occurred while communicating with the server';
      loading = false;
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
    class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {loading ? 'Logging in...' : 'Log in'}
  </button>
</form> 