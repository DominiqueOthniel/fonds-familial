const db = require('better-sqlite3')('reunion.db');

// Changement d'onglets
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(div => div.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';
}

// Charger les membres
function loadMembres() {
  const membres = db.prepare("SELECT id, nom FROM membres WHERE nom != 'CAISSE'").all();
  const selectCredit = document.getElementById('creditMembre');
  const selectRemb = document.getElementById('remboursementCredit');
  selectCredit.innerHTML = '';
  selectRemb.innerHTML = '';
  membres.forEach(m => {
    const opt = new Option(m.nom, m.id);
    selectCredit.add(opt.cloneNode(true));
    selectRemb.add(opt);
  });
}

// Charger les crédits
function loadCredits() {
  const rows = db.prepare("SELECT c.id, m.nom, c.montant_initial, c.montant_total, c.montant_restant, c.date_expiration FROM credits c JOIN membres m ON c.membre_id = m.id").all();
  const tbody = document.getElementById('creditList');
  tbody.innerHTML = '';
  rows.forEach(r => {
    const etat = r.montant_restant <= 0 ? 'Clos' :
      new Date(r.date_expiration) < new Date() ? 'Défaut reconduit' : 'Actif';
    const tr = `<tr>
      <td>${r.nom}</td>
      <td>${r.montant_initial}</td>
      <td>${r.montant_total}</td>
      <td>${r.montant_restant}</td>
      <td>${etat}</td>
      <td>${r.date_expiration}</td>
    </tr>`;
    tbody.innerHTML += tr;
  });
}

// Charger remboursements
function loadRemboursements() {
  const rows = db.prepare(`
    SELECT r.montant, r.date_remboursement, m.nom
    FROM remboursements r JOIN credits c ON r.credit_id = c.id
    JOIN membres m ON c.membre_id = m.id
  `).all();
  const tbody = document.getElementById('remboursementList');
  tbody.innerHTML = '';
  rows.forEach(r => {
    tbody.innerHTML += `<tr><td>${r.nom}</td><td>${r.montant}</td><td>${r.date_remboursement}</td></tr>`;
  });
}

// Ajouter un crédit
document.getElementById('formCredit').addEventListener('submit', e => {
  e.preventDefault();
  const membre_id = document.getElementById('creditMembre').value;
  const montant = parseFloat(document.getElementById('montantInitial').value);
  const dateExp = document.getElementById('dateExpiration').value;

  const montantTotal = Math.round(montant * 1.2);
  db.prepare(`
    INSERT INTO credits (membre_id, montant_initial, montant_total, montant_restant, date_expiration)
    VALUES (?, ?, ?, ?, ?)
  `).run(membre_id, montant, montantTotal, montantTotal, dateExp);

  loadCredits();
});

// Rembourser un crédit
document.getElementById('formRemboursement').addEventListener('submit', e => {
  e.preventDefault();
  const membre_id = document.getElementById('remboursementCredit').value;
  const montant = parseFloat(document.getElementById('montantRemboursement').value);

  const credit = db.prepare("SELECT * FROM credits WHERE membre_id = ? AND montant_restant > 0").get(membre_id);
  if (!credit) return alert("Aucun crédit actif.");

  db.prepare("UPDATE credits SET montant_restant = montant_restant - ? WHERE id = ?").run(montant, credit.id);
  db.prepare("INSERT INTO remboursements (credit_id, montant, date_remboursement) VALUES (?, ?, date('now'))")
    .run(credit.id, montant);

  loadCredits();
  loadRemboursements();
});

// Init
loadMembres();
loadCredits();
loadRemboursements();
