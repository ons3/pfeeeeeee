<script setup>
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const email = ref('');
const password = ref('');
const checked = ref(false);
const router = useRouter();
const errorMessage = ref('');

// API Base URL
const API_URL = 'http://localhost:3000/graphql'; // Change to your actual backend URL

// Handle Manual Login
const login = async () => {
  try {
    const response = await axios.post(API_URL, {
      query: `
        mutation {
          loginAdministrateur(email_administrateur: "${email.value}", password_administrateur: "${password.value}") {
            success
            message
            token
            administrateur {
              idAdministrateur
              nom_administrateur
              email_administrateur
            }
          }
        }
      `,
    });

    const { success, message, token, administrateur } = response.data.data.loginAdministrateur;

    if (success) {
      // Store token, administrateur details, and password in localStorage
      localStorage.setItem('token', token); // Save token
      localStorage.setItem('administrateur', JSON.stringify(administrateur)); // Save administrateur details
      localStorage.setItem('password', password.value); // Save the password for validation during delete operations

      // Redirect to Dashboard
      router.push({ name: 'Dashboard' });
    } else {
      errorMessage.value = message; // Show error message
    }
  } catch (error) {
    errorMessage.value = 'Login failed. Please try again.';
    console.error(error);
  }
};


// Handle Google Login
const handleGoogleLogin = async (response) => {
  console.log('Google Login Response:', response);

  try {
    const googleToken = response.credential;
    const gqlResponse = await axios.post(API_URL, {
      query: `
        mutation {
          loginWithGoogle(googleIdToken: "${googleToken}") {
            success
            message
            token
          }
        }
      `,
    });

    const { success, message, token } = gqlResponse.data.data.loginWithGoogle;

    if (success) {
      localStorage.setItem('token', token);
      router.push({ name: 'Dashboard' });
    } else {
      errorMessage.value = message;
    }
  } catch (error) {
    errorMessage.value = 'Google login failed.';
    console.error(error);
  }
};

// Initialize Google Sign-In on component mount
onMounted(() => {
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);

  script.onload = () => {
    window.google.accounts.id.initialize({
      client_id:'17543999702-hf3su5dua5q1fuhfmeth5a6mgtf2acce.apps.googleusercontent.com', // Replace with your Google Client ID
      callback: handleGoogleLogin,
    });

    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-button'),
      {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
      }
    );

    window.google.accounts.id.prompt();
  };
});
</script>

<template>
  <FloatingConfigurator />
  <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
    <div class="flex flex-col items-center justify-center">
      <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
        <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
          <div class="text-center mb-8">
            <img src="/logo2.png" alt="Logo" class="w-32 mx-auto" />
          </div>

          <!-- Google Sign-In Button -->
          <div id="google-signin-button" class="w-full flex justify-center mb-6"></div>

          <!-- Divider -->
          <div class="flex items-center my-6">
            <div class="flex-1 border-t border-surface-300"></div>
            <span class="mx-4 text-surface-500">OR</span>
            <div class="flex-1 border-t border-surface-300"></div>
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
            </div>

            <Button label="Sign In" class="w-full" @click="login"></Button>
            <p v-if="errorMessage" class="text-red-500 mt-2">{{ errorMessage }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#google-signin-button {
  margin-top: 1rem;
}
</style>
