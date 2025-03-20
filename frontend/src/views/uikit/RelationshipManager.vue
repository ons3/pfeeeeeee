<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const props = defineProps({
    items: Array, // List of items to display (teams or projects)
    selectedItem: Object, // Currently selected item (team or project)
    relationships: Array, // List of relationships (projetEquipes)
    getRelatedItems: Function, // Function to get related items
    addRelationship: Function, // Function to add a relationship
    removeRelationship: Function, // Function to remove a relationship
    itemLabel: String, // Label for the item (e.g., "Team" or "Project")
});

const selectedItem = ref(null);

const addItem = () => {
    if (!selectedItem.value) {
        toast.add({ severity: 'error', summary: 'Error', detail: `Please select a ${props.itemLabel.toLowerCase()}.`, life: 3000 });
        return;
    }
    props.addRelationship(selectedItem.value);
    selectedItem.value = null;
};
</script>

<template>
    <div>
        <label class="block mb-3 font-bold">{{ itemLabel }}s</label>
        <div v-if="props.selectedItem">
            <div class="flex flex-wrap gap-2 mb-4">
                <Chip
                    v-for="item in getRelatedItems(props.selectedItem.id)"
                    :key="item.id"
                    :label="item.nom_equipe || item.nom_projet"
                    class="mr-2"
                    removable
                    @remove="removeRelationship(props.selectedItem.id, item.id)"
                />
            </div>
            <div class="flex gap-2">
                <Dropdown
                    v-model="selectedItem"
                    :options="items"
                    :optionLabel="itemLabel === 'Team' ? 'nom_equipe' : 'nom_projet'"
                    :placeholder="`Select a ${itemLabel}`"
                    class="w-full"
                />
                <Button :label="`Add ${itemLabel}`" icon="pi pi-plus" @click="addItem" class="mt-2" />
            </div>
        </div>
        <div v-else>
            <p>Save the {{ itemLabel.toLowerCase() }} first to add {{ itemLabel.toLowerCase() }}s.</p>
        </div>
    </div>
</template>
