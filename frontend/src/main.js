import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import Aura from '@primeuix/themes/aura';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';

import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client/core';
import { DefaultApolloClient } from '@vue/apollo-composable';
import { onError } from '@apollo/client/link/error';

import '@/assets/styles.scss';

// HTTP Link Configuration
const httpLink = createHttpLink({
  uri: 'http://localhost:3000/graphql',
  // Optional: Add if your API requires credentials
  // credentials: 'include'
});

// Enhanced Error Handling
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, path }) => {
      console.error(`[GraphQL error] Path: ${path}`, message);
    });
  }
  
  if (networkError) {
    console.error('[Network error]', networkError);
    // Optional: Redirect to error page or show notification
  }
});

// Apollo Client Configuration
const apolloClient = new ApolloClient({
  link: errorLink.concat(httpLink),
  cache: new InMemoryCache(),
  connectToDevTools: process.env.NODE_ENV !== 'production',
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
    query: {
      fetchPolicy: 'network-first',
    },
  }
});

// App Creation
const app = createApp(App);

// Plugins Registration (unchanged from your working version)
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

// Provide Apollo Client
app.provide(DefaultApolloClient, apolloClient);

// Mount the app
app.mount('#app');