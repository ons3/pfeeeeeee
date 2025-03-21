// src/apolloClient.js
import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { createApolloProvider } from '@vue/apollo-option';

const cache = new InMemoryCache();

const apolloClient = new ApolloClient({
  uri: 'http://localhost:3000/graphql', // Replace with your GraphQL API endpoint
  cache,
});

export const apolloProvider = createApolloProvider({
  defaultClient: apolloClient,
});