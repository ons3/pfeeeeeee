<script setup>
import { ref, onMounted } from 'vue';

// Reactive state for profile data
const profile = ref({
    name: 'Votre Nom Complet',
    username: '@votre_pseudo',
    email: 'votre.email@example.com',
    bio: 'Ma bio personnelle - décrivez-vous en quelques mots',
    location: 'Votre ville, Pays',
    occupation: 'Votre profession',
    followers: 0,
    following: 0,
    posts: 0,
    profileImage: '/api/placeholder/200/200',
    coverImage: '/api/placeholder/800/300',
    role: '', // Add role field
});

// Your personal skills or interests
const skills = ref(['Développement Web', 'Vue.js', 'Design', 'Autre compétence 1', 'Autre compétence 2']);

// Your personal projects or recent work
const projects = ref([
    {
        id: 1,
        name: 'Projet 1',
        description: 'Description de votre premier projet',
        technologies: ['Vue.js', 'JavaScript', 'CSS'],
        link: '#'
    },
    {
        id: 2,
        name: 'Projet 2',
        description: 'Description de votre deuxième projet',
        technologies: ['React', 'Node.js', 'MongoDB'],
        link: '#'
    }
]);

// Reactive state for contact modal
const isContactModalOpen = ref(false);

// Method to toggle contact modal
const toggleContactModal = () => {
    isContactModalOpen.value = !isContactModalOpen.value;
};

// On mounted, retrieve the user data from localStorage
onMounted(() => {
    const administrateur = JSON.parse(localStorage.getItem('administrateur'));
    const employee = JSON.parse(localStorage.getItem('employee'));

    if (administrateur) {
        // Update profile data based on the administrateur object from localStorage
        profile.value.name = administrateur.nom_administrateur;
        profile.value.email = administrateur.email_administrateur;
        profile.value.id = administrateur.idAdministrateur;
        profile.value.role = administrateur.role || 'Admin'; // Set role from DB or default to 'Admin'
    } else if (employee) {
        // Update profile data based on the employee object from localStorage
        profile.value.name = employee.nomEmployee;
        profile.value.email = employee.emailEmployee;
        profile.value.id = employee.idEmployee;
        profile.value.role = employee.role || 'Employee'; // Set role from DB or default to 'Employee'
    }
});
</script>

<template>
    <div class="personal-profile-container">
        <!-- Cover Image -->

        <!-- Profile Header -->
        <div class="profile-header">
            <div class="profile-image-container">
                <img :src="profile.profileImage" alt="" class="profile-image" />
            </div>
            <div class="profile-info">
               <h1 class="profile-name">{{ profile.name }}</h1>
                <!--- <p class="profile-email">{{ profile.email }}</p>-->
                <div class="profile-details">
                    <p><strong>📍 Localisation:</strong> Tunisie</p>
                    <p><strong>💼 Profession:</strong> {{ profile.role }}</p>
                </div>

                <button @click="toggleContactModal" class="contact-button">Me Contacter</button>
            </div>
        </div>

        <!-- Skills Section -->
        <div class="skills-section">
            <h2>Compétences</h2>
            <div class="skills-list">
                <span v-for="skill in skills" :key="skill" class="skill-tag">
                    {{ skill }}
                </span>
            </div>
        </div>

        <!-- Projects Section -->
        <div class="projects-section">
            <h2>Projets</h2>
            <div class="projects-grid">
                <div v-for="project in projects" :key="project.id" class="project-card">
                    <h3>{{ project.name }}</h3>
                    <p>{{ project.description }}</p>
                    <div class="project-technologies">
                        <span v-for="tech in project.technologies" :key="tech" class="tech-tag">
                            {{ tech }}
                        </span>
                    </div>
                    <a :href="project.link" target="_blank" class="project-link"> Voir le projet </a>
                </div>
            </div>
        </div>

        <!-- Contact Modal (Simple Version) -->
        <div v-if="isContactModalOpen" class="contact-modal">
            <div class="modal-content">
                <h2>Me Contacter</h2>
                <p><strong>Email:</strong> {{ profile.email }}</p>
                <button @click="toggleContactModal" class="close-modal-button">Fermer</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.personal-profile-container {
    max-width: 800px;
    margin: 0 auto;
    font-family: 'Arial', sans-serif;
    background-color: #f4f4f4;
}

.cover-image-container {
    width: 100%;
    height: 300px;
    overflow: hidden;
}

.cover-image {
    width: 100%;
    height: 300px;
    object-fit: cover;
}

.profile-header {
    display: flex;
    align-items: center;
    padding: 20px;
    background-color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.profile-image-container {
    margin-right: 30px;
}

.profile-image {
    width: 180px;
    height: 180px;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid white;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.profile-info {
    flex-grow: 1;
}

.profile-name {
    font-size: 28px;
    margin: 0 0 10px;
    color: #333;
}

.profile-username {
    color: #666;
    margin: 0 0 15px;
}

.profile-bio {
    margin: 0 0 20px;
    color: #444;
}

.profile-details {
    margin-bottom: 20px;
}

.contact-button {
    padding: 12px 24px;
    background-color: #0066cc;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.contact-button:hover {
    background-color: #0052a3;
}

.skills-section,
.projects-section {
    padding: 20px;
    background-color: white;
    margin-top: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.skills-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.skill-tag {
    background-color: #f0f0f0;
    padding: 8px 12px;
    border-radius: 20px;
    font-size: 14px;
}

.projects-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
}

.project-card {
    border: 1px solid #e0e0e0;
    padding: 20px;
    border-radius: 8px;
    background-color: #f9f9f9;
}

.project-technologies {
    display: flex;
    gap: 10px;
    margin: 10px 0;
}

.tech-tag {
    background-color: #e6f2ff;
    padding: 5px 10px;
    border-radius: 15px;
    font-size: 12px;
}

.project-link {
    display: inline-block;
    background-color: #0066cc;
    color: white;
    padding: 8px 16px;
    text-decoration: none;
    border-radius: 5px;
    margin-top: 10px;
}

.contact-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background-color: white;
    padding: 30px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.close-modal-button {
    margin-top: 20px;
    padding: 10px 20px;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}
</style>
