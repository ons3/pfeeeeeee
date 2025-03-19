<script setup>
import { ref, onMounted } from 'vue';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const dt = ref();
const employees = ref([]);
const employeeDialog = ref(false);
const deleteEmployeeDialog = ref(false);
const deleteEmployeesDialog = ref(false);
const employee = ref({});
const selectedEmployees = ref([]);
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);
const statuses = ref([
    { label: 'ACTIVE', value: 'active' },
    { label: 'INACTIVE', value: 'inactive' }
]);

// Helper Functions
const formatCurrency = (value) => {
    return value ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '';
};

const openNew = () => {
    employee.value = {};
    submitted.value = false;
    employeeDialog.value = true;
};

const hideDialog = () => {
    employeeDialog.value = false;
    submitted.value = false;
};

const saveEmployee = () => {
    submitted.value = true;

    if (employee.value.name?.trim()) {
        if (employee.value.id) {
            const index = findIndexById(employee.value.id);
            employees.value[index] = { ...employee.value };
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Employee Updated', life: 3000 });
        } else {
            employee.value.id = createId();
            employee.value.name = employee.value.name.trim();
            employee.value.description = employee.value.description || '';
            employees.value.push({ ...employee.value });
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Employee Created', life: 3000 });
        }

        employeeDialog.value = false;
        employee.value = {};
    }
};

const editEmployee = (emp) => {
    employee.value = { ...emp };
    employeeDialog.value = true;
};

const confirmDeleteEmployee = (emp) => {
    employee.value = emp;
    deleteEmployeeDialog.value = true;
};

const deleteEmployee = () => {
    employees.value = employees.value.filter((val) => val.id !== employee.value.id);
    deleteEmployeeDialog.value = false;
    employee.value = {};
    toast.add({ severity: 'success', summary: 'Successful', detail: 'Employee Deleted', life: 3000 });
};

const findIndexById = (id) => {
    return employees.value.findIndex((emp) => emp.id === id);
};

const createId = () => {
    return Math.random().toString(36).substring(2, 9);
};

const exportCSV = () => {
    dt.value.exportCSV();
};

const confirmDeleteSelected = () => {
    deleteEmployeesDialog.value = true;
};

const deleteSelectedEmployees = () => {
    employees.value = employees.value.filter((val) => !selectedEmployees.value.includes(val));
    deleteEmployeesDialog.value = false;
    selectedEmployees.value = [];
    toast.add({ severity: 'success', summary: 'Successful', detail: 'Employees Deleted', life: 3000 });
};

const getStatusLabel = (status) => {
    return status === 'ACTIVE' ? 'success' : 'warn';
};

// Add 20 sample employees on component mount
onMounted(() => {
    for (let i = 1; i <= 20; i++) {
        employees.value.push({
            id: createId(),
            name: `Employee ${i}`,
            description: `Description for Employee ${i}`,
            status: i % 2 === 0 ? 'ACTIVE' : 'INACTIVE'
        });
    }
});
</script>

<template>
    <div class="employee-page p-4">
        <div class="card">
            <!-- Toolbar -->
            <Toolbar class="mb-4">
                <template #start>
                    <Button label="New" icon="pi pi-plus" class="mr-2" @click="openNew" />
                    <Button label="Delete" icon="pi pi-trash" severity="danger" @click="confirmDeleteSelected" :disabled="!selectedEmployees || !selectedEmployees.length" />
                </template>
                <template #end>
                    <Button label="Export" icon="pi pi-upload" @click="exportCSV" />
                </template>
            </Toolbar>

            <!-- DataTable -->
            <DataTable
                ref="dt"
                v-model:selection="selectedEmployees"
                :value="employees"
                dataKey="id"
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
                        <IconField iconPosition="left">
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Search..." />
                        </IconField>
                    </div>
                </template>

                <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
                <Column field="id" header="ID" sortable></Column>
                <Column field="name" header="Name" sortable></Column>
                <Column field="description" header="Description" sortable></Column>
                <Column field="status" header="Status" sortable>
                    <template #body="{ data }">
                        <Tag :value="data.status" :severity="getStatusLabel(data.status)" />
                    </template>
                </Column>
                <Column header="Actions" headerStyle="width: 10rem">
                    <template #body="{ data }">
                        <Button icon="pi pi-pencil" class="mr-2" outlined @click="editEmployee(data)" />
                        <Button icon="pi pi-trash" severity="danger" outlined @click="confirmDeleteEmployee(data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Employee Dialog -->
        <Dialog v-model:visible="employeeDialog" :style="{ width: '450px' }" header="Employee Details" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="name" class="block font-bold mb-3">Name</label>
                    <InputText id="name" v-model.trim="employee.name" required="true" autofocus :invalid="submitted && !employee.name" fluid />
                    <small v-if="submitted && !employee.name" class="text-red-500">Name is required.</small>
                </div>
                <div>
                    <label for="description" class="block font-bold mb-3">Description</label>
                    <Textarea id="description" v-model="employee.description" rows="3" cols="20" fluid />
                </div>
                <div>
                    <label for="status" class="block font-bold mb-3">Status</label>
                    <Select id="status" v-model="employee.status" :options="statuses" optionLabel="label" placeholder="Select a Status" fluid />
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Save" icon="pi pi-check" @click="saveEmployee" />
            </template>
        </Dialog>

        <!-- Delete Employee Dialog -->
        <Dialog v-model:visible="deleteEmployeeDialog" header="Confirm" :modal="true" :style="{ width: '450px' }">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-3xl" />
                <span
                    >Are you sure you want to delete <b>{{ employee.name }}</b
                    >?</span
                >
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteEmployeeDialog = false" />
                <Button label="Yes" icon="pi pi-check" severity="danger" @click="deleteEmployee" />
            </template>
        </Dialog>

        <!-- Delete Selected Employees Dialog -->
        <Dialog v-model:visible="deleteEmployeesDialog" header="Confirm" :modal="true" :style="{ width: '450px' }">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-3xl" />
                <span>Are you sure you want to delete the selected employees?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteEmployeesDialog = false" />
                <Button label="Yes" icon="pi pi-check" severity="danger" @click="deleteSelectedEmployees" />
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
}
</style>
