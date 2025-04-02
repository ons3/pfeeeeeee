<script setup>
import { ref, onMounted, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Calendar from 'primevue/calendar';
import Tag from 'primevue/tag';
import Password from 'primevue/password';
import ProgressSpinner from 'primevue/progressspinner';
import axios from 'axios';

const toast = useToast();
const dt = ref();
const employees = ref([]);
const teams = ref([]);
const loading = ref(false);

// Dialog state variables
const addEmployeeDialog = ref(false);
const editEmployeeDialog = ref(false);
const deleteEmployeeDialog = ref(false);
const disableEmployeeDialog = ref(false);
const resetPasswordDialog = ref(false);

const employee = ref({
  nom_employee: '',
  email_employee: '',
  password_employee: '',
  idEquipe: null,
  role: 'EMPLOYEE'
});

const submitted = ref(false);
const searchQuery = ref('');
const newPassword = ref('');
const disableUntilDate = ref(null);
const selectedEmployees = ref([]);

const roles = ref([
  { name: 'Admin', value: 'ADMIN' },
  { name: 'Employee', value: 'EMPLOYEE' },
  { name: 'Manager', value: 'MANAGER' }
]);

// Computed property for dialog visibility
const isEmployeeDialogVisible = computed(() => addEmployeeDialog.value || editEmployeeDialog.value);

// Fetch employees with proper error handling
const fetchEmployees = async () => {
  loading.value = true;
  try {
    const query = `
      query {
        employees {
          employees {
            idEmployee
            nom_employee
            email_employee
            role
            idEquipe
            disabledUntil
          }
        }
        teams {
          idEquipe
          nom_equipe
        }
      }
    `;
    
    const response = await axios.post('http://localhost:3000/graphql', { 
      query,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    if (response.data?.data?.employees?.employees) {
      employees.value = response.data.data.employees.employees.map(emp => ({
        ...emp,
        disabledUntil: emp.disabledUntil ? new Date(emp.disabledUntil) : null
      }));
      teams.value = response.data.data.teams || [];
    } else {
      throw new Error('No employees data received');
    }
  } catch (error) {
    console.error("Error fetching employees:", error);
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: error.message || 'Failed to load employees', 
      life: 5000 
    });
  } finally {
    loading.value = false;
  }
};

// Dialog functions
const openNew = () => {
  employee.value = {
    nom_employee: '',
    email_employee: '',
    password_employee: '',
    idEquipe: null,
    role: ''
  };
  submitted.value = false;
  addEmployeeDialog.value = true;
};

const openEdit = (emp) => {
  employee.value = { ...emp };
  editEmployeeDialog.value = true;
};

const confirmDeleteEmployee = (emp) => {
  employee.value = emp;
  deleteEmployeeDialog.value = true;
};

const openDisableDialog = (emp) => {
  employee.value = emp;
  disableUntilDate.value = emp.disabledUntil ? new Date(emp.disabledUntil) : null;
  disableEmployeeDialog.value = true;
};

const openResetPasswordDialog = (emp) => {
  employee.value = emp;
  resetPasswordDialog.value = true;
  newPassword.value = '';
};

// CRUD Operations
const saveEmployee = async () => {
  submitted.value = true;

  const requiredFields = ['nom_employee', 'email_employee', 'role'];
  const missingField = requiredFields.find(field => !employee.value[field]);

  if (missingField) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: `Please fill ${missingField.replace('_', ' ')}`, life: 3000 });
    return;
  }

  try {
    if (!employee.value.idEmployee) {
      // Create employee
      const mutation = `
        mutation CreateEmployee(
          $nomEmployee: String!,
          $emailEmployee: String!,
          $passwordEmployee: String!,
          $idEquipe: String,
          $role: String!,
          $disabledUntil: String
        ) {
          createEmployee(
            nomEmployee: $nomEmployee,
            emailEmployee: $emailEmployee,
            passwordEmployee: $passwordEmployee,
            idEquipe: $idEquipe,
            role: $role,
            disabledUntil: $disabledUntil
          ) {
            idEmployee
            nomEmployee
            emailEmployee
            role
            idEquipe
            disabledUntil
          }
        }
      `;

      const variables = {
        nomEmployee: employee.value.nom_employee,
        emailEmployee: employee.value.email_employee,
        passwordEmployee: employee.value.password_employee,
        idEquipe: employee.value.idEquipe,
        role: employee.value.role,
        disabledUntil: employee.value.disabledUntil ? employee.value.disabledUntil.toISOString() : null,
      };

      await axios.post('http://localhost:3000/graphql', { query: mutation, variables });

      toast.add({ severity: 'success', summary: 'Success', detail: 'Employee created', life: 3000 });
    } else {
      // Update employee
      const mutation = `
        mutation UpdateEmployee(
          $id: String!,
          $nomEmployee: String,
          $emailEmployee: String,
          $passwordEmployee: String,
          $idEquipe: String,
          $role: String,
          $disabledUntil: String
        ) {
          updateEmployee(
            id: $id,
            nomEmployee: $nomEmployee,
            emailEmployee: $emailEmployee,
            passwordEmployee: $passwordEmployee,
            idEquipe: $idEquipe,
            role: $role,
            disabledUntil: $disabledUntil
          ) {
            idEmployee
            nomEmployee
            emailEmployee
            role
            idEquipe
            disabledUntil
          }
        }
      `;

      const variables = {
        id: employee.value.idEmployee,
        nomEmployee: employee.value.nom_employee,
        emailEmployee: employee.value.email_employee,
        idEquipe: employee.value.idEquipe,
        role: employee.value.role,
        disabledUntil: employee.value.disabledUntil ? employee.value.disabledUntil.toISOString() : null,
      };

      // Only include password if it's being changed
      if (employee.value.password_employee) {
        variables.passwordEmployee = employee.value.password_employee;
      }

      await axios.post('http://localhost:3000/graphql', { query: mutation, variables });

      toast.add({ severity: 'success', summary: 'Success', detail: 'Employee updated', life: 3000 });
    }

    hideDialog();
    fetchEmployees();
  } catch (error) {
    console.error("Error saving employee:", error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.errors?.[0]?.message || 'Operation failed',
      life: 5000,
    });
  }
};

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
    
    const response = await axios.post('http://localhost:3000/graphql', { 
      query: mutation,
      variables: { id: employee.value.idEmployee }
    });
    
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    
    toast.add({ 
      severity: 'success', 
      summary: 'Success', 
      detail: response.data.data.deleteEmployee.message, 
      life: 3000 
    });
    hideDialog();
    fetchEmployees();
  } catch (error) {
    console.error("Error deleting employee:", error);
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: error.message || 'Failed to delete employee', 
      life: 5000 
    });
  }
};

const disableEmployee = async () => {
  try {
    const mutation = `
      mutation UpdateEmployee($id: String!, $disabledUntil: String) {
        updateEmployee(id: $id, disabledUntil: $disabledUntil) {
          idEmployee
          disabledUntil
        }
      }
    `;
    
    const variables = {
      id: employee.value.idEmployee,
      disabledUntil: disableUntilDate.value ? disableUntilDate.value.toISOString() : null
    };
    
    const response = await axios.post('http://localhost:3000/graphql', { 
      query: mutation,
      variables
    });
    
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    
    toast.add({ 
      severity: 'success', 
      summary: 'Success', 
      detail: variables.disabledUntil 
        ? `Account disabled until ${new Date(variables.disabledUntil).toLocaleDateString()}` 
        : 'Account enabled',
      life: 3000 
    });
    
    hideDialog();
    fetchEmployees();
  } catch (error) {
    console.error("Error updating account status:", error);
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: error.message || 'Failed to update status', 
      life: 5000 
    });
  }
};

const resetPassword = async () => {
  if (!newPassword.value) {
    toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please enter new password', life: 3000 });
    return;
  }

  try {
    const mutation = `
      mutation UpdateEmployee($id: String!, $passwordEmployee: String!) {
        updateEmployee(id: $id, passwordEmployee: $passwordEmployee) {
          idEmployee
        }
      }
    `;
    
    const response = await axios.post('http://localhost:3000/graphql', { 
      query: mutation,
      variables: {
        id: employee.value.idEmployee,
        passwordEmployee: newPassword.value
      }
    });
    
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    
    toast.add({ 
      severity: 'success', 
      summary: 'Success', 
      detail: 'Password updated', 
      life: 3000 
    });
    hideDialog();
  } catch (error) {
    console.error("Error resetting password:", error);
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: error.message || 'Failed to reset password', 
      life: 5000 
    });
  }
};

// Helper functions
const hideDialog = () => {
  addEmployeeDialog.value = false;
  editEmployeeDialog.value = false;
  deleteEmployeeDialog.value = false;
  disableEmployeeDialog.value = false;
  resetPasswordDialog.value = false;
  submitted.value = false;
};

const formatDate = (date) => {
  return date ? new Date(date).toLocaleDateString() : 'Active';
};

const getTeamName = (idEquipe) => {
  const team = teams.value.find(t => t.idEquipe === idEquipe);
  return team ? team.nom_equipe : 'No team';
};

const filteredEmployees = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return employees.value.filter(emp => 
    emp.nom_employee.toLowerCase().includes(query) || 
    emp.email_employee.toLowerCase().includes(query) ||
    emp.role.toLowerCase().includes(query)
  );
});

const confirmDeleteSelected = () => {
  if (selectedEmployees.value.length) {
    deleteEmployeeDialog.value = true;
  }
};

const exportCSV = () => {
  dt.value.exportCSV();
};

onMounted(() => {
  fetchEmployees();
});
</script>

<template>
  <div class="p-4 employee-page">
    <div class="card">
      <Toolbar class="mb-4">
        <template #start>
          <Button label="New Employee" icon="pi pi-plus" class="mr-2" @click="openNew" />
          <Button label="Delete" icon="pi pi-trash" severity="danger" @click="confirmDeleteSelected" :disabled="!selectedEmployees?.length" />
        </template>
        <template #end>
          <Button label="Export" icon="pi pi-upload" @click="exportCSV" />
        </template>
      </Toolbar>

      <div v-if="loading" class="flex align-items-center justify-content-center">
        <ProgressSpinner style="width: 50px; height: 50px" />
      </div>

      <DataTable
        ref="dt"
        v-model:selection="selectedEmployees"
        :value="filteredEmployees"
        :loading="loading"
        dataKey="idEmployee"
        :paginator="true"
        :rows="10"
        :filters="filters"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        :rowsPerPageOptions="[5, 10, 25]"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} employees"
      >
        <template #header>
          <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
            <h4 class="m-0">Manage Employees</h4>
            <span class="p-input-icon-left">
              <i class="pi pi-search" />
              <InputText v-model="searchQuery" placeholder="Search employees..." />
            </span>
          </div>
        </template>

        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
        <Column field="nom_employee" header="Name" sortable></Column>
        <Column field="email_employee" header="Email" sortable></Column>
        <Column field="role" header="Role" sortable>
          <template #body="{ data }">
            <Tag :value="data.role" :severity="data.role === 'ADMIN' ? 'danger' : data.role === 'MANAGER' ? 'warning' : 'info'" />
          </template>
        </Column>
        <Column header="Team">
          <template #body="{ data }">
            {{ getTeamName(data.idEquipe) }}
          </template>
        </Column>
        <Column field="disabledUntil" header="disabledUntil" sortable>
          <template #body="{ data }">
            <Tag :value="formatDate(data.disabledUntil)" :severity="data.disabledUntil && new Date(data.disabledUntil) > new Date() ? 'Active' : 'Desactive'" />
          </template>
        </Column>
        <Column header="Actions" headerStyle="width: 10rem">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" class="mr-2" outlined @click="openEdit(data)" />
            <Button icon="pi pi-lock" class="mr-2" outlined @click="openDisableDialog(data)" />
            <Button icon="pi pi-trash" severity="danger" outlined @click="confirmDeleteEmployee(data)" />
            <Button icon="pi pi-envelope" class="p-button-rounded p-button-info" @click="openResetPasswordDialog(data)" />

          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Dialogs -->
    <Dialog v-model:visible="isEmployeeDialogVisible" :style="{ width: '700px' }" header="Employee Details" :modal="true" :closable="false">
      <div class="flex flex-col gap-4">
        <div class="field">
          <label for="name" class="font-bold block mb-2">Name *</label>
          <InputText id="name" v-model.trim="employee.nom_employee" required autofocus :class="{ 'p-invalid': submitted && !employee.nom_employee }" class="w-full" />
          <small v-if="submitted && !employee.nom_employee" class="p-error">Name is required.</small>
        </div>

        <div class="field">
          <label for="email" class="font-bold block mb-2">Email *</label>
          <InputText id="email" v-model.trim="employee.email_employee" required :class="{ 'p-invalid': submitted && !employee.email_employee }" class="w-full" />
          <small v-if="submitted && !employee.email_employee" class="p-error">Email is required.</small>
        </div>

        <div class="field" v-if="!employee.idEmployee">
          <label for="password" class="font-bold block mb-2">Password *</label>
          <Password id="password" v-model="employee.password_employee" required toggleMask :class="{ 'p-invalid': submitted && !employee.password_employee }" class="w-full" />
          <small v-if="submitted && !employee.password_employee" class="p-error">Password is required.</small>
        </div>

        <div class="field">
          <label for="role" class="font-bold block mb-2">Role *</label>
          <InputText 
            id="role" 
            v-model.trim="employee.role" 
            required 
            :class="{ 'p-invalid': submitted && !employee.role }" 
            class="w-full" 
          />
          <small v-if="submitted && !employee.role" class="p-error">Role is required.</small>
        </div>

        <div class="field">
          <label for="team" class="font-bold block mb-2">Team</label>
          <Dropdown id="team" v-model="employee.idEquipe" :options="teams" optionLabel="nom_equipe" optionValue="idEquipe" placeholder="Select a Team" class="w-full" />
        </div>

        <div class="field">
          <label for="disabledUntil" class="font-bold block mb-2">Disabled Until</label>
          <Calendar 
            id="disabledUntil" 
            v-model="employee.disabledUntil" 
            :showIcon="true" 
            class="w-full" 
            placeholder="Select a date" 
            dateFormat="yy-mm-dd" 
          />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" @click="hideDialog" class="p-button-text" />
        <Button label="Save" icon="pi pi-check" @click="saveEmployee" :loading="loading" autofocus />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.employee-page .p-dialog .p-dialog-content {
  padding: 1.5rem;
}

.field {
  margin-bottom: 1.5rem;
}

.p-error {
  display: block;
  margin-top: 0.5rem;
  color: #f44336;
  font-size: 0.875rem;
}

.flex.gap-2 {
  display: flex;
  gap: 0.5rem;
}

.card {
  background: var(--surface-card);
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.p-calendar:disabled {
  opacity: 0.8;
  background-color: #f5f5f5;
}
</style>