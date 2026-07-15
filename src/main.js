// Outil d'organisation de soirée - Logique applicative
import './style.css';

// Initialisation de l'état
const state = {
  guests: [],
  notes: '',
  searchQuery: '',
  editingGuestId: null // stocke l'ID de l'invité en cours d'édition, ou null si création
};

// Sélecteurs du DOM
const guestForm = document.getElementById('guest-form');
const guestNameInput = document.getElementById('guest-name');
const guestLateSelect = document.getElementById('guest-late');
const guestFierSelect = document.getElementById('guest-fier');
const guestLodgingSelect = document.getElementById('guest-lodging');
const guestDietInput = document.getElementById('guest-diet');
const guestAllergiesInput = document.getElementById('guest-allergies');
const guestAlcoholInput = document.getElementById('guest-alcohol');

const searchInput = document.getElementById('search-guest');
const guestsList = document.getElementById('guests-list');
const emptyState = document.getElementById('empty-state');
const generalNotesInput = document.getElementById('general-notes');

// Modal Elements
const guestModal = document.getElementById('guest-modal');
const btnOpenModal = document.getElementById('btn-open-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTitle = document.getElementById('modal-title');
const btnSubmitText = document.getElementById('btn-submit-text');
const btnModalDelete = document.getElementById('btn-modal-delete');

// KPI elements
const valTotalGuests = document.getElementById('val-total-guests');
const valFier = document.getElementById('val-fier');
const valDietAllergies = document.getElementById('val-diet-allergies');
const valLodging = document.getElementById('val-lodging');

/**
 * Charge les données depuis le backend (guests.json)
 */
async function loadGuests() {
  try {
    const response = await fetch('/api/guests');
    if (response.ok) {
      const data = await response.json();
      
      // Rétrocompatibilité : si c'est un tableau simple, on le convertit
      if (Array.isArray(data)) {
        state.guests = data;
        state.notes = '';
      } else {
        state.guests = data.guests || [];
        state.notes = data.notes || '';
      }
      
      // Remplir la zone de texte des notes
      if (document.activeElement !== generalNotesInput) {
        generalNotesInput.value = state.notes;
      }
    } else {
      console.error('Erreur serveur lors du chargement des données');
    }
  } catch (e) {
    console.error('Erreur réseau lors du chargement des données:', e);
  }
}

/**
 * Sauvegarde les données sur le backend (guests.json)
 */
async function saveGuests() {
  try {
    const response = await fetch('/api/guests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        guests: state.guests,
        notes: state.notes
      })
    });
    if (!response.ok) {
      console.error('Erreur serveur lors de la sauvegarde');
    }
  } catch (e) {
    console.error('Erreur réseau lors de la sauvegarde:', e);
  }
}

/**
 * Calcule et met à jour les KPIs en temps réel
 */
function updateKPIs() {
  const activeGuests = state.guests;

  // 1. Nombre total de personnes
  const totalPeople = activeGuests.length;

  // 2. Nombre de personnes au Fier à 15h
  const totalFier = activeGuests.filter(g => g.fier === 'Oui').length;

  // 3. Nombre de personnes ayant un régime ou des allergies
  const totalDietAllergies = activeGuests
    .filter(g => (g.diet && g.diet.trim() !== '') || (g.allergies && g.allergies.trim() !== '')).length;

  // 4. Nombre de personnes dormant sur place (équipés + besoin) et détails de ceux qui ont besoin
  const totalLodging = activeGuests.filter(g => g.lodging === 'Equipe' || g.lodging === 'Besoin').length;
  const totalNeedBed = activeGuests.filter(g => g.lodging === 'Besoin').length;

  // Valeur textuelle/HTML pour le KPI couchage
  const lodgingKpiValue = totalNeedBed > 0 
    ? `${totalLodging} <span style="font-size:0.75rem; font-weight:500; color:var(--text-muted);">(${totalNeedBed} à loger)</span>`
    : totalLodging.toString();

  // Mise à jour de l'affichage avec animations
  animateValue(valTotalGuests, totalPeople.toString());
  animateValue(valFier, totalFier.toString());
  animateValue(valDietAllergies, totalDietAllergies.toString());
  animateValue(valLodging, lodgingKpiValue);
}

/**
 * Anime la transition des valeurs numériques pour les KPI
 */
function animateValue(element, targetValue) {
  const currentValue = parseInt(element.textContent, 10) || 0;
  const targetParsed = parseInt(targetValue, 10) || 0;
  if (currentValue === targetParsed && element.innerHTML.includes('à loger') === targetValue.includes('à loger')) return;

  element.innerHTML = targetValue;
  element.classList.remove('fade-in');
  // Déclenche un reflow pour relancer l'animation
  void element.offsetWidth;
  element.classList.add('fade-in');
}

/**
 * Ouvre le Modal
 */
function openModal(isEdit = false) {
  state.editingGuestId = isEdit ? state.editingGuestId : null;
  
  if (isEdit) {
    modalTitle.textContent = "Modifier l'invité";
    btnSubmitText.textContent = "Enregistrer";
    btnModalDelete.style.display = 'block';
  } else {
    modalTitle.textContent = "Ajouter un invité";
    btnSubmitText.textContent = "Ajouter l'invité";
    btnModalDelete.style.display = 'none';
    guestForm.reset();
    
    // Valeurs par défaut du formulaire
    guestLateSelect.value = 'Non';
    guestFierSelect.value = 'Non';
    guestLodgingSelect.value = 'Non';
    guestDietInput.value = '';
  }
  
  guestModal.classList.add('open');
  guestModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  
  // Placer le focus sur le premier champ
  setTimeout(() => guestNameInput.focus(), 50);
}

/**
 * Ferme le Modal
 */
function closeModal() {
  guestModal.classList.remove('open');
  guestModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  guestForm.querySelector('.form-group').classList.remove('has-error');
  state.editingGuestId = null;
}

/**
 * Charge les informations d'un invité et ouvre le modal d'édition
 */
function handleEditGuest(id) {
  const guest = state.guests.find(g => g.id === id);
  if (!guest) return;

  state.editingGuestId = id;
  
  // Pré-remplir les champs du formulaire
  guestNameInput.value = guest.name;
  guestLateSelect.value = guest.late || 'Non';
  guestFierSelect.value = guest.fier || 'Non';
  guestLodgingSelect.value = guest.lodging || 'Non';
  guestDietInput.value = guest.diet || '';
  guestAllergiesInput.value = guest.allergies || '';
  guestAlcoholInput.value = guest.alcohol || '';

  openModal(true);
}

/**
 * Gère la suppression d'un invité avec animation
 */
async function handleDeleteGuest(id) {
  const div = guestsList.querySelector(`.guest-item[data-id="${id}"]`);
  if (div) {
    div.classList.remove('fade-in');
    div.classList.add('fade-out');
    
    // Attendre la fin de l'animation de sortie
    div.addEventListener('animationend', async () => {
      state.guests = state.guests.filter(g => g.id !== id);
      await saveGuests();
      updateKPIs();
      renderGuests();
    });
  } else {
    state.guests = state.guests.filter(g => g.id !== id);
    await saveGuests();
    updateKPIs();
    renderGuests();
  }
}

/**
 * Effectue le rendu de la liste d'invités compacte
 */
function renderGuests() {
  // Filtrage par recherche
  const filteredGuests = state.guests.filter(guest => {
    return guest.name.toLowerCase().includes(state.searchQuery.toLowerCase());
  });

  // Affichage de l'état vide si nécessaire
  if (filteredGuests.length === 0) {
    guestsList.style.display = 'none';
    emptyState.style.display = 'flex';
    if (state.searchQuery) {
      emptyState.querySelector('h3').textContent = 'Aucun résultat';
      emptyState.querySelector('p').textContent = 'Modifiez vos critères de recherche.';
      emptyState.querySelector('.empty-icon').textContent = '🔍';
    } else {
      emptyState.querySelector('h3').textContent = 'Aucun invité saisi';
      emptyState.querySelector('p').textContent = 'Enregistrez les réponses de vos potes en cliquant sur le bouton ci-dessus.';
      emptyState.querySelector('.empty-icon').textContent = '✉️';
    }
    return;
  }

  guestsList.style.display = 'flex';
  emptyState.style.display = 'none';
  guestsList.innerHTML = '';

  filteredGuests.forEach(guest => {
    const item = document.createElement('div');
    item.className = 'guest-item fade-in';
    item.dataset.id = guest.id;

    // Retard
    const lateBadgeHtml = guest.late === 'Oui' ? ' <span class="late-badge">⏱️ Retard</span>' : '';

    // Présence au Fier (15h) - affichage uniquement si Oui
    const fierBadgeHtml = guest.fier === 'Oui' ? '<span class="detail-badge detail-badge-active">🔥 Fier</span>' : '';

    // Couchage - affichage avec distinction équipé vs besoin de couchage
    let lodgingBadgeHtml = '';
    if (guest.lodging === 'Equipe') {
      lodgingBadgeHtml = '<span class="detail-badge detail-badge-active">⛺ Équipé</span>';
    } else if (guest.lodging === 'Besoin') {
      lodgingBadgeHtml = '<span class="detail-badge-active-alert">⛺ À loger</span>';
    }

    // Régime (texte libre générique)
    const dietBadgeHtml = (guest.diet && guest.diet.trim()) ? `<span class="diet-tag" style="background-color:rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); color:var(--text-muted); font-size:0.75rem;">${escapeHtml(guest.diet)}</span>` : '';

    // Allergies
    const allergiesBadgeHtml = (guest.allergies && guest.allergies.trim()) ? `<span class="allergies-tag">⚠️ Allergie: ${escapeHtml(guest.allergies)}</span>` : '';

    // Alcool/boisson
    const alcoholHtml = (guest.alcohol && guest.alcohol.trim()) ? `<span class="alcohol-text">🥤 ${escapeHtml(guest.alcohol)}</span>` : '';

    item.innerHTML = `
      <div class="guest-main-row">
        <div class="guest-name-container">
          <span class="guest-name">${escapeHtml(guest.name)}</span>
          ${lateBadgeHtml}
        </div>
        <div class="guest-actions">
          <button class="btn-action-edit" title="Modifier cet invité" data-id="${guest.id}">
            Modifier
          </button>
        </div>
      </div>
      <div class="guest-details-row">
        ${fierBadgeHtml}
        ${lodgingBadgeHtml}
        ${dietBadgeHtml}
        ${allergiesBadgeHtml}
        ${alcoholHtml}
      </div>
    `;

    // Écouteur pour le bouton Modifier généré
    item.querySelector('.btn-action-edit').addEventListener('click', () => handleEditGuest(guest.id));

    guestsList.appendChild(item);
  });
}

/**
 * Nettoie les entrées HTML pour éviter les failles XSS
 */
function escapeHtml(string) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(string).replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Gestion de la soumission du formulaire (Ajout ou Modification)
guestForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  // Validation simple
  const nameValue = guestNameInput.value.trim();
  if (!nameValue) {
    guestForm.querySelector('.form-group').classList.add('has-error');
    guestNameInput.focus();
    return;
  }
  
  guestForm.querySelector('.form-group').classList.remove('has-error');

  const guestData = {
    name: nameValue,
    late: guestLateSelect.value,
    fier: guestFierSelect.value,
    diet: guestDietInput.value.trim(),
    allergies: guestAllergiesInput.value.trim(),
    lodging: guestLodgingSelect.value,
    alcohol: guestAlcoholInput.value.trim()
  };

  if (state.editingGuestId) {
    // Mode Modification
    state.guests = state.guests.map(g => {
      if (g.id === state.editingGuestId) {
        return { ...g, ...guestData };
      }
      return g;
    });
  } else {
    // Mode Ajout
    const newGuest = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      ...guestData
    };
    state.guests.push(newGuest);
  }

  await saveGuests();
  updateKPIs();
  renderGuests();
  closeModal();
});

// Écouteur pour la saisie dynamique dans le nom pour enlever l'erreur si elle y est
guestNameInput.addEventListener('input', () => {
  if (guestNameInput.value.trim()) {
    guestForm.querySelector('.form-group').classList.remove('has-error');
  }
});

// Écouteur de sauvegarde automatique pour les notes générales
generalNotesInput.addEventListener('blur', async () => {
  state.notes = generalNotesInput.value;
  await saveGuests();
});

// Écouteur de suppression du Modal
btnModalDelete.addEventListener('click', async () => {
  if (state.editingGuestId) {
    await handleDeleteGuest(state.editingGuestId);
    closeModal();
  }
});

// Écouteurs pour l'ouverture/fermeture du Modal
btnOpenModal.addEventListener('click', () => openModal(false));
modalCloseBtn.addEventListener('click', closeModal);

// Fermer le modal lors du clic à l'extérieur de la boîte modale
guestModal.addEventListener('click', (e) => {
  if (e.target === guestModal) {
    closeModal();
  }
});

// Fermer le modal avec la touche Échap
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && guestModal.classList.contains('open')) {
    closeModal();
  }
});

// Écouteur pour la recherche dynamique
searchInput.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  renderGuests();
});

// Synchronisation automatique quand l'onglet retrouve le focus
window.addEventListener('focus', async () => {
  await loadGuests();
  updateKPIs();
  renderGuests();
});

// Initialisation globale au chargement de la page
window.addEventListener('DOMContentLoaded', async () => {
  await loadGuests();
  updateKPIs();
  renderGuests();
});
