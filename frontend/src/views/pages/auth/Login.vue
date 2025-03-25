
<script setup>
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const checked = ref(false);
const router = useRouter();

// Handle Google Login
const handleGoogleLogin = (response) => {
  console.log('Google Login Response:', response);

  // Decode the JWT token to get user info
  const userInfo = JSON.parse(atob(response.credential.split('.')[1]));
  console.log('User Info:', userInfo);

  // Save user info to localStorage (or to a Vuex store, etc.)
  localStorage.setItem('user', JSON.stringify(userInfo));

  // Redirect to the dashboard
  router.push({ name: 'dashboard' });
};

// Initialize Google Sign-In on component mount
onMounted(() => {
  window.google.accounts.id.initialize({
    client_id: 'YOUR_GOOGLE_CLIENT_ID', // Replace with your Google Client ID
    callback: handleGoogleLogin, // Callback function to handle the login response
  });

  // Render the Google Sign-In button
  window.google.accounts.id.renderButton(
    document.getElementById('google-signin-button'),
    {
      theme: 'outline',       // Button theme: outline, filled_blue, or filled_black
      size: 'large',          // Button size: small, medium, or large
      text: 'continue_with',  // Button text: signin_with or continue_with
      shape: 'rectangular',   // Button shape: rectangular, pill, circle, or square
    }
  );

  // Optionally prompt the user to sign in automatically
  window.google.accounts.id.prompt();
});
</script>

<template>
  <FloatingConfigurator />
  <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
    <div class="flex flex-col items-center justify-center">
      <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
        <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
          <div class="text-center mb-8">
            <svg viewBox="0 0 54 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="mb-8 w-16 shrink-0 mx-auto">
              <!-- Your SVG logo here -->
            </svg>
            <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Welcome to PrimeLand!</div>
            <span class="text-muted-color font-medium">Sign in to continue</span>
          </div>

          <!-- Email and Password Login -->
          <div>
            <label for="email1" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
            <InputText id="email1" type="text" placeholder="Email address" class="w-full md:w-[30rem] mb-8" v-model="email" />

            <label for="password1" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Password</label>
            <Password id="password1" v-model="password" placeholder="Password" :toggleMask="true" class="mb-4" fluid :feedback="false"></Password>

            <div class="flex items-center justify-between mt-2 mb-8 gap-8">
              <div class="flex items-center">
                <Checkbox v-model="checked" id="rememberme1" binary class="mr-2"></Checkbox>
                <label for="rememberme1">Remember me</label>
              </div>
              <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary">Forgot password?</span>
            </div>
            <Button label="Sign In" class="w-full" as="router-link" to="/app/Dashboard"></Button>
          </div>

          <!-- Divider -->
          <div class="flex items-center my-6">
            <div class="flex-1 border-t border-surface-300"></div>
            <span class="mx-4 text-surface-500">OR</span>
            <div class="flex-1 border-t border-surface-300"></div>
          </div>

          <!-- Google Sign-In Button -->
          <div id="google-signin-button" class="w-full flex justify-center"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pi-eye {
  transform: scale(1.6);
  margin-right: 1rem;
}

.pi-eye-slash {
  transform: scale(1.6);
  margin-right: 1rem;
}

#google-signin-button {
  margin-top: 1rem;
}
</style>