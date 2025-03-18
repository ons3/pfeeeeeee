<script setup>
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const toast = useToast();
const dt = ref();
const equipes = ref([]);
const equipeDialog = ref(false);
const deleteEquipeDialog = ref(false);
const deleteEquipesDialog = ref(false);
const equipe = ref({});
const selectedEquipes = ref();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);
const statuses = ref([
    { label: 'ACTIVE', value: 'active' },
    { label: 'INACTIVE', value: 'inactive' }
]);

function formatCurrency(value) {
    if (value) return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    return;
}

function openNew() {
    equipe.value = {};
    submitted.value = false;
    equipeDialog.value = true;
}

function hideDialog() {
    equipeDialog.value = false;
    submitted.value = false;
}

function saveEquipe() {
    submitted.value = true;

    if (equipe?.value.nom_equipe?.trim()) {
        if (equipe.value.idEquipe) {
            equipes.value[findIndexById(equipe.value.idEquipe)] = equipe.value;
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Equipe Updated', life: 3000 });
        } else {
            equipe.value.idEquipe = createId();
            equipe.value.nom_equipe = equipe.value.nom_equipe.trim();
            equipe.value.description_equipe = equipe.value.description_equipe || '';
            equipes.value.push(equipe.value);
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Equipe Created', life: 3000 });
        }

        equipeDialog.value = false;
        equipe.value = {};
    }
}

function editEquipe(eq) {
    equipe.value = { ...eq };
    equipeDialog.value = true;
}

function confirmDeleteEquipe(eq) {
    equipe.value = eq;
    deleteEquipeDialog.value = true;
}

function deleteEquipe() {
    equipes.value = equipes.value.filter((val) => val.idEquipe !== equipe.value.idEquipe);
    deleteEquipeDialog.value = false;
    equipe.value = {};
    toast.add({ severity: 'success', summary: 'Successful', detail: 'Equipe Deleted', life: 3000 });
}

function findIndexById(id) {
    let index = -1;
    for (let i = 0; i < equipes.value.length; i++) {
        if (equipes.value[i].idEquipe === id) {
            index = i;
            break;
        }
    }

    return index;
}

function createId() {
    let id = '';
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < 5; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

function exportCSV() {
    dt.value.exportCSV();
}

function confirmDeleteSelected() {
    deleteEquipesDialog.value = true;
}

function deleteSelectedEquipes() {
    equipes.value = equipes.value.filter((val) => !selectedEquipes.value.includes(val));
    deleteEquipesDialog.value = false;
    selectedEquipes.value = null;
    toast.add({ severity: 'success', summary: 'Successful', detail: 'Equipes Deleted', life: 3000 });
}

function getStatusLabel(status) {
    switch (status) {
        case 'ACTIVE':
            return 'success';

        case 'INACTIVE':
            return 'warn';

        default:
            return null;
    }
}
</script>

<template>
    <div>
        <div class="card">
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="New" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                    <Button label="Delete" icon="pi pi-trash" severity="secondary" @click="confirmDeleteSelected" :disabled="!selectedEquipes || !selectedEquipes.length" />
                </template>

                <template #end>
                    <Button label="Export" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                v-model:selection="selectedEquipes"
                :value="equipes"
                dataKey="idEquipe"
                :paginator="true"
                :rows="10"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} equipes"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">Manage Equipes</h4>
                        <IconField>
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Search..." />
                        </IconField>
                    </div>
                </template>

                <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
                <Column field="idEquipe" header="ID" sortable style="min-width: 12rem"></Column>
                <Column field="nom_equipe" header="Nom" sortable style="min-width: 16rem"></Column>
                <Column field="description_equipe" header="Description" sortable style="min-width: 12rem"></Column>
                <Column field="status" header="Status" sortable style="min-width: 12rem">
                    <template #body="slotProps">
                        <Tag :value="slotProps.data.status" :severity="getStatusLabel(slotProps.data.status)" />
                    </template>
                </Column>
                <Column :exportable="false" style="min-width: 12rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editEquipe(slotProps.data)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteEquipe(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="equipeDialog" :style="{ width: '450px' }" header="Equipe Details" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="nom_equipe" class="block font-bold mb-3">Nom</label>
                    <InputText id="nom_equipe" v-model.trim="equipe.nom_equipe" required="true" autofocus :invalid="submitted && !equipe.nom_equipe" fluid />
                    <small v-if="submitted && !equipe.nom_equipe" class="text-red-500">Nom is required.</small>
                </div>
                <div>
                    <label for="description_equipe" class="block font-bold mb-3">Description</label>
                    <Textarea id="description_equipe" v-model="equipe.description_equipe" rows="3" cols="20" fluid />
                </div>

                <div>
                    <label for="status" class="block font-bold mb-3">Status</label>
                    <Select id="status" v-model="equipe.status" :options="statuses" optionLabel="label" placeholder="Select a Status" fluid></Select>
                </div>
            </div>

            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Save" icon="pi pi-check" @click="saveEquipe" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteEquipeDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="equipe">Are you sure you want to delete <b>{{ equipe.nom_equipe }}</b>?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteEquipeDialog = false" />
                <Button label="Yes" icon="pi pi-check" @click="deleteEquipe" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteEquipesDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="equipe">Are you sure you want to delete the selected equipes?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteEquipesDialog = false" />
                <Button label="Yes" icon="pi pi-check" text @click="deleteSelectedEquipes" />
            </template>
        </Dialog>
    </div>
</template>
