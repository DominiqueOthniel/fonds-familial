afficherMouvements();

async function afficherSoldes() {
  try {


const soldes = await window.electronAPI.invoke("get-soldes");
let totalGeneral = 0, totalEpargne = 0, totalCaution = 0;

soldes.forEach(s => {
  totalGeneral += s.solde;
  if (s.type === 'épargne') totalEpargne += s.solde;
  else if (s.type === 'caution') totalCaution += s.solde;
});

document.getElementById("soldeGeneral").textContent = `${totalGeneral.toLocaleString()} F`;
document.getElementById("soldeEpargne").textContent = `${totalEpargne.toLocaleString()} F`;
document.getElementById("soldeCaution").textContent = `${totalCaution.toLocaleString()} F`;
  } catch (err) {
    console.error("Erreur lors de l'affichage des soldes :", err);
  }
}

async function afficherMouvements() {
  try {
    const mouvements = await window.apiComptes.getMouvements();
    const tbody = document.getElementById("mouvementTableBody");
    tbody.innerHTML = "";

    mouvements.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.id}</td>
        <td>${m.membreNom}</td>
        <td>${m.type}</td>
        <td>${m.montant.toLocaleString()} F</td>
        <td>${new Date(m.date).toLocaleDateString()}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Erreur affichage mouvements :", err);
  }
}


window.addEventListener("DOMContentLoaded", () => {
  const membreSelect = document.getElementById("membreSelect");
  const montantInput = document.getElementById("montant");
  const compteForm = document.getElementById("compteForm");
  const backBtn = document.getElementById("backBtn");

 
  
  // Charger les membres dans la liste déroulante
  async function chargerMembres() {
    try {
      const membres = await window.apiMembres.getMembres();
      membreSelect.innerHTML = `<option value="" disabled selected>-- Sélectionnez un membre --</option>`;
      membres.forEach((membre) => {
        const opt = document.createElement("option");
        opt.value = membre.id;
        opt.textContent = membre.nom;
        membreSelect.appendChild(opt);
      });
    } catch (err) {
      console.error("Erreur chargement membres :", err);
    }
  }

  // Soumission du formulaire pour ouverture ou dépôt
  compteForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const membreId = parseInt(membreSelect.value);
    const montant = parseFloat(montantInput.value);

    if (!membreId || isNaN(montant)) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    try {
    const result = await window.apiComptes.ajouterMouvement({
  membreId,
  type: "épargne",
  montant,
     date: new Date().toISOString() 
});

await afficherMouvements(); // 👈 actualise le tableau


      console.log("✅ Mouvement enregistré :", result);

      // Réinitialiser le formulaire
      montantInput.value = "";
      membreSelect.selectedIndex = 0;

      alert("Compte crédité avec succès !");
    } catch (err) {
      console.error("Erreur lors de l'ajout du mouvement :", err);
      alert("Échec lors de l’ajout.");
    }
  });

  // Retour tableau de bord
  backBtn.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });


  window.electronAPI.invoke("get-soldes")
  .then((soldes) => {
    console.log("Soldes :", soldes);
    // Ton code ici
  })
  .catch((err) => {
    console.error("Erreur lors de l'affichage des soldes :", err);
  });

// Autres fonctions ici...

async function afficherSoldes() {
  try {
    const soldes = await window.electronAPI.invoke("get-soldes");
    console.log("Soldes :", soldes);

    let totalGeneral = 0;
    let totalEpargne = 0;
    let totalCaution = 0;

    soldes.forEach(s => {
      totalGeneral += s.solde;
      if (s.type.toLowerCase() === "épargne" || s.type.toLowerCase() === "epargne") {
        totalEpargne += s.solde;
      } else if (s.type.toLowerCase() === "caution") {
        totalCaution += s.solde;
      }
    });

    document.getElementById("soldeGeneral").textContent = `${totalGeneral.toLocaleString()} F`;
    document.getElementById("soldeEpargne").textContent = `${totalEpargne.toLocaleString()} F`;
    document.getElementById("soldeCaution").textContent = `${totalCaution.toLocaleString()} F`;

  } catch (err) {
    console.error("Erreur lors de l'affichage des soldes :", err);
  }
}

// Appelle cette fonction au chargement de ta page ou au clic sur un bouton
afficherSoldes();



// Coller ici ↓
window.onload = async () => {
  await afficherMouvements();

};


  // Initialisation
  chargerMembres();
});

afficherMouvements();

