document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formAjoutMembre");
  const tableBody = document.getElementById("tableMembres");
  const btnRetour = document.getElementById("retourDashboard");
  


  // Gestion ajout membre
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    
    const nouveauMembre = {
      nom: document.getElementById("nom").value.trim(),
      telephone: document.getElementById("telephone").value.trim(),
      profession: document.getElementById("profession").value.trim(),
      ville: document.getElementById("ville").value.trim(),
      dateNaissance: document.getElementById("dateNaissance").value,
      caution: document.getElementById("caution").value.trim()

    };

    if (!nouveauMembre.nom || !nouveauMembre.telephone || !nouveauMembre.profession || !nouveauMembre.ville || !nouveauMembre.dateNaissance || !nouveauMembre.caution) {
      alert("Merci de remplir tous les champs.");
      return;
    }

    try {
      await window.apiMembres.ajouterMembre(nouveauMembre);
      form.reset();
      chargerMembres();
    } catch (err) {
      alert("Erreur lors de l'ajout du membre : " + err.message);
    }
  });


  // Fonction pour charger les membres

  async function chargerMembres() {
    const membres = await window.apiMembres.getMembres();
    tableMembres.innerHTML = "";

    membres.forEach((membre) => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${membre.id}</td>
        <td contenteditable="true" class="editable" data-field="nom">${membre.nom}</td>
        <td contenteditable="true" class="editable" data-field="telephone">${membre.telephone}</td>
        <td contenteditable="true" class="editable" data-field="ville">${membre.ville}</td>
        <td contenteditable="true" class="editable" data-field="profession">${membre.profession}</td>
        <td contenteditable="true" class="editable" data-field="dateNaissance">${new Date(membre.dateNaissance).toLocaleDateString()}</td>
        <td contenteditable="true" class="editable" data-field="caution">${membre.caution}</td>
        <td>
          <button class="save-btn" data-id="${membre.id}">Sauvegarder</button>
          <button class="delete-btn" data-id="${membre.id}">Supprimer</button>
        </td>
      `;

      tableMembres.appendChild(row);
    });

    // Gestion des boutons sauvegarder
    document.querySelectorAll(".save-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const row = btn.closest("tr");

        const updatedMembre = {
          id: parseInt(id),
          nom: row.querySelector('[data-field="nom"]').textContent.trim(),
          telephone: row.querySelector('[data-field="telephone"]').textContent.trim(),
          ville: row.querySelector('[data-field="ville"]').textContent.trim(),
          profession: row.querySelector('[data-field="profession"]').textContent.trim(),
          dateNaissance: new Date(row.querySelector('[data-field="dateNaissance"]').textContent.trim()).toISOString(),
          caution: row.querySelector('[data-field="caution"]').textContent.trim(),
        };

        await window.apiMembres.modifierMembre(updatedMembre);
        await chargerMembres();
      });
    });

    // Gestion des suppressions
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (confirm("Supprimer ce membre ?")) {
          await window.apiMembres.supprimerMembre(id);
          await chargerMembres();
        }
      });
    });
  }

  // Ajout d’un membre
  btnAjoutMembre.addEventListener("click", async () => {
    const nom = nomInput.value.trim();
    const telephone = telephoneInput.value.trim();
    const ville = villeInput.value.trim();
    const profession = professionInput.value.trim();
    const dateNaissance = dateNaissanceInput.value;
    const caution = cautionInput.value.trim();

    if (!nom || !telephone || !ville || !profession || !dateNaissance || !caution) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    await window.apiMembres.ajouterMembre(nom, telephone, ville, profession, dateNaissance, caution);

    // Reset
    nomInput.value = "";
    telephoneInput.value = "";
    villeInput.value = "";
    professionInput.value = "";
    dateNaissanceInput.value = "";
    cautionInput.value = "";

    await chargerMembres();
  });

  // Retour dashboard
  btnRetour.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  // ✅ Appel initial
  chargerMembres();
});