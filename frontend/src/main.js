import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import Aura from '@primeuix/themes/aura';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';

import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { DefaultApolloClient } from '@vue/apollo-composable'; // Correct import for Vue 3

import '@/assets/styles.scss';

// Apollo Client setup
const cache = new InMemoryCache();

const apolloClient = new ApolloClient({
  uri: 'http://localhost:3000/graphql', // Replace with your GraphQL API endpoint
  cache,
});

// Create the Vue app
const app = createApp(App);

// Use plugins
app.use(router);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.app-dark',
    },
  },
});
app.use(ToastService);
app.use(ConfirmationService);

// Provide Apollo Client to the app
app.provide(DefaultApolloClient, apolloClient);

// Mount the app
app.mount('#app');