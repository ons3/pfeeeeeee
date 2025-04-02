<script setup>
import { ref, onMounted, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import axios from 'axios';

const toast = useToast();
const dt = ref();
const taches = ref([]);
const addEmployeeDialog = ref(false);
const editEmployeeDialog = ref(false);
const deleteEmployeeDialog = ref(false);
const disableEmployeeDialog = ref(false);
const resetPasswordDialog = ref(false); // Dialog for password reset
const employee = ref({});
const submitted = ref(false);
const searchQuery = ref(''); // Search bar query
const employeeToDelete = ref(null);
const disabledUntil = ref(null);
const newPassword = ref('');
const emailForReset = ref(''); // Email to be used for reset

// Fetch employees
const fetchTaches = async () => {
  try {
    const query = `
      query {
        searchEmployees {
          employees {
            idEmployee
            nomEmployee
            emailEmployee
            role
            disabledUntil
          }
        }
      }
    `;
    const response = await axios.post('http://localhost:3000/graphql', { query });

    if (response.data?.data?.searchEmployees?.employees) {
      taches.value = response.data.data.searchEmployees.employees.map(emp => ({
        ...emp,
        disabledUntil: emp.disabledUntil ? new Date(emp.disabledUntil) : null
      }));
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error) {
    console.error("Error fetching employees:", error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load employees', life: 3000 });
  }
};

// Filter employees based on search query
const filteredEmployees = computed(() => {
  return taches.value.filter(emp =>
    emp.nomEmployee.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// Open the "Add Employee" dialog
const openNew = () => {
  employee.value = {}; // Reset the employee object
  submitted.value = false; // Reset the submitted state
  addEmployeeDialog.value = true; // Open the dialog
};

// Save the new employee
const saveEmployee = async () => {
  submitted.value = true;

  if (!employee.value.nomEmployee || !employee.value.emailEmployee || !employee.value.role) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please fill in all fields', life: 3000 });
    return;
  }

  try {
    const mutation = `
      mutation CreateEmployee(
        $nomEmployee: String!,
        $emailEmployee: String!,
        $passwordEmployee: String!,
        $idEquipe: String,
        $role: String!
      ) {
        createEmployee(
          nomEmployee: $nomEmployee,
          emailEmployee: $emailEmployee,
          passwordEmployee: $passwordEmployee,
          idEquipe: $idEquipe,
          role: $role
        ) {
          idEmployee
        }
      }
    `;
    const variables = {
      nomEmployee: employee.value.nomEmployee,
      emailEmployee: employee.value.emailEmployee,
      passwordEmployee: "defaultPassword123", // Replace with a default or user-provided password
      idEquipe: employee.value.idEquipe || null,
      role: employee.value.role,
    };

    const response = await axios.post('http://localhost:3000/graphql', {
      query: mutation,
      variables,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    toast.add({ severity: 'success', summary: 'Success', detail: 'Employee added successfully', life: 3000 });
    addEmployeeDialog.value = false; // Close the dialog
    fetchTaches(); // Refresh the employee list
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.message || 'Failed to add employee';
    toast.add({ severity: 'error', summary: 'Error', detail: errorMessage, life: 3000 });
  }
};

// Update the employee
const updateEmployee = async () => {
  submitted.value = true;

  if (!employee.value.nomEmployee || !employee.value.emailEmployee || !employee.value.role) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please fill in all fields', life: 3000 });
    return;
  }

  try {
    const mutation = `
      mutation UpdateEmployee(
        $id: String!,
        $nomEmployee: String,
        $emailEmployee: String,
        $role: String,
        $idEquipe: String
      ) {
        updateEmployee(
          id: $id,
          nomEmployee: $nomEmployee,
          emailEmployee: $emailEmployee,
          role: $role,
          idEquipe: $idEquipe
        ) {
          idEmployee
        }
      }
    `;
    const variables = {
      id: employee.value.idEmployee,
      nomEmployee: employee.value.nomEmployee,
      emailEmployee: employee.value.emailEmployee,
      role: employee.value.role,
      idEquipe: employee.value.idEquipe || null,
    };

    const response = await axios.post('http://localhost:3000/graphql', {
      query: mutation,
      variables,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    toast.add({ severity: 'success', summary: 'Success', detail: 'Employee updated successfully', life: 3000 });
    editEmployeeDialog.value = false; // Close the dialog
    fetchTaches(); // Refresh the employee list
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.message || 'Failed to update employee';
    toast.add({ severity: 'error', summary: 'Error', detail: errorMessage, life: 3000 });
  }
};

// Delete the employee
const deleteEmployee = async () => {
  try {
    const mutation = `
      mutation DeleteEmployee($id: String!) {
        deleteEmployee(id: $id) {
          success
          message
        }
      }
    `;
    const variables = {
      id: employeeToDelete.value.idEmployee,
    };

    const response = await axios.post('http://localhost:3000/graphql', {
      query: mutation,
      variables,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    toast.add({ severity: 'success', summary: 'Success', detail: 'Employee deleted successfully', life: 3000 });
    deleteEmployeeDialog.value = false; // Close the dialog
    fetchTaches(); // Refresh the employee list
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.message || 'Failed to delete employee';
    toast.add({ severity: 'error', summary: 'Error', detail: errorMessage, life: 3000 });
  }
};


// Disable the employee
const disableEmployee = async () => {
  if (!disabledUntil.value) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please specify a disable date', life: 3000 });
    return;
  }

  try {
    const mutation = `
      mutation DisableEmployee($id: String!, $disabledUntil: String!) {
        updateEmployee(id: $id, disabledUntil: $disabledUntil) {
          idEmployee
        }
      }
    `;
    const variables = {
      id: employee.value.idEmployee,
      disabledUntil: disabledUntil.value,
    };

    const response = await axios.post('http://localhost:3000/graphql', {
      query: mutation,
      variables,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    toast.add({ severity: 'success', summary: 'Success', detail: 'Employee disabled successfully', life: 3000 });
    disableEmployeeDialog.value = false; // Close the dialog
    fetchTaches(); // Refresh the employee list
  } catch (error) {
    const errorMessage = error.response?.data?.errors?.[0]?.message || 'Failed to disable employee';
    toast.add({ severity: 'error', summary: 'Error', detail: errorMessage, life: 3000 });
  }
};


// Open reset password dialog
const openResetPasswordDialog = (emp) => {
  employee.value = emp;
  emailForReset.value = emp.emailEmployee; // Set the email for reset
  newPassword.value = ''; // Reset the new password field
  resetPasswordDialog.value = true; // Open the reset password dialog
};


// Send reset password email (mutation)
const sendResetPasswordEmail = async () => {
  if (!newPassword.value) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please enter a new password', life: 3000 });
    return;
  }

  try {
    const response = await axios.post('http://localhost:3000/send-email', {
      email: emailForReset.value,
      password: newPassword.value,
    });
    toast.add({ severity: 'success', summary: 'Success', detail: 'Password reset email sent', life: 3000 });
    resetPasswordDialog.value = false;
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to send password reset email', life: 3000 });
  }
};


// Open edit dialog
const openEdit = (emp) => {
  employee.value = { ...emp }; // Populate the employee object with the selected employee's data
  submitted.value = false; // Reset the submitted state
  editEmployeeDialog.value = true; // Open the edit dialog
};


// Open disable dialog
const openDisableDialog = (emp) => {
  employee.value = emp; // Set the selected employee
  disabledUntil.value = ''; // Reset the disabledUntil field
  disableEmployeeDialog.value = true; // Open the dialog
};

// Confirm delete employee
const confirmDeleteEmployee = (emp) => {
  employeeToDelete.value = emp; // Store the employee to be deleted
  deleteEmployeeDialog.value = true; // Open the delete confirmation dialog
};

// Hide all dialogs
const hideDialog = () => {
  addEmployeeDialog.value = false;
  editEmployeeDialog.value = false;
  deleteEmployeeDialog.value = false;
  disableEmployeeDialog.value = false;
  resetPasswordDialog.value = false;
  submitted.value = false;
};

onMounted(() => {
  fetchTaches();
});
</script>

<template>
  <div class="employee-page p-4">
    <div class="card">
      <Toolbar class="mb-4">
        <template #start>
          <Button label="New" icon="pi pi-plus" class="p-button-success" @click="openNew" />
        </template>
        <template #end>
          <InputText v-model="searchQuery" placeholder="Search by name..." class="p-inputtext-sm p-mr-2" />
        </template>
      </Toolbar>

      <DataTable :value="filteredEmployees" ref="dt" paginator :rows="10" class="p-datatable-gridlines">
        <Column field="idEmployee" header="ID" />
        <Column field="nomEmployee" header="Name" />
        <Column field="emailEmployee" header="Email" />
        <Column field="role" header="Role" />
        <Column field="disabledUntil" header="Disabled Until">
            <template #body="{ data }">
                {{ data.disabledUntil ? new Date(data.disabledUntil).toLocaleDateString('en-US') : 'Active' }}
            </template>
        </Column>

        <Column header="Actions">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" class="p-button-rounded p-button-warning p-mr-2" @click="openEdit(data)" />
            <Button icon="pi pi-lock" class="p-button-rounded p-button-secondary p-mr-2" @click="openDisableDialog(data)" />
            <Button icon="pi pi-trash" class="p-button-rounded p-button-danger p-mr-2" @click="confirmDeleteEmployee(data)" />
            <Button icon="pi pi-envelope" class="p-button-rounded p-button-info" @click="openResetPasswordDialog(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Add Employee Dialog -->
    <Dialog v-model:visible="addEmployeeDialog" header="Add New Employee" modal class="p-dialog-responsive" :style="{ width: '30%' }">
      <div class="p-fluid">
        <div class="field">
          <label for="name">Name</label>
          <InputText id="name" v-model="employee.nomEmployee" required class="p-inputtext-lg" />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <InputText id="email" v-model="employee.emailEmployee" required type="email" class="p-inputtext-lg" />
        </div>
        <div class="field">
          <label for="role">Role</label>
          <InputText id="role" v-model="employee.role" required class="p-inputtext-lg" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="hideDialog" />
        <Button label="Save" icon="pi pi-check" class="p-button-text" @click="saveEmployee" />
      </template>
    </Dialog>

    <!-- Edit Employee Dialog -->
    <Dialog v-model:visible="editEmployeeDialog" header="Edit Employee" modal class="p-dialog-responsive" :style="{ width: '30%' }">
      <div class="p-fluid">
        <div class="field">
          <label for="name">Name</label>
          <InputText id="name" v-model="employee.nomEmployee" required class="p-inputtext-lg" />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <InputText id="email" v-model="employee.emailEmployee" required type="email" class="p-inputtext-lg" />
        </div>
        <div class="field">
          <label for="role">Role</label>
          <InputText id="role" v-model="employee.role" required class="p-inputtext-lg" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="hideDialog" />
        <Button label="Save" icon="pi pi-check" class="p-button-text" @click="updateEmployee" />
      </template>
    </Dialog>

    <!-- Reset Password Dialog -->
    <Dialog v-model:visible="resetPasswordDialog" header="Reset Password" modal class="p-dialog-responsive" :style="{ width: '30%' }">
      <div class="p-fluid">
        <div class="field">
          <label for="email">Email</label>
          <InputText id="email" v-model="emailForReset" disabled class="p-inputtext-lg" />
        </div>
        <div class="field">
          <label for="newPassword">New Password</label>
          <InputText id="newPassword" v-model="newPassword" required type="password" class="p-inputtext-lg" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="hideDialog" />
        <Button label="Send" icon="pi pi-check" class="p-button-text" @click="sendResetPasswordEmail" />
      </template>
    </Dialog>

    <!-- Disable Employee Dialog -->
    <Dialog v-model:visible="disableEmployeeDialog" header="Disable Employee" modal class="p-dialog-responsive" :style="{ width: '30%' }">
      <div class="p-fluid">
        <div class="field">
          <label for="disabledUntil">Disable Until</label>
          <input 
            id="disabledUntil" 
            v-model="disabledUntil" 
            type="date" 
            class="p-inputtext-lg" 
          />
        </div>
      </div>

      
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="hideDialog" />
        <Button label="Disable" icon="pi pi-check" class="p-button-text" @click="disableEmployee" />
      </template>
    </Dialog>
           
    <!-- Delete Employee Dialog -->
    <Dialog v-model:visible="deleteEmployeeDialog" header="Confirm" modal class="p-dialog-responsive" :style="{ width: '30%' }">
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle" style="font-size: 2rem"></i>
        <span>Are you sure you want to delete <b>{{ employeeToDelete?.nomEmployee }}</b>?</span>
      </div>
         
      <template #footer>
        <Button label="No" icon="pi pi-times" class="p-button-text" @click="hideDialog" />
        <Button label="Yes" icon="pi pi-check" class="p-button-text" @click="deleteEmployee" />
      </template>
    </Dialog>
  </div>
</template>




<style scoped>
.employee-page {
    max-width: 1200px;
    margin: 0 auto;
}


.card {
    background: var(--surface-card);
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}


.field {
    margin-bottom: 1.5rem;
}

.p-fluid .field label {
    font-weight: bold;
    margin-bottom: 0.5rem;
    display: block;  /* Ensure labels are block-level elements */
}

.p-fluid .field .p-inputtext-lg {
    width: 100%;
    padding: 0.75rem;  /* Add padding for better spacing */
    font-size: 1rem;
    border-radius: 5px;
}

</style>
