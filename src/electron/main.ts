import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import bcrypt from "bcryptjs";
/* import { fileURLToPath } from "url";
import { dirname } from "path"; */
// @ts-ignore
import Database from "better-sqlite3";
import { isDev } from "./utils.js";
import { getPreloadPath } from "./pathResolver.js";

// Définir __dirname et __filename en mode ES Module
/* const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename); */

// en dev, on veut le cwd du projet ; en prod, l’APP path (dist-electron)
const baseDir = isDev()
  ? process.cwd() // racine du projet en dev
  : app.getAppPath(); // dist-electron quand packagé

// Initialiser la base de données
const dbPath = path.join(baseDir, "tontine.db");
console.log("📂 Chemin de la base SQLite :", dbPath);

const db = new Database(dbPath);
// 1) Migration (ne s’exécute qu’une seule fois)
const migrateDatabase = () => {
  const cols = db.prepare("PRAGMA table_info(membres)").all();
  if (!cols.some((c: any) => c.name === "dateAdhesion")) {
    console.log("🛠 Ajout de dateAdhesion + caution…");
    db.exec(`
      ALTER TABLE membres ADD COLUMN dateAdhesion TEXT DEFAULT '';
      ALTER TABLE membres ADD COLUMN caution REAL NOT NULL DEFAULT 30000;
      UPDATE membres
      SET dateAdhesion = dateNaissance
      WHERE dateAdhesion = '';
    `);
    console.log("✅ Migration terminée");
  }

  // dépenses communes
  const commonCols = db.prepare("PRAGMA table_info(depenses_communes)").all();
  if (!commonCols.length) {
    console.log("🛠 Création de la table depenses_communes…");
    db.exec(`
      CREATE TABLE IF NOT EXISTS depenses_communes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT    NOT NULL,
    montant     REAL    NOT NULL,
    date        TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    categorie   TEXT    NOT NULL DEFAULT 'autres'
                   CHECK(categorie IN (
                     'Boisson',
                     'Deuil',
                     'Evènement',
                     'Transport',
                     'Matériel',
                     'Communication',
                     'autres'
                   ))
  );
    `);
    console.log("✅ Table depenses_communes ajoutée");
  } else {
    // Migration pour corriger "Deul" en "Deuil"
    try {
      db.exec(`
        UPDATE depenses_communes 
        SET categorie = 'Deuil' 
        WHERE categorie = 'Deul'
      `);
      console.log("✅ Migration Deul → Deuil effectuée");
    } catch (err) {
      console.log("ℹ️ Pas de données à migrer pour Deul → Deuil");
    }
  }

  // Migration pour les nouveaux types de mouvements
  try {
    console.log("🛠 Migration vers les nouveaux types de mouvements...");

    // Sauvegarder les données existantes
    const existingMouvements = db.prepare("SELECT * FROM mouvements").all();

    // Supprimer l'ancienne table
    db.exec("DROP TABLE IF EXISTS mouvements");

    // Recréer avec la nouvelle contrainte incluant 'epargne'
    db.exec(`
      CREATE TABLE mouvements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        membreId INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN (
          'epargne',
          'cotisation_annuelle',
          'versement_ponctuel',
          'depot_caution',
          'restitution_caution',
          'credit',
          'remboursement',
          'interet',
          'depense_commune_fonds',
          'depense_commune_epargne'
        )),
        montant REAL NOT NULL,
        motif TEXT,
        date TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(membreId) REFERENCES membres(id)
      )
    `);

    // Restaurer les données avec mapping des anciens types vers les nouveaux
    if (existingMouvements.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO mouvements (id, membreId, type, montant, motif, date)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const mouvement of existingMouvements) {
        // Mapping des anciens types vers les nouveaux
        let newType = mouvement.type;
        switch (mouvement.type) {
          case "épargne":
            newType = "epargne"; // Nouveau type pour épargne personnelle avec intérêts
            break;
          case "crédit":
            newType = "credit";
            break;
          case "caution":
            newType = "depot_caution";
            break;
          case "cotisation":
            newType = "versement_ponctuel";
            break;
          case "depense":
            newType = "depense_commune_epargne";
            break;
        }

        insertStmt.run(
          mouvement.id,
          mouvement.membreId,
          newType,
          mouvement.montant,
          mouvement.motif,
          mouvement.date
        );
      }
    }

    console.log("✅ Migration vers les nouveaux types de mouvements terminée");
  } catch (err) {
    console.log("ℹ️ Pas de migration nécessaire pour les types de mouvements");
  }

  // Migration pour ajouter le champ soldeEpargne à la table membres
  try {
    console.log("🛠 Ajout du champ soldeEpargne à la table membres...");
    const cols = db.prepare("PRAGMA table_info(membres)").all();
    if (!cols.some((c: any) => c.name === "soldeEpargne")) {
      db.exec(
        "ALTER TABLE membres ADD COLUMN soldeEpargne REAL NOT NULL DEFAULT 0"
      );

      // Calculer et mettre à jour le soldeEpargne pour chaque membre
      const membres = db.prepare("SELECT id FROM membres").all();
      for (const membre of membres) {
        const soldeEpargne = db
          .prepare(
            `
            SELECT COALESCE(SUM(montant), 0) as total 
            FROM mouvements 
            WHERE membreId = ? AND type = 'epargne'
          `
          )
          .get(membre.id).total;

        db.prepare("UPDATE membres SET soldeEpargne = ? WHERE id = ?").run(
          soldeEpargne,
          membre.id
        );
      }
      console.log("✅ Champ soldeEpargne ajouté et calculé");
    }
  } catch (err) {
    console.log("ℹ️ Champ soldeEpargne déjà présent ou erreur:", err);
  }
};

// Exécuter la migration
migrateDatabase();

// Création des tables si elles n'existent pas
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'adjoint'))
  );

  CREATE TABLE IF NOT EXISTS membres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    telephone TEXT NOT NULL,
    profession TEXT NOT NULL,
    ville TEXT NOT NULL,
    dateAdhesion TEXT NOT NULL,
    caution REAL NOT NULL DEFAULT 30000,
    soldeEpargne REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS mouvements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    membreId INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN (
      'epargne',
      'cotisation_annuelle',
      'versement_ponctuel',
      'depot_caution',
      'restitution_caution',
      'credit',
      'remboursement',
      'interet',
      'depense_commune_fonds',
      'depense_commune_epargne'
    )),
    montant REAL NOT NULL,
    motif TEXT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(membreId) REFERENCES membres(id)
  );

  CREATE TABLE IF NOT EXISTS credits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_membre INTEGER NOT NULL,
    montant_initial REAL NOT NULL,
    montant_a_rembourser REAL NOT NULL,
    reste REAL NOT NULL,
    date_accord TEXT NOT NULL,
    date_expiration TEXT NOT NULL,
    statut TEXT NOT NULL CHECK(statut IN ('actif', 'remboursé', 'en_retard')),
    FOREIGN KEY(id_membre) REFERENCES membres(id)
  );

  CREATE TABLE IF NOT EXISTS remboursements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_credit INTEGER NOT NULL,
    montant REAL NOT NULL,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(id_credit) REFERENCES credits(id)
  );

  CREATE TABLE IF NOT EXISTS caisse (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    type TEXT NOT NULL CHECK(type IN ('entree', 'sortie')),
    categorie TEXT NOT NULL,
    montant REAL NOT NULL,
    description TEXT
  );
`);

// Initialisation des utilisateurs si pas encore dans la table
const countUsers = db
  .prepare("SELECT COUNT(*) as count FROM users")
  .get().count;
if (countUsers === 0) {
  const hashAdmin = bcrypt.hashSync("admin1234", 10);
  const hashAdjoint = bcrypt.hashSync("adjoint1234", 10);

  const insertUser = db.prepare(
    "INSERT INTO users (email, password, role) VALUES (?, ?, ?)"
  );
  insertUser.run("admin@tontine.com", hashAdmin, "admin");
  insertUser.run("adjoint@tontine.com", hashAdjoint, "adjoint");
  console.log("Utilisateurs admin et adjoint créés");
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Définir la Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http: https:",
          ],
        },
      });
    }
  );

  if (isDev()) {
    mainWindow.loadURL("http://localhost:5123");
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), "/dist-react/index.html"));
  }

  // Ouvrir les outils de développement en mode développement
  if (isDev()) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers pour l'authentification
ipcMain.handle("login", async (_event, { email, password }) => {
  try {
    const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
    const user = stmt.get(email);

    if (!user) {
      return { success: false, message: "Utilisateur non trouvé" };
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { success: false, message: "Mot de passe incorrect" };
    }

    return { success: true, role: user.role };
  } catch (err) {
    console.error("Erreur login :", err);
    return { success: false, message: "Erreur serveur" };
  }
});

// IPC handlers pour les membres
ipcMain.handle("ajouter-membre", (_event, membre) => {
  try {
    const { nom, telephone, profession, ville, dateAdhesion, caution } = membre;
    const stmt = db.prepare(`
      INSERT INTO membres (nom, telephone, profession, ville, dateAdhesion, caution)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      nom,
      telephone,
      profession,
      ville,
      dateAdhesion,
      caution
    );
    return { success: true, id: info.lastInsertRowid };
  } catch (err) {
    console.error("Erreur ajouter-membre:", err);
    throw err;
  }
});

// Handler pour récupérer l'historique d'un membre
ipcMain.handle("get-historique-membre", (_event, membreId) => {
  try {
    const stmt = db.prepare(`
      SELECT m.id, m.type, m.montant, m.motif, m.date, mem.nom as membreNom
      FROM mouvements m
      JOIN membres mem ON m.membreId = mem.id
      WHERE m.membreId = ?
      ORDER BY m.date DESC
    `);
    return stmt.all(membreId);
  } catch (err) {
    console.error("Erreur get-historique-membre:", err);
    throw err;
  }
});

// Handler pour récupérer les détails d'un membre
ipcMain.handle("get-details-membre", (_event, membreId) => {
  try {
    // Informations du membre
    const membre = db
      .prepare("SELECT * FROM membres WHERE id = ?")
      .get(membreId);

    // Solde épargne (somme des mouvements de type 'epargne' - épargne personnelle avec intérêts)
    const soldeEpargne = db
      .prepare(
        `
      SELECT COALESCE(SUM(montant), 0) as total 
      FROM mouvements 
      WHERE membreId = ? AND type = 'epargne'
    `
      )
      .get(membreId).total;

    // Total cotisations et versements ponctuels (contributions au fonds commun)
    const totalCotisations = db
      .prepare(
        `
      SELECT COALESCE(SUM(montant), 0) as total 
      FROM mouvements 
      WHERE membreId = ? AND type IN ('cotisation_annuelle', 'versement_ponctuel')
    `
      )
      .get(membreId).total;

    // Total dépenses (mouvements de type 'depense_commune_epargne' - montants négatifs)
    const totalDepenses = db
      .prepare(
        `
      SELECT COALESCE(SUM(ABS(montant)), 0) as total 
      FROM mouvements 
      WHERE membreId = ? AND type = 'depense_commune_epargne'
    `
      )
      .get(membreId).total;

    // Crédit actuel
    const creditActuel = db
      .prepare(
        `
      SELECT COALESCE(SUM(reste), 0) as total 
      FROM credits 
      WHERE id_membre = ? AND statut = 'actif'
    `
      )
      .get(membreId).total;

    // Nombre de mouvements
    const nbMouvements = db
      .prepare(
        `
      SELECT COUNT(*) as total 
      FROM mouvements 
      WHERE membreId = ?
    `
      )
      .get(membreId).total;

    return {
      membre,
      soldeEpargne,
      totalCotisations,
      totalDepenses,
      creditActuel,
      nbMouvements,
    };
  } catch (err) {
    console.error("Erreur get-details-membre:", err);
    throw err;
  }
});

ipcMain.handle("get-membres", () => {
  try {
    const stmt = db.prepare(`
      SELECT m.*, 
             m.soldeEpargne,
             COALESCE(SUM(CASE WHEN mv.type IN ('cotisation_annuelle', 'versement_ponctuel') THEN mv.montant ELSE 0 END), 0) as totalCotisations,
             COALESCE(SUM(CASE WHEN c.statut = 'actif' THEN c.reste ELSE 0 END), 0) as creditActuel
      FROM membres m
      LEFT JOIN mouvements mv ON m.id = mv.membreId
      LEFT JOIN credits c ON m.id = c.id_membre
      GROUP BY m.id
      ORDER BY m.nom ASC
    `);
    return stmt.all();
  } catch (err) {
    console.error("Erreur get-membres:", err);
    throw err;
  }
});

ipcMain.handle("modifier-membre", (_event, id, membre) => {
  try {
    const { nom, telephone, profession, ville, dateAdhesion, caution } = membre;
    const stmt = db.prepare(`
      UPDATE membres 
      SET nom = ?, telephone = ?, profession = ?, ville = ?, dateAdhesion = ?, caution = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      nom,
      telephone,
      profession,
      ville,
      dateAdhesion,
      caution,
      id
    );
    return { success: info.changes > 0 };
  } catch (err) {
    console.error("Erreur modifier-membre:", err);
    throw err;
  }
});

ipcMain.handle("supprimer-membre", (_event, id) => {
  try {
    // Vérifier si le membre existe
    const membre = db.prepare("SELECT * FROM membres WHERE id = ?").get(id);
    if (!membre) {
      return { success: false, message: "Membre non trouvé" };
    }

    // Supprimer en cascade toutes les données liées
    db.prepare(
      "DELETE FROM remboursements WHERE id_credit IN (SELECT id FROM credits WHERE id_membre = ?)"
    ).run(id);
    db.prepare("DELETE FROM credits WHERE id_membre = ?").run(id);
    db.prepare("DELETE FROM mouvements WHERE membreId = ?").run(id);

    // Maintenant supprimer le membre
    const stmt = db.prepare("DELETE FROM membres WHERE id = ?");
    const info = stmt.run(id);

    return { success: info.changes > 0 };
  } catch (err) {
    console.error("Erreur supprimer-membre:", err);
    throw err;
  }
});

// IPC handlers pour les mouvements
ipcMain.handle("get-mouvements", () => {
  try {
    const stmt = db.prepare(`
      SELECT m.id, m.membreId, mem.nom as membreNom, m.type, m.montant, m.motif, m.date
      FROM mouvements m
      JOIN membres mem ON m.membreId = mem.id
      ORDER BY m.date DESC
    `);
    return stmt.all();
  } catch (err) {
    console.error("Erreur get-mouvements:", err);
    throw err;
  }
});

ipcMain.handle("ajouter-mouvement", (_event, mouvement) => {
  try {
    if (
      !mouvement ||
      !mouvement.membreId ||
      !mouvement.type ||
      !mouvement.montant
    ) {
      throw new Error("Champs requis manquants pour le mouvement");
    }

    const stmt = db.prepare(`
      INSERT INTO mouvements (membreId, type, montant, motif, date)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      mouvement.membreId,
      mouvement.type,
      mouvement.montant,
      mouvement.motif || null,
      new Date().toISOString()
    );

    // Mettre à jour le soldeEpargne dans la table membres si c'est un mouvement de type 'epargne'
    if (mouvement.type === "epargne") {
      const updateSolde = db.prepare(`
        UPDATE membres 
        SET soldeEpargne = soldeEpargne + ? 
        WHERE id = ?
      `);
      updateSolde.run(mouvement.montant, mouvement.membreId);
    }

    return { success: true, id: info.lastInsertRowid };
  } catch (err) {
    console.error("Erreur ajouter-mouvement:", err);
    throw err;
  }
});

ipcMain.handle("modifier-mouvement", (_event, id, mouvement) => {
  try {
    const { montant, motif } = mouvement;

    // Récupérer l'ancien mouvement pour calculer la différence
    const oldMouvement = db
      .prepare("SELECT * FROM mouvements WHERE id = ?")
      .get(id);

    const stmt = db.prepare(`
      UPDATE mouvements 
      SET montant = ?, motif = ?
      WHERE id = ?
    `);
    const info = stmt.run(montant, motif, id);

    // Mettre à jour le soldeEpargne si c'est un mouvement de type 'epargne'
    if (oldMouvement && oldMouvement.type === "epargne") {
      const difference = montant - oldMouvement.montant;
      const updateSolde = db.prepare(`
        UPDATE membres 
        SET soldeEpargne = soldeEpargne + ? 
        WHERE id = ?
      `);
      updateSolde.run(difference, oldMouvement.membreId);
    }

    return { success: info.changes > 0 };
  } catch (err) {
    console.error("Erreur modifier-mouvement:", err);
    throw err;
  }
});

ipcMain.handle("supprimer-mouvement", (_event, id) => {
  try {
    // Récupérer le mouvement avant de le supprimer
    const mouvement = db
      .prepare("SELECT * FROM mouvements WHERE id = ?")
      .get(id);

    const stmt = db.prepare("DELETE FROM mouvements WHERE id = ?");
    const info = stmt.run(id);

    // Mettre à jour le soldeEpargne si c'était un mouvement de type 'epargne'
    if (mouvement && mouvement.type === "epargne") {
      const updateSolde = db.prepare(`
        UPDATE membres 
        SET soldeEpargne = soldeEpargne - ? 
        WHERE id = ?
      `);
      updateSolde.run(mouvement.montant, mouvement.membreId);
    }

    return { success: info.changes > 0 };
  } catch (err) {
    console.error("Erreur supprimer-mouvement:", err);
    throw err;
  }
});

//IPC handlers pour dépenses communes
ipcMain.handle("get-depenses-communes", () => {
  return db.prepare("SELECT * FROM depenses_communes ORDER BY date DESC").all();
});

const CATEGORIES = [
  "Boisson",
  "Deuil",
  "Evènement",
  "Transport",
  "Matériel",
  "Communication",
  "autres",
] as const;

ipcMain.handle(
  "ajouter-depense-commune",
  (_e, { description, montant, categorie, useEpargne }) => {
    if (!CATEGORIES.includes(categorie)) {
      return { success: false, message: "Catégorie invalide" };
    }

    // Toujours insérer une ligne dans depenses_communes
    const insertDepenseCommune = db.prepare(`
      INSERT INTO depenses_communes (description, montant, categorie)
      VALUES (?, ?, ?)
    `);

    if (useEpargne) {
      // Mode épargne : prélever équitablement sur l'épargne de chaque membre
      const membres = db.prepare("SELECT id FROM membres").all();
      if (!membres.length) {
        return { success: false, message: "Aucun membre trouvé" };
      }

      const part = montant / membres.length;
      const insertMouvement = db.prepare(
        "INSERT INTO mouvements (membreId, type, montant, motif, date) VALUES (?, 'depense_commune_epargne', ?, ?, CURRENT_TIMESTAMP)"
      );

      const transaction = db.transaction(() => {
        // Insérer la dépense commune
        insertDepenseCommune.run(description, montant, categorie);

        // Créer un mouvement de type "depense_commune_epargne" pour chaque membre (montant négatif pour diminuer l'épargne)
        membres.forEach(({ id }: { id: number }) => {
          insertMouvement.run(id, -part, description);

          // Mettre à jour le soldeEpargne dans la table membres
          db.prepare(
            `
            UPDATE membres 
            SET soldeEpargne = soldeEpargne + ? 
            WHERE id = ?
          `
          ).run(-part, id);
        });
      });

      try {
        transaction();
        return { success: true };
      } catch (err) {
        console.error("Erreur transaction dépense sur épargne:", err);
        return { success: false, message: "Erreur transactionnelle" };
      }
    } else {
      // Mode fonds commun : prélever sur le fonds commun
      const transaction = db.transaction(() => {
        // Insérer la dépense commune
        insertDepenseCommune.run(description, montant, categorie);

        // Mettre à jour le solde du fonds
        db.prepare("UPDATE fonds SET solde = solde - ? WHERE id = 1").run(
          montant
        );
      });

      try {
        transaction();
        return { success: true };
      } catch (err) {
        console.error("Erreur transaction dépense fonds commun:", err);
        return { success: false, message: "Erreur transactionnelle" };
      }
    }
  }
);

ipcMain.handle(
  "modifier-depense-commune",
  (_e, id, { description, montant, categorie }) => {
    if (!CATEGORIES.includes(categorie)) {
      return { success: false, message: "Catégorie invalide" };
    }
    const stmt = db.prepare(`
    UPDATE depenses_communes
       SET description = ?, montant = ?, categorie = ?
     WHERE id = ?
   `);
    const info = stmt.run(description, montant, categorie, id);
    return { success: info.changes > 0 };
  }
);

ipcMain.handle("supprimer-depense-commune", (_e, id) => {
  const stmt = db.prepare("DELETE FROM depenses_communes WHERE id = ?");
  const info = stmt.run(id);
  return { success: info.changes > 0 };
});

// Handler pour récupérer le solde du fonds
ipcMain.handle("get-solde-fonds", () => {
  try {
    // Calculer le total des épargnes
    const totalEpargne =
      db
        .prepare(
          "SELECT SUM(montant) as total FROM mouvements WHERE type = 'épargne'"
        )
        .get().total || 0;

    // Calculer le total des cotisations
    const totalCotisations =
      db
        .prepare(
          "SELECT SUM(montant) as total FROM mouvements WHERE type = 'cotisation'"
        )
        .get().total || 0;

    // Calculer le total des dépenses communes
    const totalDepensesCommunes =
      db.prepare("SELECT SUM(montant) as total FROM depenses_communes").get()
        .total || 0;

    // Calculer le total des crédits
    const totalCredit =
      db
        .prepare(
          "SELECT SUM(montant_initial) as total FROM credits WHERE statut = 'actif'"
        )
        .get().total || 0;

    const solde =
      totalEpargne + totalCotisations - totalDepensesCommunes - totalCredit;

    return {
      solde,
      totalEpargne,
      totalCotisations,
      totalDepensesCommunes,
      totalCredit,
    };
  } catch (err) {
    console.error("Erreur get-solde-fonds:", err);
    throw err;
  }
});

// Handler pour ajouter un prélèvement de cotisation
ipcMain.handle(
  "ajouter-prelevement-cotisation",
  (_e, { montantParMembre, date, type }) => {
    try {
      const membres = db.prepare("SELECT id FROM membres").all();
      const membresInsuffisants = [];

      // Vérifier le solde de chaque membre
      for (const membre of membres) {
        const soldeEpargne = db
          .prepare(
            `
          SELECT COALESCE(SUM(montant), 0) as total 
          FROM mouvements 
          WHERE membreId = ? AND type = 'épargne'
        `
          )
          .get(membre.id).total;

        if (soldeEpargne < montantParMembre) {
          const membreInfo = db
            .prepare("SELECT nom FROM membres WHERE id = ?")
            .get(membre.id);
          membresInsuffisants.push({
            nom: membreInfo.nom,
            solde: soldeEpargne,
            montantRequis: montantParMembre,
          });
        }
      }

      if (membresInsuffisants.length > 0) {
        return {
          success: false,
          message: `Solde insuffisant pour ${membresInsuffisants.length} membre(s)`,
          membresInsuffisants,
        };
      }

      const stmt = db.prepare(`
      INSERT INTO mouvements (membreId, type, montant, motif, date)
      VALUES (?, ?, ?, ?, ?)
    `);

      for (const membre of membres) {
        const motif =
          type === "annuelle"
            ? `Cotisation annuelle - ${date}`
            : `Versement ponctuel - ${date}`;

        const mouvementType =
          type === "annuelle" ? "cotisation_annuelle" : "versement_ponctuel";
        stmt.run(membre.id, mouvementType, montantParMembre, motif, date);

        // Mettre à jour le soldeEpargne (déduire de l'épargne personnelle)
        db.prepare(
          `
          UPDATE membres 
          SET soldeEpargne = soldeEpargne - ? 
          WHERE id = ?
        `
        ).run(montantParMembre, membre.id);
      }

      return { success: true, nbMembres: membres.length };
    } catch (err) {
      console.error("Erreur ajouter-prelevement-cotisation:", err);
      throw err;
    }
  }
);

// IPC handlers pour les crédits
ipcMain.handle("get-credits", () => {
  try {
    const stmt = db.prepare(`
      SELECT c.id, m.nom, c.montant_initial, c.montant_a_rembourser, c.reste, c.date_accord, c.date_expiration, c.statut
      FROM credits c
      JOIN membres m ON c.id_membre = m.id
      ORDER BY c.date_accord DESC
    `);
    return stmt.all();
  } catch (err) {
    console.error("Erreur get-credits:", err);
    throw err;
  }
});

ipcMain.handle("accorder-credit", (_event, data) => {
  try {
    const { id_membre, montant, date_expiration } = data;
    const montantARembourser = Math.ceil(montant * 1.2); // 20% d'intérêt
    const dateAccord = new Date().toISOString().split("T")[0];

    const stmt = db.prepare(`
      INSERT INTO credits (id_membre, montant_initial, montant_a_rembourser, reste, date_accord, date_expiration, statut)
      VALUES (?, ?, ?, ?, ?, ?, 'actif')
    `);
    stmt.run(
      id_membre,
      montant,
      montantARembourser,
      montantARembourser,
      dateAccord,
      date_expiration
    );

    return { success: true };
  } catch (error: any) {
    console.error("Erreur accorder-credit:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("rembourser-credit", (_event, creditId, montant) => {
  try {
    const credit = db
      .prepare("SELECT * FROM credits WHERE id = ?")
      .get(creditId);
    if (!credit) return { success: false, message: "Crédit introuvable" };

    const nouveauReste = credit.reste - montant;
    const statut = nouveauReste <= 0 ? "remboursé" : credit.statut;

    db.prepare(`UPDATE credits SET reste = ?, statut = ? WHERE id = ?`).run(
      nouveauReste,
      statut,
      creditId
    );

    db.prepare(
      `INSERT INTO remboursements (id_credit, montant, date) VALUES (?, ?, ?)`
    ).run(creditId, montant, new Date().toISOString());

    return { success: true };
  } catch (error: any) {
    console.error("Erreur rembourser-credit:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("supprimer-credit", (_event, creditId) => {
  try {
    // Vérifier si le crédit existe
    const credit = db
      .prepare("SELECT * FROM credits WHERE id = ?")
      .get(creditId);
    if (!credit) {
      return { success: false, message: "Crédit introuvable" };
    }

    // Supprimer les remboursements associés
    db.prepare("DELETE FROM remboursements WHERE id_credit = ?").run(creditId);

    // Supprimer le crédit
    const stmt = db.prepare("DELETE FROM credits WHERE id = ?");
    const info = stmt.run(creditId);

    return { success: info.changes > 0 };
  } catch (err) {
    console.error("Erreur supprimer-credit:", err);
    throw err;
  }
});

// IPC handlers pour la caisse
ipcMain.handle(
  "ajouterCaisse",
  (_event, type, categorie, montant, description = "") => {
    try {
      const date = new Date().toISOString();
      const stmt = db.prepare(
        "INSERT INTO caisse (date, type, categorie, montant, description) VALUES (?, ?, ?, ?, ?)"
      );
      stmt.run(date, type, categorie, montant, description);
      return { success: true };
    } catch (error: any) {
      console.error("Erreur ajouterCaisse:", error);
      return { success: false, message: error.message };
    }
  }
);

ipcMain.handle("getSoldeCaisse", () => {
  try {
    const totalEntree =
      db
        .prepare(
          "SELECT SUM(montant) as total FROM caisse WHERE type = 'entree'"
        )
        .get().total || 0;
    const totalSortie =
      db
        .prepare(
          "SELECT SUM(montant) as total FROM caisse WHERE type = 'sortie'"
        )
        .get().total || 0;
    return totalEntree - totalSortie;
  } catch (error: any) {
    console.error("Erreur getSoldeCaisse:", error);
    return 0;
  }
});

ipcMain.handle("getHistoriqueCaisse", () => {
  try {
    return db.prepare("SELECT * FROM caisse ORDER BY date DESC").all();
  } catch (error: any) {
    console.error("Erreur getHistoriqueCaisse:", error);
    return [];
  }
});
