console.log("Interface chargée !");
function pingApp() {
    window.electronAPI.ping().then(response => {
        alert(response);
    })
}

// renderer.js
window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const result = await window.api.login(email, password);

    if (result.success) {
      localStorage.setItem('userRole', result.role); // facultatif
      window.location.href = 'dashboard.html';
    } else {
      document.getElementById('error-msg').textContent = result.message;
    }
  });
});


async function chargerSoldeGeneral() {
  try {
    const solde = await window.electronAPI.invoke('getSoldeGeneral');

    // Affichage simple (adapter à ta page)
    document.getElementById('soldeMembres').textContent = solde.solde_membres.toLocaleString() + ' FCFA';
    document.getElementById('soldeCredits').textContent = solde.solde_credits.toLocaleString() + ' FCFA';
    document.getElementById('soldeCaisse').textContent = solde.solde_caisse.toLocaleString() + ' FCFA';

    // Solde global, si besoin
    const soldeGlobal = solde.solde_membres + solde.solde_caisse - solde.solde_credits;
    document.getElementById('soldeGlobal').textContent = soldeGlobal.toLocaleString() + ' FCFA';

  } catch (err) {
    console.error("Erreur chargement solde général :", err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  chargerSoldeGeneral();
});

async function rembourserCredit(creditId, montant, note) {
  await window.api.invoke("rembourser-credit", { creditId, montant, note });
  alert("Remboursement enregistré !");
  // puis recharger les crédits
}

async function afficherSoldes() {
  try {
    const mouvements = await window.apiComptes.getMouvements();
    let total = 0;
    let epargne = 0;
    let credit = 0;

    mouvements.forEach((m) => {
      if (m.type === "Épargne") epargne += m.montant;
      else if (m.type === "Crédit") credit += m.montant;
      total += m.montant;
    });

    document.getElementById("soldeTotal").textContent = `${total.toLocaleString()} F`;
    document.getElementById("soldeEpargne").textContent = `${epargne.toLocaleString()} F`;
    document.getElementById("soldeCredit").textContent = `${credit.toLocaleString()} F`;

  } catch (err) {
    console.error("Erreur calcul soldes:", err);
  }
}
