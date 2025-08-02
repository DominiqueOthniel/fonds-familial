window.addEventListener("DOMContentLoaded", () => {
  // Chargement initial
  afficherCredits();
  afficherRemboursements();



  // Accord du prêt
  document.getElementById("formCredit").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const membreId = document.getElementById("selectMembre").value;
    const montant = parseFloat(document.getElementById("montantCredit").value);
    
     const dateExpiration = document.getElementById("dateExpiration").value;
  

    if (!membreId || isNaN(montant)) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    const interet = montant * 0.2;
    const montantARembourser = montant + interet;

   await window.apiCredits.accorderCredit(membreId, montant, montantARembourser, dateExpiration); // ajoute dateExpiration
  afficherCredits();
  e.target.reset();
  });

  
  // Remboursement partiel
  document.getElementById("formRemboursement").addEventListener("submit", async (e) => {
    e.preventDefault();
    const creditId = document.getElementById("creditId").value;
    const montant = parseFloat(document.getElementById("montantRembourse").value);

    if (!creditId || isNaN(montant)) {
      alert("Champs invalides.");
      return;
    }

    await window.api.rembourserCredit(creditId, montant);
    afficherCredits();
    afficherRemboursements();
    e.target.reset();
  });
});


async function afficherCredits() {
  try {
    const credits = await window.apiCredits.getCredits();
    const tbody = document.getElementById("listeCredits");
    tbody.innerHTML = "";
    credits.forEach(c => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.id}</td>
        <td>${c.nom}</td>
        <td>${c.montant_initial} FCFA</td>
        <td>${c.montant_a_rembourser} FCFA</td>
        <td>${c.reste} FCFA</td>
        <td>${c.status}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Erreur afficherCredits:", error);
  }
}

async function afficherRemboursements() {
  try {
    const remboursements = await window.apiCredits.getRemboursements();
    const tbody = document.getElementById("listeRemboursements");
    tbody.innerHTML = "";
    remboursements.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.nom}</td>
        <td>${r.id_credit}</td>
        <td>${r.montant} FCFA</td>
        <td>${new Date(r.date).toLocaleDateString()}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Erreur afficherRemboursements:", error);
  }
}

function switchTab(tabName) {
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => {
    tab.style.display = 'none';
  });

  const selectedTab = document.getElementById(tabName);
  if (selectedTab) {
    selectedTab.style.display = 'block';
  }
}


async function chargerMembresDansSelect() {
  try {
    const membres = await window.api.invoke('get-membres');
    const select = document.getElementById('selectMembre');

    membres.forEach(membre => {
      const option = document.createElement('option');
      option.value = membre.id;
      option.textContent = membre.nom;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Erreur lors du chargement des membres :', error);
  }
}

document.addEventListener('DOMContentLoaded', chargerMembresDansSelect);
