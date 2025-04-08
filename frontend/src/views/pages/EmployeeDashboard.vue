<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const employee = ref(JSON.parse(localStorage.getItem('employee')));
const router = useRouter();

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('employee');
  router.push({ name: 'EmployeeLogin' });
};
</script>

<template>
  <div class="dashboard">
    <h1>Welcome, {{ employee.nomEmployee }}</h1>
    <p>Email: {{ employee.emailEmployee }}</p>
    <p>Role: {{ employee.role }}</p>
    <button @click="logout">Logout</button>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 2rem;
}
</style>