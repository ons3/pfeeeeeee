<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useMutation } from '@vue/apollo-composable';
import {
  ADD_TEAM_TO_PROJECT,
  REMOVE_TEAM_FROM_PROJECT
} from '@/graphql';

const toast = useToast();
const props = defineProps({
  items: Array, // List of items to display (teams or projects)
  selectedItem: Object, // Currently selected item (team or project)
  itemLabel: String, // Label for the item (e.g., "Team" or "Project")
  relationshipType: String // Either 'project' or 'team'
});

const { mutate: addTeamToProject } = useMutation(ADD_TEAM_TO_PROJECT);
const { mutate: removeTeamFromProject } = useMutation(REMOVE_TEAM_FROM_PROJECT);

const selectedItem = ref(null);

const addRelationship = async () => {
  if (!selectedItem.value) {
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: `Please select a ${props.itemLabel.toLowerCase()}.`, 
      life: 3000 
    });
    return;
  }

  try {
    const variables = {
      idProjet: props.relationshipType === 'project' ? props.selectedItem.id : selectedItem.value.id,
      idEquipe: props.relationshipType === 'team' ? props.selectedItem.id : selectedItem.value.id
    };

    await addTeamToProject(variables);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `${props.itemLabel} added successfully`,
      life: 3000
    });
  } catch (error) {
    console.error('Error adding relationship:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to add ${props.itemLabel.toLowerCase()}`,
      life: 3000
    });
  } finally {
    selectedItem.value = null;
  }
};

const removeRelationship = async (parentId, itemId) => {
  try {
    const variables = {
      idProjet: props.relationshipType === 'project' ? parentId : itemId,
      idEquipe: props.relationshipType === 'team' ? parentId : itemId
    };

    await removeTeamFromProject(variables);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `${props.itemLabel} removed successfully`,
      life: 3000
    });
  } catch (error) {
    console.error('Error removing relationship:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to remove ${props.itemLabel.toLowerCase()}`,
      life: 3000
    });
  }
};
</script>

<template>
  <div>
    <label class="block mb-3 font-bold">{{ itemLabel }}s</label>
    <div v-if="props.selectedItem">
      <div class="flex flex-wrap gap-2 mb-4">
        <Chip
          v-for="item in props.items.filter(i => 
            props.relationshipType === 'project' 
              ? i.projets?.some(p => p.idProjet === props.selectedItem.id)
              : i.equipes?.some(e => e.idEquipe === props.selectedItem.id)
          )"
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
          :options="props.items.filter(i => 
            props.relationshipType === 'project'
              ? !i.projets?.some(p => p.idProjet === props.selectedItem.id)
              : !i.equipes?.some(e => e.idEquipe === props.selectedItem.id)
          )"
          :optionLabel="itemLabel === 'Team' ? 'nom_equipe' : 'nom_projet'"
          :placeholder="`Select a ${itemLabel}`"
          class="w-full"
        />
        <Button 
          :label="`Add ${itemLabel}`" 
          icon="pi pi-plus" 
          @click="addRelationship" 
          class="mt-2" 
        />
      </div>
    </div>
    <div v-else>
      <p>Save the {{ itemLabel.toLowerCase() }} first to manage relationships.</p>
    </div>
  </div>
</template>