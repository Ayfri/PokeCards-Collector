<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { signIn } from '$lib/services/auth';
  import { isUsernameTaken } from '$lib/services/profiles';
  import { onMount } from 'svelte';

  const dispatch = createEventDispatcher();

  let email = '';
  let username = '';
  let password = '';
  let confirmPassword = '';
  let loading = false;
  let errorMessage = '';

  onMount(() => {
    // Composant monté
  });

  async function validateUsername() {
    try {
      if (!username) {
        return true;
      }
      
      if (username.length < 3) {
        errorMessage = 'Username must contain at least 3 characters';
        return false;
      }
      
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errorMessage = 'Username can only contain letters, numbers and underscores';
        return false;
      }
      
      // Ajouter un timeout pour éviter une attente infinie
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout checking username')), 5000);
      });
      
      // Race entre la requête normale et le timeout
      const usernameCheckResult = await Promise.race([
        isUsernameTaken(username),
        timeoutPromise
      ]) as { exists: boolean, error: any };
      
      // À ce stade, nous avons soit un résultat valide, soit une erreur de timeout
      const { exists, error } = usernameCheckResult;
      
      if (error) {
        errorMessage = 'Error checking username';
        return false;
      }
      
      if (exists) {
        errorMessage = 'This username is already taken';
        return false;
      }
      
      return true;
    } catch (error) {
      errorMessage = 'Internal error during username validation';
      return false;
    }
  }

  async function handleSubmit() {
    try {
      // Basic validation
      if (!email || !username || !password || !confirmPassword) {
        errorMessage = 'Please fill in all fields';
        return;
      }

      if (password !== confirmPassword) {
        errorMessage = 'Passwords do not match';
        return;
      }

      if (password.length < 6) {
        errorMessage = 'Password must contain at least 6 characters';
        return;
      }
      
      // Username validation
      const isUsernameValid = await validateUsername();
      if (!isUsernameValid) {
        return;
      }
      
      // Everything is validated, continue
      loading = true;
      errorMessage = '';

      try {
        // Use the server API endpoint instead of the direct function
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            password,
            username
          })
        });
        
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          errorMessage = 'Error processing server response';
          loading = false;
          return;
        }
        
        if (!response.ok || !data.success) {
          if (data.error && data.error.includes('already registered')) {
            errorMessage = 'This email is already registered';
          } else if (data.error && data.error.includes('already taken')) {
            errorMessage = 'This username is already taken';
          } else if (data.error && data.error.includes('Profile creation')) {
            errorMessage = 'Error creating profile. Please try again.';
          } else {
            errorMessage = data.error || 'Error during registration';
          }
          loading = false;
          return;
        }
        
        // Automatic login via Supabase API
        try {
          // Use fetch directly to avoid issues with the Supabase client
          const supabaseUrl = import.meta.env.SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;
          
          const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
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
          
          if (!loginResponse.ok) {
            errorMessage = 'Registration successful, but automatic login failed. Please log in manually.';
            loading = false;
            return;
          }
          
          // Success - redirect to home page
          
          // Manual redirection - user will need to log in
          errorMessage = 'Registration successful! Please log in with your credentials.';
          loading = false;
          
          // Switch to login tab
          dispatch('switch', 'login');
          return;
        } catch (loginError) {
          errorMessage = 'Registration successful, but an error occurred during automatic login. Please log in manually.';
          loading = false;
          return;
        }
      } catch (error) {
        errorMessage = 'An error occurred while communicating with the server';
      } finally {
        loading = false;
      }
    } catch (error: unknown) {
      alert(`Error during submission: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      Username
    </label>
    <input
      type="text"
      id="username"
      bind:value={username}
      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
      placeholder="username"
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
  
  <div>
    <label for="confirm-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      Confirm Password
    </label>
    <input
      type="password"
      id="confirm-password"
      bind:value={confirmPassword}
      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
      placeholder="••••••••"
      required
    />
  </div>
  
  <button
    type="button"
    disabled={loading}
    class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
    on:click={handleSubmit}
  >
    {loading ? 'Registering...' : 'Register'}
  </button>
</form> 