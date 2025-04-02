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
  let debugInfo = '';
  let globalError = '';

  // Gestionnaire d'erreurs global
  window.addEventListener('error', (event) => {
    globalError = `Erreur globale: ${event.message} à ${event.filename}:${event.lineno}`;
    console.error('Erreur globale capturée:', event);
  });

  onMount(() => {
    console.log('Composant RegisterForm monté');
    debugInfo = 'Composant monté';
  });

  async function validateUsername() {
    try {
      debugInfo += ' | validateUsername début';
      console.log('Starting validateUsername for:', username);
      
      if (!username) {
        debugInfo += ' | username empty';
        console.log('Username empty');
        return true;
      }
      
      debugInfo += ' | length:', username.length;
      
      if (username.length < 3) {
        errorMessage = 'Username must contain at least 3 characters';
        debugInfo += ' | username too short';
        console.log('Username too short');
        return false;
      }
      
      debugInfo += ' | format ok';
      
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errorMessage = 'Username can only contain letters, numbers and underscores';
        debugInfo += ' | username invalid format';
        console.log('Invalid username format');
        return false;
      }
      
      debugInfo += ' | checking DB...';
      console.log('Checking if username is already taken in DB');
      
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
      console.log('Verification result:', { exists, error });
      
      if (error) {
        errorMessage = 'Error checking username';
        console.error('Username check error:', error);
        debugInfo += ' | DB error: ' + JSON.stringify(error);
        return false;
      }
      
      if (exists) {
        errorMessage = 'This username is already taken';
        debugInfo += ' | username already taken';
        console.log('Username already taken');
        return false;
      }
      
      debugInfo += ' | username available';
      console.log('Username available');
      return true;
    } catch (error) {
      console.error('General error in validateUsername:', error);
      errorMessage = 'Internal error during username validation';
      debugInfo += ' | GENERAL EXCEPTION: ' + (error instanceof Error ? error.message : 'unknown error');
      return false;
    }
  }

  async function handleSubmit() {
    try {
      console.log('===============================================');
      console.log('STARTING HANDLESUBMIT');
      console.log('===============================================');
      
      debugInfo = 'handleSubmit called';
      
      // Basic validation
      if (!email || !username || !password || !confirmPassword) {
        errorMessage = 'Please fill in all fields';
        debugInfo += ' | Validation: missing fields';
        return;
      }

      debugInfo += ' | Fields filled';

      if (password !== confirmPassword) {
        errorMessage = 'Passwords do not match';
        debugInfo += ' | Different passwords';
        return;
      }

      debugInfo += ' | Identical passwords';

      if (password.length < 6) {
        errorMessage = 'Password must contain at least 6 characters';
        debugInfo += ' | Password too short';
        return;
      }

      debugInfo += ' | Valid password';
      
      // Username validation
      debugInfo += ' | Checking username';
      const isUsernameValid = await validateUsername();
      if (!isUsernameValid) {
        debugInfo += ' | Invalid username';
        return;
      }
      
      debugInfo += ' | Username validated';
      
      // Everything is validated, continue
      loading = true;
      errorMessage = '';

      try {
        console.log('Sending registration request...');
        debugInfo += ' | Sending request';
        
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
        
        console.log('Response received:', response.status);
        debugInfo += ` | Response ${response.status}`;
        
        let data;
        try {
          data = await response.json();
          console.log('Data received:', data);
          debugInfo += ' | Data received';
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          errorMessage = 'Error processing server response';
          debugInfo += ' | Parsing error';
          loading = false;
          return;
        }
        
        if (!response.ok || !data.success) {
          debugInfo += ' | Response not OK';
          if (data.error && data.error.includes('already registered')) {
            errorMessage = 'This email is already registered';
            debugInfo += ' | Email already registered';
          } else if (data.error && data.error.includes('already taken')) {
            errorMessage = 'This username is already taken';
            debugInfo += ' | Username already taken';
          } else if (data.error && data.error.includes('Profile creation')) {
            errorMessage = 'Error creating profile. Please try again.';
            debugInfo += ' | Profile creation error';
          } else {
            errorMessage = data.error || 'Error during registration';
            debugInfo += ' | Other error';
          }
          console.log('Registration error:', errorMessage);
          loading = false;
          return;
        }
        
        console.log('Registration successful, attempting automatic login...');
        debugInfo += ' | Registration successful';
        
        // Automatic login via Supabase API
        try {
          debugInfo += ' | Direct login';
          
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
            const loginError = await loginResponse.text();
            console.error('Automatic login error:', loginError);
            errorMessage = 'Registration successful, but automatic login failed. Please log in manually.';
            debugInfo += ' | Auto-login error';
            loading = false;
            return;
          }
          
          // Success - redirect to home page
          console.log('Login successful');
          debugInfo += ' | Login successful';
          
          // Manual redirection - user will need to log in
          errorMessage = 'Registration successful! Please log in with your credentials.';
          loading = false;
          
          // Switch to login tab
          dispatch('switch', 'login');
          return;
        } catch (loginError) {
          console.error('Exception during automatic login:', loginError);
          errorMessage = 'Registration successful, but an error occurred during automatic login. Please log in manually.';
          debugInfo += ' | Auto-login exception';
          loading = false;
          return;
        }
      } catch (error) {
        console.error('Complete error:', error);
        errorMessage = 'An error occurred while communicating with the server';
        debugInfo += ' | Server communication error';
      } finally {
        loading = false;
      }
    } catch (error: unknown) {
      console.error('GENERAL ERROR IN HANDLESUBMIT:', error);
      debugInfo += ` | ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
      alert(`Error during submission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Version simplifiée pour test
  async function handleTestSubmit() {
    console.log('Test de soumission simple');
    alert('Formulaire soumis avec succès (test)');
  }
</script>

<!-- Formulaire de test temporaire pour déboguer -->
<div class="bg-yellow-100 p-4 mb-4 rounded-lg">
  <h3 class="font-bold">Formulaire de test</h3>
  <form on:submit|preventDefault={handleTestSubmit} class="mt-2">
    <input type="text" placeholder="Test" class="border p-2 mr-2">
    <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">
      Test
    </button>
  </form>
  <div class="mt-2 text-xs">
    <strong>Info de débogage:</strong> {debugInfo}
  </div>
  {#if globalError}
    <div class="mt-2 p-2 bg-red-200 text-red-800 text-xs">
      <strong>Erreur globale:</strong> {globalError}
    </div>
  {/if}
</div>

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