const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "tontine.db"), { verbose: console.log });

// Création table membres (exemple)
db.exec(`
  CREATE TABLE IF NOT EXISTS membres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    telephone TEXT NOT NULL,
    profession TEXT NOT NULL,
    ville TEXT NOT NULL,
    dateNaissance TEXT NOT NULL,
    caution TEXT NOT NULL
  );
`);

// Exemple fonction pour récupérer tous les membres
function getMembres() {
  const stmt = db.prepare("SELECT * FROM membres ORDER BY id DESC");
  return stmt.all();
}

function ajouterMembre(nom, caution) {
  try {
    const insertMembre = db.prepare("INSERT INTO membres (nom, caution) VALUES (?, ?)");
    const result = insertMembre.run(nom, caution);
    const membreId = result.lastInsertRowid;

    const insertMouvement = db.prepare(`
      INSERT INTO mouvements (membreId, type, montant, motif, date) 
      VALUES (?, 'caution', ?, 'Caution initiale', datetime('now'))
    `);
    insertMouvement.run(membreId, caution);

    return membreId;
  } catch (err) {
    console.error("Erreur lors de l'ajout du membre :", err);
    throw err;
  }
}


function supprimerMembre(id) {
  const stmt = db.prepare("DELETE FROM membres WHERE id = ?");
  stmt.run(id);
}

function modifierMembre(id, nom, tel, profession, ville, caution) {
  const stmt = db.prepare("UPDATE membres SET nom = ?, telephone = ?, profession = ?, ville = ?, dateNaissance = ?, caution = ? WHERE id = ?");
  stmt.run(nom, tel, profession, ville, dateNaissance, caution, id);
}

async  function ajouterMouvement({ membreId, type, montant }) {
  const compte = await this.getCompte(membreId, type);
  if (compte) {
    // Mise à jour du solde
    const nouveauSolde = compte.solde + montant;
    await this.db.run(
      `UPDATE comptes SET solde = ? WHERE membre_id = ? AND type = ?`,
      [nouveauSolde, membreId, type]
    );
  } else {
    // Création du compte si inexistant
    await this.db.run(
      `INSERT INTO comptes (membre_id, type, solde) VALUES (?, ?, ?)`,
      [membreId, type, montant]
    );
  }

  // Plus besoin d'ajouter une ligne dans la table mouvements
  return { success: true };
}

function chargerEtatComptes() {
  db.all(`
    SELECT m.nom, c.type_compte, c.solde, c.date_maj
    FROM comptes_actifs c
    JOIN membres m ON m.id = c.membre_id
    ORDER BY m.nom
  `, (err, rows) => {
    const tbody = document.querySelector('#etatComptes tbody');
    tbody.innerHTML = '';

    // Organiser les lignes par membre
    const comptesParMembre = {};

    rows.forEach(row => {
      if (!comptesParMembre[row.nom]) {
        comptesParMembre[row.nom] = {
          epargne: 0,
          credit: 0,
          date: row.date_maj
        };
      }
      if (row.type_compte === 'épargne') comptesParMembre[row.nom].epargne = row.solde;
      if (row.type_compte === 'crédit') comptesParMembre[row.nom].credit = row.solde;
    });

    for (const nom in comptesParMembre) {
      const c = comptesParMembre[nom];
      const row = `
        <tr>
          <td>${nom}</td>
          <td>${c.epargne} FCFA</td>
          <td>${c.credit} FCFA</td>
          <td>${c.date}</td>
        </tr>`;
      tbody.innerHTML += row;
    }
  });
}

function getSoldeCaisse(callback) {
  db.get(
    `SELECT SUM(montant) AS solde_caisse
     FROM mouvements
     WHERE membre_id = (SELECT id FROM membres WHERE nom = 'CAISSE')`,
    [],
    (err, row) => {
      if (err) {
        console.error("Erreur calcul solde caisse :", err);
        callback(0);
      } else {
        callback(row.solde_caisse || 0);
      }
    }
  );
}

function verserInteretDansCaisse(montant, motif) {
  db.get("SELECT id FROM membres WHERE nom = 'CAISSE'", [], (err, row) => {
    if (err) return console.error(err);
    const caisseId = row.id;

    db.run(
      `INSERT INTO mouvements (membre_id, type, montant, motif, date)
       VALUES (?, 'credit', ?, ?, datetime('now'))`,
      [caisseId, montant, motif],
      (err2) => {
        if (err2) console.error("Erreur ajout mouvement caisse :", err2);
        else console.log("Intérêt ajouté à la caisse");
      }
    );
  });
}

function getSoldeGeneral() {
  const sql = `
    SELECT 
      (SELECT COALESCE(SUM(caution + epargne), 0) FROM membres WHERE nom != 'CAISSE') AS solde_membres,
      (SELECT COALESCE(SUM(montant), 0) FROM credits) AS solde_credits,
      (SELECT 
         COALESCE(SUM(CASE WHEN type='entrée' THEN montant ELSE -montant END), 0)
       FROM mouvements_caisse) AS solde_caisse;
  `;
  return db.prepare(sql).get();
}

function rembourserCredit(creditId, montant) {
  db.prepare("INSERT INTO remboursements (credit_id, montant) VALUES (?, ?)").run(creditId, montant);
  db.prepare("UPDATE credits SET reste = reste - ? WHERE id = ?").run(montant, creditId);

  const credit = db.prepare("SELECT reste, date_expiration FROM credits WHERE id = ?").get(creditId);
  const today = new Date().toISOString().split('T')[0];

  if (credit.reste <= 0) {
    db.prepare("UPDATE credits SET statut = 'clos', reste = 0 WHERE id = ?").run(creditId);
  } else if (today > credit.date_expiration) {
    const nouveauReste = Math.floor(credit.reste * 1.2);
    db.prepare("UPDATE credits SET reste = ?, statut = 'défaut reconduit' WHERE id = ?")
      .run(nouveauReste, creditId);
  }
}


function getSoldes() {
  return new Promise((resolve, reject) => {
    const soldes = {
      general: 0,
      epargne: 0,
      credit: 0,
      caution: 0
    };

    // 1. Commencer par récupérer les mouvements
    db.all(`SELECT type, SUM(montant) AS total FROM mouvements GROUP BY type`, [], (err, rows) => {
      if (err) return reject(err);

      rows.forEach(row => {
        const { type, total } = row;
        if (type === 'epargne') soldes.epargne = total;
        else if (type === 'credit') soldes.credit = total;

        soldes.general += total;
      });

      // 2. Ensuite, on récupère les cautions dans la table membres
      db.get(`SELECT SUM(caution) AS total FROM membres`, [], (err2, row2) => {
        if (err2) return reject(err2);

        soldes.caution = row2.total || 0;
        soldes.general += soldes.caution;

        resolve(soldes);
      });
    });
  });
}




async function getCompte(membreId, type) {
  return await this.db.get(
    `SELECT * FROM comptes WHERE membre_id = ? AND type = ?`,
    [membreId, type]
  );
}

function getAllSoldes() {
  const stmt = db.prepare(`
    SELECT comptes.*, membres.nom 
    FROM comptes
    JOIN membres ON comptes.membre_id = membres.id
  `);
  return stmt.all(); // 👈 Ceci retourne un tableau des résultats
}



// Export uniquement les fonctions d’accès
module.exports = {
  getMembres,
  ajouterMembre,
  modifierMembre,
  supprimerMembre,
  ajouterMouvement,
  chargerEtatComptes,
  getSoldeCaisse,
  verserInteretDansCaisse,
  getSoldeGeneral,
  rembourserCredit,
  getSoldes,
  getCompte,
  getAllSoldes
};
