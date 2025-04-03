<template>
  <div class="accept-invitation">
    <h2>Accept Invitation</h2>
    <p v-if="success">Thank you for accepting the invitation!</p>
    <p v-else-if="error">{{ error }}</p>
    <p v-else>Processing your invitation...</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';

const route = useRoute();
const success = ref(false);
const error = ref('');

onMounted(async () => {
  const token = route.query.token;

  if (!token) {
    error.value = 'Invalid invitation link';
    return;
  }

  try {
    const mutation = `
      mutation AcceptInvitation($token: String!) {
        acceptInvitation(token: $token)
      }
    `;

    const variables = { token };

    const response = await axios.post('http://localhost:3000/graphql', {
      query: mutation,
      variables,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    success.value = true;
  } catch (err) {
    console.error('Error accepting invitation:', err);
    error.value = 'Failed to accept invitation';
  }
});
</script>

<style scoped>
.accept-invitation {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}
</style>