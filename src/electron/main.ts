import { app, BrowserWindow, ipcMain, shell } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import bcrypt from "bcryptjs";
// @ts-ignore
import Database from "better-sqlite3";
import { isDev } from "./utils.js";
import { getPreloadPath, getAssetPath } from "./pathResolver.js";

// Configuration des sessions utilisateur (pour usage futur)
// const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
// const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
// const REFRESH_TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 jours

// Interface pour les sessions utilisateur (pour usage futur)
// interface UserSession {
//   id: string;
//   userId: string;
//   email: string;
//   role: string;
//   createdAt: number;
//   expiresAt: number;
//   refreshToken: string;
//   isActive: boolean;
// }

// Map pour stocker les sessions utilisateur actives (pour usage futur)
// const activeUserSessions = new Map<string, UserSession>();

// Définir __dirname et __filename en mode ES Module
/* const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename); */

// Résolution du chemin de la base de données
function resolveDatabasePath(): string {
  if (isDev()) {
    const devPath = path.join(process.cwd(), "tontine.db");
    console.log("📂 DB (dev):", devPath);
    return devPath;
  }
  // En production, utiliser un dossier en écriture (userData)
  try {
    const userDataDir = app.getPath("userData");
    const prodPath = path.join(userDataDir, "tontine.db");
    console.log("📂 DB (prod userData):", prodPath);
    return prodPath;
  } catch (e) {
    // Fallback (ne devrait pas arriver)
    const fallback = path.join(os.homedir(), ".fonds-familial", "tontine.db");
    try {
      fs.mkdirSync(path.dirname(fallback), { recursive: true });
    } catch {}
    console.warn("⚠️ Fallback DB path:", fallback, e);
    return fallback;
  }
}

// Initialiser la base de données
const dbPath = resolveDatabasePath();
// Si la DB n'existe pas encore en prod, tenter de copier la DB packagée (si fournie)
try {
  if (!isDev()) {
    if (!fs.existsSync(dbPath)) {
      const resourcesDb = path.join(process.resourcesPath || app.getAppPath(), "tontine.db");
      if (fs.existsSync(resourcesDb)) {
        try {
          fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        } catch {}
        fs.copyFileSync(resourcesDb, dbPath);
        console.log("📦 DB initiale copiée depuis resources vers:", dbPath);
      }
    }
  }
} catch (e) {
  console.warn("⚠️ Impossible de copier la DB initiale:", e);
}

const db = new Database(dbPath);
// 1) Migration (ne s'exécute qu'une seule fois)
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
                   )),
    typeContribution TEXT NOT NULL DEFAULT 'prelevement_epargne'
                   CHECK(typeContribution IN (
                     'prelevement_epargne',
                     'contribution_individuelle'
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
    } catch (err: any) {
      console.log("ℹ️ Pas de données à migrer pour Deul → Deuil");
    }

    // Migration pour ajouter le champ typeContribution
    if (!commonCols.some((c: any) => c.name === "typeContribution")) {
      console.log("🛠 Ajout du champ typeContribution à depenses_communes...");
      db.exec(`
        ALTER TABLE depenses_communes 
        ADD COLUMN typeContribution TEXT NOT NULL DEFAULT 'prelevement_epargne'
        CHECK(typeContribution IN ('prelevement_epargne', 'contribution_individuelle'))
      `);
      console.log("✅ Champ typeContribution ajouté");
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
        type TEXT NOT NULL CHECK (type IN (
          'epargne',
          'cotisation_annuelle',
          'versement_ponctuel',
          'depot_caution',
          'restitution_caution',
          'credit',
          'remboursement',
          'interet',
          'depense_commune_fonds',
          'depense_commune_epargne',
          'depense_epargne',
          'depense_contribution',
          'restitution_solde',
          'sortie_restitution',
          'cassation'
        )),
        montant REAL NOT NULL,
        motif TEXT,
        date TEXT DEFAULT CURRENT_TIMESTAMP,
        sessionId INTEGER,
        FOREIGN KEY(membreId) REFERENCES membres(id) ON DELETE CASCADE,
        FOREIGN KEY(sessionId) REFERENCES sessions(id) ON DELETE SET NULL
      )
    `);

    // Créer la table sessions
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero INTEGER NOT NULL UNIQUE,
        nom TEXT,
        dateDebut TEXT NOT NULL,
        dateFin TEXT,
        totalEpargne REAL DEFAULT 0,
        totalInterets REAL DEFAULT 0,
        fondsDisponible REAL DEFAULT 0,
    statut TEXT NOT NULL DEFAULT 'active' CHECK (statut IN ('active', 'terminee', 'cassation', 'supprimee')),
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Créer la table session_membres pour suivre les contributions par session
    db.exec(`
      CREATE TABLE IF NOT EXISTS session_membres (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sessionId INTEGER NOT NULL,
        membreId INTEGER NOT NULL,
        epargneSession REAL DEFAULT 0,
        interetsSession REAL DEFAULT 0,
        partSession REAL DEFAULT 0,
        FOREIGN KEY(sessionId) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY(membreId) REFERENCES membres(id) ON DELETE CASCADE,
        UNIQUE(sessionId, membreId)
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
  } catch (err: any) {
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
  } catch (err: any) {
    console.log("ℹ️ Champ soldeEpargne déjà présent ou erreur:", err);
  }

  // Migration pour ajouter le champ updatedAt à la table mouvements
  try {
    console.log("🛠 Ajout du champ updatedAt à la table mouvements...");
    const cols = db.prepare("PRAGMA table_info(mouvements)").all();
    if (!cols.some((c: any) => c.name === "updatedAt")) {
      db.exec("ALTER TABLE mouvements ADD COLUMN updatedAt TEXT DEFAULT NULL");
      console.log("✅ Champ updatedAt ajouté à la table mouvements");
    }
  } catch (err: any) {
    console.log("ℹ️ Champ updatedAt déjà présent ou erreur:", err);
  }

  // Migration: ajouter colonne type à la table remboursements
  try {
    const colsR = db.prepare("PRAGMA table_info(remboursements)").all();
    if (!colsR.some((c: any) => c.name === "type")) {
      db.exec(
        "ALTER TABLE remboursements ADD COLUMN type TEXT CHECK(type IN ('principal','penalite')) DEFAULT 'principal'"
      );
      console.log("✅ Colonne 'type' ajoutée à remboursements");
    }
  } catch (err: any) {
    console.log("ℹ️ Colonne 'type' déjà présente ou erreur:", err);
  }

  // Migration pour ajouter les champs date_heure_echeance et heure_echeance à la table credits
  try {
    console.log(
      "🛠 Ajout des champs date_heure_echeance et heure_echeance à la table credits..."
    );
    const cols = db.prepare("PRAGMA table_info(credits)").all();
    if (!cols.some((c: any) => c.name === "date_heure_echeance")) {
      db.exec(
        "ALTER TABLE credits ADD COLUMN date_heure_echeance TEXT DEFAULT NULL"
      );
      console.log("✅ Champ date_heure_echeance ajouté à la table credits");
    }
    if (!cols.some((c: any) => c.name === "heure_echeance")) {
      db.exec(
        "ALTER TABLE credits ADD COLUMN heure_echeance TEXT DEFAULT '10:30:00'"
      );
      console.log("✅ Champ heure_echeance ajouté à la table credits");
    }
    // Ajouter la colonne penalite_due si manquante
    if (!cols.some((c: any) => c.name === "penalite_due")) {
      db.exec(
        "ALTER TABLE credits ADD COLUMN penalite_due REAL NOT NULL DEFAULT 0"
      );
      console.log("✅ Champ penalite_due ajouté à la table credits");
    }
  } catch (err: any) {
    console.log(
      "ℹ️ Champs date_heure_echeance et heure_echeance déjà présents ou erreur:",
      err
    );
  }

  // Migration pour ajouter le champ nom à la table sessions
  try {
    console.log("🛠 Ajout du champ nom à la table sessions...");
    const cols = db.prepare("PRAGMA table_info(sessions)").all();
    if (!cols.some((c: any) => c.name === "nom")) {
      db.exec("ALTER TABLE sessions ADD COLUMN nom TEXT");
      console.log("✅ Champ nom ajouté à la table sessions");
    }
  } catch (err: any) {
    console.log("ℹ️ Champ nom déjà présent ou erreur:", err);
  }

  // Migration: assigner une session par défaut aux mouvements sans sessionId
  try {
    // Vérifier s'il y a des mouvements sans sessionId
    const mouvementsSansSession = db.prepare(`
      SELECT COUNT(*) as count FROM mouvements WHERE sessionId IS NULL
    `).get();

    if (mouvementsSansSession.count > 0) {
      console.log(`🔄 ${mouvementsSansSession.count} mouvements sans session trouvés, attribution d'une session par défaut...`);
      
      // Récupérer ou créer une session par défaut
      let sessionParDefaut = db.prepare(`
        SELECT id FROM sessions WHERE statut = 'active' ORDER BY numero ASC LIMIT 1
      `).get();

      if (!sessionParDefaut) {
        // Créer une session par défaut si aucune n'existe
        const result = db.prepare(`
          INSERT INTO sessions (numero, dateDebut, statut, nom) 
          VALUES (1, ?, 'active', 'Session par défaut')
        `).run(new Date().toISOString());
        sessionParDefaut = { id: result.lastInsertRowid };
        console.log("✅ Session par défaut créée avec l'ID:", sessionParDefaut.id);
      }

      // Assigner cette session aux mouvements sans session
      const result = db.prepare(`
        UPDATE mouvements SET sessionId = ? WHERE sessionId IS NULL
      `).run(sessionParDefaut.id);

      console.log(`✅ ${result.changes} mouvements mis à jour avec la session ${sessionParDefaut.id}`);
    }
  } catch (err: any) {
    console.log("ℹ️ Erreur lors de la migration des sessions:", err);
  }

};

// Fonction pour synchroniser le soldeEpargne avec les mouvements réels
const synchroniserSoldesEpargne = () => {
  const membres = db.prepare("SELECT id FROM membres").all();
  const epargneNetteStmt = db.prepare(
    `SELECT COALESCE(SUM(
      CASE 
        WHEN type IN ('epargne','depense_epargne','depense_commune_epargne') THEN montant
        WHEN type = 'cassation' THEN -montant
        ELSE 0
      END
    ),0) as total
     FROM mouvements WHERE membreId = ?`
  );

  for (const membre of membres) {
    const epargneNette = epargneNetteStmt.get(membre.id).total || 0;
    db.prepare("UPDATE membres SET soldeEpargne = ? WHERE id = ?").run(
      epargneNette,
      membre.id
    );
  }
};

// Exécuter la migration (et créer le fichier si nécessaire)
try {
  migrateDatabase();
} catch (e: any) {
  // Si la base n'existe pas encore, s'assurer que le dossier est créé
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  } catch {}
  console.warn("⚠️ Migration initiale: ", e?.message || e);
}

// Vérifier l'état des contraintes de clé étrangère
console.log("🔍 Vérification des contraintes de clé étrangère...");
const foreignKeysEnabled = db.prepare("PRAGMA foreign_keys").get();
console.log("Foreign keys enabled:", foreignKeysEnabled);

// Lister toutes les contraintes de clé étrangère
const foreignKeys = db.prepare("PRAGMA foreign_key_list(membres)").all();
console.log("Contraintes de clé étrangère pour la table membres:", foreignKeys);

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
    type TEXT NOT NULL CHECK (type IN (
      'epargne',
      'cotisation_annuelle',
      'versement_ponctuel',
      'depot_caution',
      'restitution_caution',
      'credit',
      'remboursement',
      'interet',
      'depense_commune_fonds',
      'depense_commune_epargne',
      'depense_epargne',
      'depense_contribution',
      'restitution_solde',
      'sortie_restitution',
      'cassation'
    )),
    montant REAL NOT NULL,
    motif TEXT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(membreId) REFERENCES membres(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS credits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_membre INTEGER NOT NULL,
    montant_initial REAL NOT NULL,
    montant_a_rembourser REAL NOT NULL,
    reste REAL NOT NULL,
    date_accord TEXT NOT NULL,
    date_expiration TEXT NOT NULL,
    date_heure_echeance TEXT NOT NULL,
    heure_echeance TEXT NOT NULL,
    penalite_due REAL NOT NULL DEFAULT 0,
    statut TEXT NOT NULL CHECK(statut IN ('actif', 'remboursé', 'en_retard')),
    FOREIGN KEY(id_membre) REFERENCES membres(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS remboursements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_credit INTEGER NOT NULL,
    montant REAL NOT NULL,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(id_credit) REFERENCES credits(id) ON DELETE CASCADE
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

// Création de la table dons si elle n'existe pas
// (à placer après la création des autres tables)
db.exec(`
  CREATE TABLE IF NOT EXISTS dons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    membreId INTEGER NOT NULL,
    institution TEXT NOT NULL,
    montant REAL NOT NULL,
    date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    categorie TEXT,
    FOREIGN KEY(membreId) REFERENCES membres(id) ON DELETE CASCADE
  );
`);

// Migration: ajouter la colonne categorie à dons si manquante
try {
  const donsCols = db.prepare("PRAGMA table_info(dons)").all();
  const hasCategorie = donsCols.some((c: any) => c.name === "categorie");
  if (!hasCategorie) {
    console.log("🛠 Ajout du champ categorie à la table dons...");
    db.exec("ALTER TABLE dons ADD COLUMN categorie TEXT");
    console.log("✅ Champ categorie ajouté à la table dons");
  }
} catch (e) {
  console.warn("⚠️ Impossible de vérifier/ajouter la colonne categorie sur dons:", e);
}

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

// ============================================================================
// HANDLERS POUR LE SYSTÈME DE SESSIONS
// ============================================================================

// Fonction pour calculer automatiquement les intérêts de session
function calculerInteretsSession(sessionId: number) {
  try {
    const session = db.prepare(`
      SELECT * FROM sessions WHERE id = ?
    `).get(sessionId);
    
    if (!session) return false;

    // Vérifier si les intérêts ont déjà été calculés récemment
    const membresAvecInterets = db.prepare(`
      SELECT COUNT(*) as count FROM session_membres 
      WHERE sessionId = ? AND interetsSession > 0
    `).get(sessionId);
    
    // Si les intérêts ont déjà été calculés, ne pas recalculer
    if (membresAvecInterets.count > 0) {
      console.log(`ℹ️ Intérêts déjà calculés pour la session ${sessionId}`);
      return true;
    }

    // Réinitialiser les intérêts pour cette session
    db.prepare(`
      UPDATE session_membres 
      SET interetsSession = 0 
      WHERE sessionId = ?
    `).run(sessionId);

    let totalInterets = 0;

    // 1. Calculer les intérêts générés par les crédits pendant cette session
    // (inclut les crédits accordés avant la session mais toujours actifs)
    const creditsSession = db.prepare(`
      SELECT c.id, c.id_membre, c.montant_initial, c.montant_a_rembourser, c.date_accord, c.statut, c.reste
      FROM credits c
      WHERE c.statut IN ('actif', 'en_retard', 'remboursé')
      AND EXISTS (
        SELECT 1 FROM session_membres sm 
        WHERE sm.sessionId = ? AND sm.membreId = c.id_membre
      )
    `).all(sessionId);

    for (const credit of creditsSession) {
      // Calculer les intérêts générés par ce crédit pendant la session
      let interetCredit = 0;
      
      if (credit.statut === 'remboursé') {
        // Si le crédit est remboursé, vérifier s'il a été remboursé pendant cette session
        const dateRemboursement = db.prepare(`
          SELECT MAX(date) as dateRemboursement
          FROM remboursements 
          WHERE id_credit = ?
        `).get(credit.id);
        
        if (dateRemboursement && dateRemboursement.dateRemboursement) {
          const dateRemb = new Date(dateRemboursement.dateRemboursement);
          const dateDebutSession = new Date(session.dateDebut);
          const dateFinSession = session.dateFin ? new Date(session.dateFin) : new Date();
          
          // Vérifier si le remboursement a eu lieu pendant cette session
          if (dateRemb >= dateDebutSession && dateRemb <= dateFinSession) {
            interetCredit = Math.max(0, credit.montant_a_rembourser - credit.montant_initial);
          }
        }
      } else {
        // Si le crédit est en cours, calculer les intérêts accumulés pendant la session
        const dateDebutCredit = new Date(credit.date_accord);
        const dateDebutSession = new Date(session.dateDebut);
        const dateFinSession = session.dateFin ? new Date(session.dateFin) : new Date();
        
        // Calculer la période d'intersection entre le crédit et la session
        const dateDebutCalcul = dateDebutCredit > dateDebutSession ? dateDebutCredit : dateDebutSession;
        const dateFinCalcul = dateFinSession;
        
        const joursDiff = Math.max(0, (dateFinCalcul.getTime() - dateDebutCalcul.getTime()) / (1000 * 60 * 60 * 24));
        const tauxAnnuel = 0.20; // 20% par an (comme défini dans le système)
        interetCredit = credit.montant_initial * (tauxAnnuel / 365) * joursDiff;
      }
      
      if (interetCredit > 0) {
        db.prepare(`
          UPDATE session_membres 
          SET interetsSession = interetsSession + ? 
          WHERE sessionId = ? AND membreId = ?
        `).run(interetCredit, sessionId, credit.id_membre);
        totalInterets += interetCredit;
      }
    }

    // 2. Ajouter les intérêts des remboursements de pénalités pour cette session
    const penalitesSession = db.prepare(`
      SELECT r.montant, c.id_membre
      FROM remboursements r
      JOIN credits c ON r.id_credit = c.id
      WHERE r.type = 'penalite'
      AND r.date >= ?
      AND (r.date <= ? OR ? IS NULL)
      AND EXISTS (
        SELECT 1 FROM session_membres sm 
        WHERE sm.sessionId = ? AND sm.membreId = c.id_membre
      )
    `).all(session.dateDebut, session.dateFin || new Date().toISOString(), session.dateFin, sessionId);

    for (const penalite of penalitesSession) {
      db.prepare(`
        UPDATE session_membres 
        SET interetsSession = interetsSession + ? 
        WHERE sessionId = ? AND membreId = ?
      `).run(penalite.montant, sessionId, penalite.id_membre);
      totalInterets += penalite.montant;
    }

    // 3. Ajouter les intérêts des mouvements de type 'interet' pour cette session
    const interetsMouvements = db.prepare(`
      SELECT m.membreId, m.montant
      FROM mouvements m
      WHERE m.type = 'interet' 
      AND m.date >= ?
      AND (m.date <= ? OR ? IS NULL)
      AND EXISTS (
        SELECT 1 FROM session_membres sm 
        WHERE sm.sessionId = ? AND sm.membreId = m.membreId
      )
    `).all(session.dateDebut, session.dateFin || new Date().toISOString(), session.dateFin, sessionId);

    for (const interetMouvement of interetsMouvements) {
      db.prepare(`
        UPDATE session_membres 
        SET interetsSession = interetsSession + ? 
        WHERE sessionId = ? AND membreId = ?
      `).run(interetMouvement.montant, sessionId, interetMouvement.membreId);
      totalInterets += interetMouvement.montant;
    }

    // 4. Calculer les intérêts sur les épargnes (optionnel - taux plus réaliste)
    const epargnesSession = db.prepare(`
      SELECT sm.membreId, sm.epargneSession, s.dateDebut, s.dateFin
      FROM session_membres sm
      JOIN sessions s ON sm.sessionId = s.id
      WHERE sm.sessionId = ? AND sm.epargneSession > 0
    `).all(sessionId);

    let totalInteretsEpargnes = 0;
    for (const epargne of epargnesSession) {
      const dateDebut = new Date(epargne.dateDebut);
      const dateFin = epargne.dateFin ? new Date(epargne.dateFin) : new Date();
      const joursDiff = Math.max(0, (dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24));
      const tauxAnnuel = 0.10; // 10% par an (plus réaliste pour une tontine)
      const interet = epargne.epargneSession * (tauxAnnuel / 365) * joursDiff;
      totalInteretsEpargnes += interet;

      // Mettre à jour les intérêts du membre
      db.prepare(`
        UPDATE session_membres 
        SET interetsSession = interetsSession + ? 
        WHERE sessionId = ? AND membreId = ?
      `).run(interet, sessionId, epargne.membreId);
    }

    console.log(`✅ Intérêts calculés pour la session ${sessionId}: ${totalInterets.toLocaleString()} FCFA (dont ${totalInteretsEpargnes.toLocaleString()} FCFA sur épargnes)`);
    return true;
  } catch (error) {
    console.error("Erreur calculerInteretsSession:", error);
    return false;
  }
}

// Handler pour récupérer les sessions avec calcul automatique des intérêts
ipcMain.handle("get-sessions", () => {
  try {
    const sessions = db.prepare(`
      SELECT * FROM sessions 
      WHERE statut != 'supprimee'
      ORDER BY numero DESC
    `).all();

    const sessionActive = db.prepare(`
      SELECT * FROM sessions 
      WHERE statut = 'active' 
      ORDER BY numero DESC 
      LIMIT 1
    `).get();

    // Calculer automatiquement les intérêts pour la session active
    if (sessionActive) {
      calculerInteretsSession(sessionActive.id);
    }

    // Pour chaque session, récupérer les détails des membres
    const sessionsAvecMembres = sessions.map((session: any) => {
      const membres = db.prepare(`
        SELECT sm.*, m.nom 
        FROM session_membres sm
        JOIN membres m ON sm.membreId = m.id
        WHERE sm.sessionId = ?
      `).all(session.id);

      const totalEpargne = (membres || []).reduce(
        (sum: number, m: any) => sum + (m.epargneSession || 0),
        0
      );
      const totalInterets = (membres || []).reduce(
        (sum: number, m: any) => sum + (m.interetsSession || 0),
        0
      );

      return {
        ...session,
        totalEpargne,
        totalInterets,
        membres: membres || [],
      };
    });

    return {
      sessions: sessionsAvecMembres,
      sessionActive: sessionActive
        ? (() => {
            const membresActifs =
              db.prepare(`
          SELECT sm.*, m.nom 
          FROM session_membres sm
          JOIN membres m ON sm.membreId = m.id
          WHERE sm.sessionId = ?
              `).all(sessionActive.id) || [];
            const totalEpargne = membresActifs.reduce(
              (sum: number, m: any) => sum + (m.epargneSession || 0),
              0
            );
            const totalInterets = membresActifs.reduce(
              (sum: number, m: any) => sum + (m.interetsSession || 0),
              0
            );
            return {
              ...sessionActive,
              totalEpargne,
              totalInterets,
              membres: membresActifs,
            };
          })()
        : null
    };
  } catch (err: any) {
    console.error("Erreur get-sessions:", err);
    throw err;
  }
});

// Handler pour créer une nouvelle session
ipcMain.handle("creer-session", async () => {
  try {
    const transaction = db.transaction(() => {
      // 1. Vérifier s'il y a une session active
      const sessionActive = db.prepare(`
        SELECT * FROM sessions 
        WHERE statut = 'active' 
        ORDER BY numero DESC 
        LIMIT 1
      `).get();

      if (sessionActive) {
        // 2. Terminer la session active
        db.prepare(`
          UPDATE sessions 
          SET statut = 'terminee', dateFin = ? 
          WHERE id = ?
        `).run(new Date().toISOString(), sessionActive.id);

        // 3. Calculer les totaux de la session terminée
        const membres = db.prepare(`
          SELECT sm.*, m.nom 
          FROM session_membres sm
          JOIN membres m ON sm.membreId = m.id
          WHERE sm.sessionId = ?
        `).all(sessionActive.id);

        const totalEpargne = membres.reduce((sum: number, m: any) => sum + m.epargneSession, 0);
        // Intérêts de la session = somme des pénalités payées dans l'intervalle de la session
        const totalInterets = db
          .prepare(
            `SELECT COALESCE(SUM(montant), 0) as total FROM remboursements 
             WHERE date >= ? AND date <= ? AND type = 'penalite'`
          )
          .get(sessionActive.dateDebut, new Date().toISOString()).total || 0;

        // 4. Mettre à jour les totaux de la session
        db.prepare(`
          UPDATE sessions 
          SET totalEpargne = ?, totalInterets = ?, fondsDisponible = ?
          WHERE id = ?
        `).run(totalEpargne, totalInterets, totalEpargne + totalInterets, sessionActive.id);

        console.log(`✅ Session ${sessionActive.numero} terminée avec ${totalEpargne.toLocaleString()} FCFA d'épargnes et ${totalInterets.toLocaleString()} FCFA d'intérêts`);
      }

      // 5. Créer la nouvelle session
      const prochainNumero = db.prepare(`
        SELECT COALESCE(MAX(numero), 0) + 1 as prochain 
        FROM sessions
        WHERE statut != 'supprimee'
      `).get().prochain;

      const nouvelleSession = db.prepare(`
        INSERT INTO sessions (numero, dateDebut, statut)
        VALUES (?, ?, 'active')
      `).run(prochainNumero, new Date().toISOString());

      const sessionId = nouvelleSession.lastInsertRowid as number;

      // 5.a APPLIQUER AUTOMATIQUEMENT LES PÉNALITÉS SUR TOUS LES CRÉDITS NON REMBOURSÉS
      console.log("🔄 Application automatique des pénalités sur les crédits non remboursés...");
      const creditsNonRembourses = db.prepare(`
        SELECT id, reste, penalite_due, statut
        FROM credits 
        WHERE statut IN ('actif', 'en_retard') AND (penalite_due IS NULL OR penalite_due <= 0)
      `).all();

      let penalitesAppliquees = 0;
      for (const credit of creditsNonRembourses) {
        // Appliquer une pénalité de 20% sur le montant restant à rembourser
        const penalite = Math.ceil((credit.reste || 0) * 0.2);
        db.prepare(`
          UPDATE credits 
          SET penalite_due = ?, statut = 'en_retard' 
          WHERE id = ?
        `).run(penalite, credit.id);
        penalitesAppliquees++;
      }
      
      if (penalitesAppliquees > 0) {
        console.log(`✅ ${penalitesAppliquees} pénalités appliquées automatiquement sur les crédits non remboursés`);
      } else {
        console.log("ℹ️ Aucune nouvelle pénalité à appliquer");
      }

      // 5.b Ne pas migrer de fonds: nouvelle session repart à zéro
      db.prepare(`UPDATE sessions SET fondsDisponible = 0 WHERE id = ?`).run(sessionId);

      // 6. Initialiser les entrées pour tous les membres
      const membres = db.prepare("SELECT id, nom FROM membres").all();
      for (const membre of membres) {
        db.prepare(`
          INSERT INTO session_membres (sessionId, membreId, epargneSession, interetsSession, partSession)
          VALUES (?, ?, 0, 0, 0)
        `).run(sessionId, membre.id);
      }

      console.log(`✅ Nouvelle session ${prochainNumero} créée avec ${membres.length} membres`);

      // Message de retour avec information sur les pénalités appliquées
      let messageRetour = `Session ${prochainNumero} créée avec succès`;
      if (penalitesAppliquees > 0) {
        messageRetour += `. ${penalitesAppliquees} pénalités ont été appliquées automatiquement sur les crédits non remboursés.`;
      }

      return {
        success: true,
        message: messageRetour,
        sessionId: sessionId,
        penalitesAppliquees: penalitesAppliquees
      };
    });

    return transaction();
  } catch (err: any) {
    console.error("Erreur creer-session:", err);
    return {
      success: false,
      message: err?.message || "Erreur lors de la création de la session"
    };
  }
});

// Handler pour terminer une session
ipcMain.handle("terminer-session", async (_event, sessionId) => {
  try {
    const transaction = db.transaction(() => {
      // 1. Vérifier que la session existe et est active
      const session = db.prepare(`
        SELECT * FROM sessions WHERE id = ? AND statut = 'active'
      `).get(sessionId);

      if (!session) {
        throw new Error("Session non trouvée ou déjà terminée");
      }

      // 2. Calculer les totaux actuels
      const membres = db.prepare(`
        SELECT sm.*, m.nom 
        FROM session_membres sm
        JOIN membres m ON sm.membreId = m.id
        WHERE sm.sessionId = ?
      `).all(sessionId);

      const totalEpargne = membres.reduce((sum: number, m: any) => sum + m.epargneSession, 0);
      // Intérêts de la session = somme des pénalités payées dans l'intervalle de la session
      const totalInterets = db
        .prepare(
          `SELECT COALESCE(SUM(montant), 0) as total FROM remboursements 
           WHERE date >= ? AND date <= ? AND type = 'penalite'`
        )
        .get(session.dateDebut, new Date().toISOString()).total || 0;

      // 3. Terminer la session
      db.prepare(`
        UPDATE sessions 
        SET statut = 'terminee', dateFin = ?, totalEpargne = ?, totalInterets = ?, fondsDisponible = ?
        WHERE id = ?
      `).run(new Date().toISOString(), totalEpargne, totalInterets, totalEpargne + totalInterets, sessionId);

      console.log(`✅ Session ${session.numero} terminée avec ${totalEpargne.toLocaleString()} FCFA d'épargnes et ${totalInterets.toLocaleString()} FCFA d'intérêts`);

      return {
        success: true,
        message: `Session ${session.numero} terminée avec succès`
      };
    });

    return transaction();
  } catch (err: any) {
    console.error("Erreur terminer-session:", err);
    return {
      success: false,
      message: err?.message || "Erreur lors de la terminaison de la session"
    };
  }
});

// Handler pour modifier le nom d'une session
ipcMain.handle("modifier-nom-session", async (event, sessionId: number, nouveauNom: string) => {
  try {
    const result = db.prepare(`
      UPDATE sessions 
      SET nom = ? 
      WHERE id = ?
    `).run(nouveauNom, sessionId);

    if (result.changes > 0) {
      console.log(`✅ Nom de la session ${sessionId} modifié en "${nouveauNom}"`);
      return { success: true, message: "Nom de session modifié avec succès" };
    } else {
      return { success: false, message: "Session non trouvée" };
    }
  } catch (err: any) {
    console.error("Erreur modifier-nom-session:", err);
    return { success: false, message: "Erreur lors de la modification du nom" };
  }
});

// Handler pour mettre à jour les épargnes d'un membre dans la session active
ipcMain.handle("update-session-epargne", async (_event, membreId, montant) => {
  try {
    // 1. Récupérer la session active
    const sessionActive = db.prepare(`
      SELECT * FROM sessions WHERE statut = 'active' ORDER BY numero DESC LIMIT 1
    `).get();

    if (!sessionActive) {
      throw new Error("Aucune session active trouvée");
    }

    // 2. Mettre à jour l'épargne du membre dans la session
    db.prepare(`
      UPDATE session_membres 
      SET epargneSession = epargneSession + ? 
      WHERE sessionId = ? AND membreId = ?
    `).run(montant, sessionActive.id, membreId);

    console.log(`✅ Épargne mise à jour pour le membre ${membreId} dans la session ${sessionActive.numero}`);

    return {
      success: true,
      message: "Épargne mise à jour avec succès"
    };
  } catch (err: any) {
    console.error("Erreur update-session-epargne:", err);
    return {
      success: false,
      message: err?.message || "Erreur lors de la mise à jour de l'épargne"
    };
  }
});

// Handler pour mettre à jour les intérêts d'un membre dans la session active
ipcMain.handle("update-session-interets", async (_event, membreId, montant) => {
  try {
    // 1. Récupérer la session active
    const sessionActive = db.prepare(`
      SELECT * FROM sessions WHERE statut = 'active' ORDER BY numero DESC LIMIT 1
    `).get();

    if (!sessionActive) {
      throw new Error("Aucune session active trouvée");
    }

    // 2. Mettre à jour les intérêts du membre dans la session (créer la ligne si manquante)
    const res = db.prepare(`
      UPDATE session_membres 
      SET interetsSession = interetsSession + ? 
      WHERE sessionId = ? AND membreId = ?
    `).run(montant, sessionActive.id, membreId);
    if (res.changes === 0) {
      db.prepare(
        `INSERT OR IGNORE INTO session_membres (sessionId, membreId, epargneSession, interetsSession, partSession)
         VALUES (?, ?, 0, ?, 0)`
      ).run(sessionActive.id, membreId, montant);
    }

    console.log(`✅ Intérêts mis à jour pour le membre ${membreId} dans la session ${sessionActive.numero}`);

    return {
      success: true,
      message: "Intérêts mis à jour avec succès"
    };
  } catch (err: any) {
    console.error("Erreur update-session-interets:", err);
    return {
      success: false,
      message: err?.message || "Erreur lors de la mise à jour des intérêts"
    };
  }
});

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    icon: (() => {
      // Priorité à l'icône .ico pour Windows
      const ico = getAssetPath("icon.ico");
      const png = getAssetPath("desktopIcon.png");
      try {
        if (fs.existsSync(ico)) return ico;
      } catch {}
      try {
        if (fs.existsSync(png)) return png;
      } catch {}
      return undefined as any;
    })(),
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Handler pour supprimer une session (soft delete)
  ipcMain.handle("supprimer-session", (_event, sessionId) => {
    try {
      // On autorise la suppression des sessions non actives
      const session = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(sessionId);
      if (!session) {
        return { success: false, message: "Session introuvable" };
      }
      if (session.statut === 'active') {
        return { success: false, message: "Impossible de supprimer une session active" };
      }
      // Suppression définitive: mouvements.sessionId -> NULL (ON DELETE SET NULL), session_membres -> CASCADE
      db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
      if (mainWindow) {
        mainWindow.webContents.send("sessions-updated");
      }
      return { success: true, message: "Session supprimée" };
    } catch (err: any) {
      console.error("Erreur supprimer-session:", err);
      return { success: false, message: err?.message || "Erreur lors de la suppression" };
    }
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
 /*  if (isDev()) {
    mainWindow.webContents.openDevTools();
  } */
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

// IPC handlers pour l'export PDF
ipcMain.handle("export-mouvements-pdf", async (_event, sessionId = null) => {
  try {
    console.log("🔄 Génération PDF des mouvements...");
    
    // Récupérer les mouvements
    let mouvements;
    if (sessionId) {
      mouvements = db.prepare(`
        SELECT m.*, mem.nom as membreNom, s.nom as sessionNom, s.numero as sessionNumero
        FROM mouvements m
        JOIN membres mem ON m.membreId = mem.id
        LEFT JOIN sessions s ON m.sessionId = s.id
        WHERE m.sessionId = ?
        ORDER BY m.date DESC
      `).all(sessionId);
    } else {
      mouvements = db.prepare(`
        SELECT m.*, mem.nom as membreNom, s.nom as sessionNom, s.numero as sessionNumero
        FROM mouvements m
        JOIN membres mem ON m.membreId = mem.id
        LEFT JOIN sessions s ON m.sessionId = s.id
        ORDER BY m.date DESC
      `).all();
    }

    // Générer le HTML pour le PDF
    const htmlContent = generateMouvementsHTML(mouvements, sessionId);
    
    // Créer une fenêtre invisible pour générer le PDF
    const pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    
    // Générer le PDF
    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: {
        marginType: 'default'
      },
      landscape: false
    });

    pdfWindow.close();


    const fileName = sessionId ? `mouvements_session_${sessionId}.pdf` : 'tous_mouvements.pdf';
    const filePath = path.join(os.homedir(), 'Downloads', fileName);
    
    fs.writeFileSync(filePath, pdfBuffer);
    
    // Ouvrir automatiquement le PDF
    await shell.openPath(filePath);
    
    console.log(`✅ PDF généré et ouvert: ${filePath}`);
    return { success: true, filePath, message: `PDF généré et ouvert automatiquement` };

  } catch (error: any) {
    console.error("❌ Erreur export PDF mouvements:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("export-membre-pdf", async (_event, membreId) => {
  try {
    console.log(`🔄 Génération PDF pour le membre ${membreId}...`);
    
    // Récupérer les données du membre
    const membre = db.prepare("SELECT * FROM membres WHERE id = ?").get(membreId);
    if (!membre) {
      throw new Error("Membre non trouvé");
    }

    // Récupérer l'historique complet du membre
    const mouvements = db.prepare(`
      SELECT m.*, s.nom as sessionNom, s.numero as sessionNumero
      FROM mouvements m
      LEFT JOIN sessions s ON m.sessionId = s.id
      WHERE m.membreId = ?
      ORDER BY m.date DESC
    `).all(membreId);

    // Récupérer les crédits du membre
    const credits = db.prepare(`
      SELECT * FROM credits WHERE id_membre = ? ORDER BY date_accord DESC
    `).all(membreId);

    // Récupérer les dons du membre
    const dons = db.prepare(`
      SELECT * FROM dons WHERE membreId = ? ORDER BY date DESC
    `).all(membreId);

    // Générer le HTML pour le PDF
    const htmlContent = generateMembreHTML(membre, mouvements, credits, dons);
    
    // Créer une fenêtre invisible pour générer le PDF
    const pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    
    // Générer le PDF
    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: {
        marginType: 'default'
      },
      landscape: false
    });

    pdfWindow.close();


    const fileName = `membre_${membre.nom.replace(/\s+/g, '_')}_${membreId}.pdf`;
    const filePath = path.join(os.homedir(), 'Downloads', fileName);
    
    fs.writeFileSync(filePath, pdfBuffer);
    
    // Ouvrir automatiquement le PDF
    await shell.openPath(filePath);
    
    console.log(`✅ PDF généré et ouvert: ${filePath}`);
    return { success: true, filePath, message: `PDF généré et ouvert automatiquement` };

  } catch (error: any) {
    console.error("❌ Erreur export PDF membre:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("export-cassation-pdf", async (_event) => {
  try {
    console.log("🔄 Génération PDF de la cassation...");
    
    // Récupérer la simulation de cassation
    const simulation = calculerSimulationCassation();
    if (!simulation || simulation.membres.length === 0) {
      throw new Error("Aucune donnée de cassation disponible");
    }

    // Récupérer les informations de la session active/terminée
    const sessionInfo = db.prepare(`
      SELECT * FROM sessions 
      WHERE statut IN ('active', 'terminee') 
      ORDER BY numero DESC 
      LIMIT 1
    `).get();

    // Générer le HTML pour le PDF
    const htmlContent = generateCassationHTML(simulation, sessionInfo);
    
    // Créer une fenêtre invisible pour générer le PDF
    const pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    
    // Générer le PDF
    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: {
        marginType: 'default'
      },
      landscape: false
    });

    pdfWindow.close();

    const fileName = `cassation_${sessionInfo?.numero || 'session'}_${new Date().toISOString().split('T')[0]}.pdf`;
    const filePath = path.join(os.homedir(), 'Downloads', fileName);
    
    fs.writeFileSync(filePath, pdfBuffer);
    
    // Ouvrir automatiquement le PDF
    await shell.openPath(filePath);
    
    console.log(`✅ PDF de cassation généré et ouvert: ${filePath}`);
    return { success: true, filePath, message: `PDF de cassation généré et ouvert automatiquement` };

  } catch (error: any) {
    console.error("❌ Erreur export PDF cassation:", error);
    return { success: false, message: error.message };
  }
});

// Fonction pour générer le HTML de la cassation
function generateCassationHTML(simulation: any, sessionInfo: any) {
  const totalDistribue = simulation.membres.reduce((sum: number, m: any) => sum + (m.partCassation || 0), 0);
  const totalEpargne = simulation.membres.reduce((sum: number, m: any) => sum + (m.partEpargne || 0), 0);
  const totalInterets = simulation.membres.reduce((sum: number, m: any) => sum + (m.partInterets || 0), 0);
  const membresActifs = simulation.membres.filter((m: any) => m.partCassation > 0);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Rapport de Cassation</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
            .subtitle { font-size: 14px; color: #666; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
            .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
            .summary-item { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; }
            .summary-label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
            .summary-value { font-size: 18px; font-weight: bold; color: #1e293b; }
            .summary-value.positive { color: #16a34a; }
            .summary-value.neutral { color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; font-size: 12px; }
            th { background-color: #2563eb; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .amount-cell { text-align: right; font-weight: bold; }
            .amount-positive { color: #16a34a; }
            .amount-negative { color: #dc2626; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            .highlight-row { background-color: #fef3c7 !important; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">Famille Tiwa Joseph - Rapport de Cassation</div>
            <div class="subtitle">
                ${sessionInfo ? `Session ${sessionInfo.numero}${sessionInfo.nom ? ` - ${sessionInfo.nom}` : ''}` : 'Session en cours'}<br>
                Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Résumé de la Distribution</div>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-label">Total Distribué</div>
                    <div class="summary-value positive">${totalDistribue.toLocaleString('fr-FR')} FCFA</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Épargnes Distribuées</div>
                    <div class="summary-value">${totalEpargne.toLocaleString('fr-FR')} FCFA</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Intérêts Distribués</div>
                    <div class="summary-value positive">${totalInterets.toLocaleString('fr-FR')} FCFA</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Membres Bénéficiaires</div>
                    <div class="summary-value neutral">${membresActifs.length} membres</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Détail des Parts par Membre</div>
            <table>
                <thead>
                    <tr>
                        <th>Membre</th>
                        <th>Épargne Nette</th>
                        <th>Part Épargne</th>
                        <th>Part Intérêts</th>
                        <th>Total Reçu</th>
                        <th>Pourcentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${simulation.membres.map((membre: any) => `
                        <tr ${membre.partCassation > 0 ? '' : 'style="opacity: 0.5;"'}>
                            <td><strong>${membre.nom}</strong></td>
                            <td class="amount-cell">${(membre.epargneNette || 0).toLocaleString('fr-FR')} FCFA</td>
                            <td class="amount-cell">${(membre.partEpargne || 0).toLocaleString('fr-FR')} FCFA</td>
                            <td class="amount-cell amount-positive">${(membre.partInterets || 0).toLocaleString('fr-FR')} FCFA</td>
                            <td class="amount-cell ${membre.partCassation > 0 ? 'amount-positive' : ''}">${(membre.partCassation || 0).toLocaleString('fr-FR')} FCFA</td>
                            <td class="amount-cell">${totalDistribue > 0 ? ((membre.partCassation || 0) / totalDistribue * 100).toFixed(1) : '0.0'}%</td>
                        </tr>
                    `).join('')}
                    <tr class="highlight-row">
                        <td><strong>TOTAL</strong></td>
                        <td class="amount-cell"><strong>${simulation.details.totalContributionsNettes.toLocaleString('fr-FR')} FCFA</strong></td>
                        <td class="amount-cell"><strong>${totalEpargne.toLocaleString('fr-FR')} FCFA</strong></td>
                        <td class="amount-cell"><strong>${totalInterets.toLocaleString('fr-FR')} FCFA</strong></td>
                        <td class="amount-cell"><strong>${totalDistribue.toLocaleString('fr-FR')} FCFA</strong></td>
                        <td class="amount-cell"><strong>100.0%</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">Informations Détaillées</div>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-label">Fonds Disponibles</div>
                    <div class="summary-value">${simulation.details.fondsDisponibles.toLocaleString('fr-FR')} FCFA</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Total Épargnes</div>
                    <div class="summary-value">${simulation.details.totalEpargnes.toLocaleString('fr-FR')} FCFA</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Total Crédits</div>
                    <div class="summary-value">${simulation.details.totalCredits.toLocaleString('fr-FR')} FCFA</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Intérêts Générés</div>
                    <div class="summary-value positive">${simulation.details.interetsPerçus.toLocaleString('fr-FR')} FCFA</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Méthode de Calcul</div>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 11px; line-height: 1.5;">
                <p><strong>Répartition des épargnes :</strong> Chaque membre reçoit sa contribution nette (épargnes - dépenses communes).</p>
                <p><strong>Répartition des intérêts :</strong> Les intérêts générés sont distribués proportionnellement aux épargnes nettes de chaque membre.</p>
                <p><strong>Ratio d'intérêts :</strong> ${(simulation.details.repartition.ratioInterets * 100).toFixed(2)}% du total des épargnes.</p>
                <p><strong>Facteur d'échelle :</strong> ${simulation.details.facteurEchelle.toFixed(4)} (ajustement pour distribution équitable).</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Document officiel généré automatiquement par le système Famille Tiwa Joseph</p>
            <p>Ce rapport certifie la répartition équitable des fonds selon les contributions de chaque membre</p>
        </div>
    </body>
    </html>
  `;
}

// Fonction pour générer le HTML des mouvements
function generateMouvementsHTML(mouvements: any[], sessionId: number | null) {
  const titre = sessionId ? 'Mouvements de la Session' : 'Tous les Mouvements';
  const totalMontant = mouvements.reduce((sum, m) => sum + (m.montant || 0), 0);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${titre}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
            .subtitle { font-size: 14px; color: #666; }
            .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #2563eb; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .amount-positive { color: #16a34a; font-weight: bold; }
            .amount-negative { color: #dc2626; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">Famille Tiwa Joseph - ${titre}</div>
            <div class="subtitle">Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
        </div>
        
        <div class="summary">
            <strong>Résumé:</strong><br>
            Nombre de mouvements: ${mouvements.length}<br>
            Total des montants: ${totalMontant.toLocaleString('fr-FR')} FCFA
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Membre</th>
                    <th>Type</th>
                    <th>Montant (FCFA)</th>
                    <th>Motif</th>
                    <th>Session</th>
                </tr>
            </thead>
            <tbody>
                ${mouvements.map(m => `
                    <tr>
                        <td>${new Date(m.date).toLocaleDateString('fr-FR')}</td>
                        <td>${m.membreNom}</td>
                        <td>${m.type}</td>
                        <td class="${m.montant >= 0 ? 'amount-positive' : 'amount-negative'}">
                            ${m.montant.toLocaleString('fr-FR')}
                        </td>
                        <td>${m.motif || '-'}</td>
                        <td>${m.sessionNom || `Session ${m.sessionNumero || '-'}`}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="footer">
            Document généré automatiquement par Famille Tiwa Joseph
        </div>
    </body>
    </html>
  `;
}

// Fonction pour générer le HTML du membre
function generateMembreHTML(membre: any, mouvements: any[], credits: any[], dons: any[]) {
  const totalMouvements = mouvements.reduce((sum, m) => sum + (m.montant || 0), 0);
  const totalCredits = credits.reduce((sum, c) => sum + (c.montant_initial || 0), 0);
  const totalDons = dons.reduce((sum, d) => sum + (d.montant || 0), 0);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Détails de ${membre.nom}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
            .subtitle { font-size: 14px; color: #666; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .info-item { background: #f8fafc; padding: 10px; border-radius: 5px; }
            .info-label { font-weight: bold; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #2563eb; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .amount-positive { color: #16a34a; font-weight: bold; }
            .amount-negative { color: #dc2626; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">Famille Tiwa Joseph - Détails de ${membre.nom}</div>
            <div class="subtitle">Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
        </div>
        
        <div class="section">
            <div class="section-title">Informations Personnelles</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Nom:</div>
                    <div>${membre.nom}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Email:</div>
                    <div>${membre.email}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Téléphone:</div>
                    <div>${membre.telephone}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Solde Épargne:</div>
                    <div>${(membre.soldeEpargne || 0).toLocaleString('fr-FR')} FCFA</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Caution:</div>
                    <div>${(membre.caution || 0).toLocaleString('fr-FR')} FCFA</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Date d'adhésion:</div>
                    <div>${membre.dateAdhesion ? new Date(membre.dateAdhesion).toLocaleDateString('fr-FR') : '-'}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Résumé Financier</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Total Mouvements:</div>
                    <div>${totalMouvements.toLocaleString('fr-FR')} FCFA</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Total Crédits Accordés:</div>
                    <div>${totalCredits.toLocaleString('fr-FR')} FCFA</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Total Dons:</div>
                    <div>${totalDons.toLocaleString('fr-FR')} FCFA</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Nombre de Crédits:</div>
                    <div>${credits.length}</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Historique des Mouvements (${mouvements.length})</div>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Montant (FCFA)</th>
                        <th>Motif</th>
                        <th>Session</th>
                    </tr>
                </thead>
                <tbody>
                    ${mouvements.slice(0, 50).map(m => `
                        <tr>
                            <td>${new Date(m.date).toLocaleDateString('fr-FR')}</td>
                            <td>${m.type}</td>
                            <td class="${m.montant >= 0 ? 'amount-positive' : 'amount-negative'}">
                                ${m.montant.toLocaleString('fr-FR')}
                            </td>
                            <td>${m.motif || '-'}</td>
                            <td>${m.sessionNom || `Session ${m.sessionNumero || '-'}`}</td>
                        </tr>
                    `).join('')}
                    ${mouvements.length > 50 ? '<tr><td colspan="5" style="text-align:center; font-style:italic;">... et ' + (mouvements.length - 50) + ' autres mouvements</td></tr>' : ''}
                </tbody>
            </table>
        </div>

        ${credits.length > 0 ? `
        <div class="section">
            <div class="section-title">Historique des Crédits (${credits.length})</div>
            <table>
                <thead>
                    <tr>
                        <th>Date Accord</th>
                        <th>Montant Initial</th>
                        <th>À Rembourser</th>
                        <th>Reste</th>
                        <th>Statut</th>
                        <th>Pénalité Due</th>
                    </tr>
                </thead>
                <tbody>
                    ${credits.map(c => `
                        <tr>
                            <td>${new Date(c.date_accord).toLocaleDateString('fr-FR')}</td>
                            <td>${(c.montant_initial || 0).toLocaleString('fr-FR')}</td>
                            <td>${(c.montant_a_rembourser || 0).toLocaleString('fr-FR')}</td>
                            <td>${(c.reste || 0).toLocaleString('fr-FR')}</td>
                            <td>${c.statut}</td>
                            <td>${(c.penalite_due || 0).toLocaleString('fr-FR')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <div class="footer">
            Document généré automatiquement par Famille Tiwa Joseph
        </div>
    </body>
    </html>
  `;
}

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
  } catch (err: any) {
    console.error("Erreur login :", err);
    return { success: false, message: "Erreur serveur" };
  }
});

// IPC handlers pour les membres
ipcMain.handle("ajouter-membre", (_event, membre) => {
  try {
    // Vérifier qu'une session est active
    const sessionActive = verifierSessionActive();

    const stmt = db.prepare(`
      INSERT INTO membres (nom, telephone, profession, ville, dateAdhesion, caution)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      membre.nom,
      membre.telephone,
      membre.profession,
      membre.ville,
      membre.dateAdhesion,
      membre.caution || 30000
    );

    const nouveauMembreId = info.lastInsertRowid as number;

    // Ajouter le nouveau membre à la session active
    db.prepare(`
      INSERT INTO session_membres (sessionId, membreId, epargneSession, interetsSession, partSession)
      VALUES (?, ?, 0, 0, 0)
    `).run(sessionActive.id, nouveauMembreId);

    return { success: true, id: nouveauMembreId };
  } catch (err: any) {
    console.error("Erreur ajouter-membre:", err);
    return { success: false, message: err?.message || "Erreur lors de l'ajout du membre" };
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
  } catch (err: any) {
    console.error("Erreur get-historique-membre:", err);
    throw err;
  }
});

// Handler pour diagnostiquer un membre (debug)
ipcMain.handle("diagnostiquer-membre", (_event, membreId) => {
  try {
    console.log(`🔍 Diagnostic du membre ${membreId}...`);

    // Vérifier si le membre existe
    const membre = db
      .prepare("SELECT * FROM membres WHERE id = ?")
      .get(membreId);
    if (!membre) {
      return { success: false, message: "Membre non trouvé" };
    }

    // Récupérer toutes les données liées
    const mouvements = db
      .prepare("SELECT * FROM mouvements WHERE membreId = ?")
      .all(membreId);
    const credits = db
      .prepare("SELECT * FROM credits WHERE id_membre = ?")
      .all(membreId);
    const remboursements = db
      .prepare(
        `
        SELECT r.* FROM remboursements r 
        JOIN credits c ON r.id_credit = c.id 
        WHERE c.id_membre = ?
      `
      )
      .all(membreId);
    const dons = db
      .prepare("SELECT * FROM dons WHERE membreId = ?")
      .all(membreId);

    console.log(`📊 Diagnostic pour ${membre.nom} (ID: ${membreId}):`);
    console.log(`  - Mouvements: ${mouvements.length}`);
    console.log(`  - Crédits: ${credits.length}`);
    console.log(`  - Remboursements: ${remboursements.length}`);
    console.log(`  - Dons: ${dons.length}`);

    return {
      success: true,
      membre,
      mouvements,
      credits,
      remboursements,
      dons,
      counts: {
        mouvements: mouvements.length,
        credits: credits.length,
        remboursements: remboursements.length,
        dons: dons.length,
      },
    };
  } catch (err) {
    console.error("Erreur diagnostic membre:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erreur diagnostic",
    };
  }
});

// Handler pour récupérer les détails d'un membre
ipcMain.handle("get-details-membre", (_event, membreId) => {
  try {
    // Synchroniser d'abord les soldes d'épargne
    synchroniserSoldesEpargne();

    // Informations du membre
    const membre = db
      .prepare("SELECT * FROM membres WHERE id = ?")
      .get(membreId);

    // Solde épargne courant stocké côté membre (inclut les ajustements et cassation)
    const soldeEpargne = membre.soldeEpargne || 0;

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

    // Crédit actuel (montant à rembourser) - inclut les crédits actifs et en retard
    const creditActuel = db
      .prepare(
        `
      SELECT COALESCE(SUM(reste), 0) as total 
      FROM credits 
      WHERE id_membre = ? AND statut IN ('actif', 'en_retard')
    `
      )
      .get(membreId).total;

    // Montant initial du crédit actuel - inclut les crédits actifs et en retard
    const creditInitial = db
      .prepare(
        `
      SELECT COALESCE(SUM(montant_initial), 0) as total 
      FROM credits 
      WHERE id_membre = ? AND statut IN ('actif', 'en_retard')
    `
      )
      .get(membreId).total;

    // Détails des crédits (pour affichage détaillé)
    const creditsDetails = db
      .prepare(
        `
      SELECT id, montant_initial, reste, penalite_due, statut, date_accord, date_heure_echeance
      FROM credits 
      WHERE id_membre = ? AND statut IN ('actif', 'en_retard')
      ORDER BY date_accord DESC
    `
      )
      .all(membreId);

    // Total des pénalités dues
    const totalPenalites = db
      .prepare(
        `
      SELECT COALESCE(SUM(penalite_due), 0) as total 
      FROM credits 
      WHERE id_membre = ? AND statut IN ('actif', 'en_retard')
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

    // Total des montants de cassation perçus
    const cassationTotal = db
      .prepare(
        `SELECT COALESCE(SUM(montant), 0) as total FROM mouvements WHERE membreId = ? AND type = 'cassation'`
      )
      .get(membreId).total;

    // Calculer l'ancien solde personnel (avant cassation)
    // NOUVELLE LOGIQUE: Si pas de cassation (pas d'intérêts), l'ancien solde = solde actuel - crédits
    // Si cassation effectuée (avec intérêts), l'ancien solde = solde actuel - part de cassation - crédits
    const ancienSoldePersonnel = cassationTotal > 0 
      ? Math.max(0, soldeEpargne - cassationTotal - creditActuel)  // Avec intérêts distribués
      : Math.max(0, soldeEpargne - creditActuel);                   // Sans intérêts, épargne conservée

    return {
      membre,
      soldeEpargne,
      totalCotisations,
      totalDepenses,
      creditActuel,
      creditInitial,
      totalPenalites,
      creditsDetails,
      nbMouvements,
      cassationTotal,
      ancienSoldePersonnel, // Nouveau champ pour l'ancien solde
    };
  } catch (err) {
    console.error("Erreur get-details-membre:", err);
    throw err;
  }
});

ipcMain.handle("get-membres", () => {
  try {
    // Synchroniser d'abord les soldes d'épargne
    synchroniserSoldesEpargne();

    const stmt = db.prepare(`
      SELECT m.*, 
             m.soldeEpargne,
             COALESCE(SUM(CASE WHEN mv.type IN ('cotisation_annuelle', 'versement_ponctuel') THEN mv.montant ELSE 0 END), 0) as totalCotisations,
             COALESCE(SUM(CASE WHEN c.statut IN ('actif', 'en_retard') THEN c.reste ELSE 0 END), 0) as creditActuel,
             COALESCE(SUM(CASE WHEN mv.type = 'cassation' THEN mv.montant ELSE 0 END), 0) as cassationTotal
      FROM membres m
      LEFT JOIN mouvements mv ON m.id = mv.membreId
      LEFT JOIN credits c ON m.id = c.id_membre
      GROUP BY m.id
      ORDER BY m.nom ASC
    `);
    
    const membres = stmt.all();
    
    // Calculer le solde personnel pour chaque membre
    const membresAvecSoldePersonnel = membres.map((membre: any) => {
      const soldeEpargne = membre.soldeEpargne || 0;
      const cassationTotal = membre.cassationTotal || 0;
      const creditActuel = membre.creditActuel || 0;
      
      // NOUVELLE LOGIQUE: Calcul correct selon la présence ou non d'intérêts distribués
      let ancienSoldePersonnel, nouveauSoldePersonnel, soldePersonnel;
      
      if (cassationTotal > 0) {
        // CAS 1: Cassation effectuée (avec intérêts distribués)
        // L'ancien solde = solde actuel - part d'intérêts reçue - crédits
        ancienSoldePersonnel = Math.max(0, soldeEpargne - cassationTotal - creditActuel);
        // Le nouveau solde = ancien solde + part d'intérêts reçue
        nouveauSoldePersonnel = Math.max(0, ancienSoldePersonnel + cassationTotal);
        // Le solde personnel = nouveau solde
        soldePersonnel = nouveauSoldePersonnel;
      } else {
        // CAS 2: Pas de cassation (pas d'intérêts)
        // L'ancien solde = solde actuel - crédits (épargne conservée)
        ancienSoldePersonnel = Math.max(0, soldeEpargne - creditActuel);
        // Le nouveau solde = ancien solde (pas de changement)
        nouveauSoldePersonnel = ancienSoldePersonnel;
        // Le solde personnel = solde épargne net
        soldePersonnel = Math.max(0, soldeEpargne - creditActuel);
      }
      
      return {
        ...membre,
        ancienSoldePersonnel,
        nouveauSoldePersonnel,
        soldePersonnel
      };
    });
    
    return membresAvecSoldePersonnel;
  } catch (err) {
    console.error("Erreur get-membres:", err);
    throw err;
  }
});

ipcMain.handle("modifier-membre", (_event, id, membre) => {
  try {
    // Vérifier qu'une session est active
    const sessionActive = verifierSessionActive();

    const stmt = db.prepare(`
      UPDATE membres 
      SET nom = ?, telephone = ?, profession = ?, ville = ?, dateAdhesion = ?, caution = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      membre.nom,
      membre.telephone,
      membre.profession,
      membre.ville,
      membre.dateAdhesion,
      membre.caution || 30000,
      id
    );

    return { success: info.changes > 0 };
  } catch (err: any) {
    console.error("Erreur modifier-membre:", err);
    return { success: false, message: err?.message || "Erreur lors de la modification du membre" };
  }
});

ipcMain.handle("supprimer-membre", (_event, id) => {
  try {
    // Vérifier si le membre a des crédits actifs
    const creditsActifs = db.prepare("SELECT COUNT(*) as count FROM credits WHERE id_membre = ? AND statut IN ('actif', 'en_retard')").get(id);
    if (creditsActifs.count > 0) {
      return { success: false, message: "Impossible de supprimer un membre avec des crédits actifs" };
    }

    // Suppression robuste en transaction (compatibilité anciens schémas sans CASCADE)
    const supprimerMembreTx = db.transaction((memberId: number) => {
      // Supprimer remboursements liés aux crédits du membre
      db.prepare(`DELETE FROM remboursements WHERE id_credit IN (SELECT id FROM credits WHERE id_membre = ?)`)
        .run(memberId);

      // Supprimer crédits du membre
      db.prepare(`DELETE FROM credits WHERE id_membre = ?`).run(memberId);

      // Supprimer mouvements du membre
      db.prepare(`DELETE FROM mouvements WHERE membreId = ?`).run(memberId);

      // Supprimer participations de session du membre
      try {
        db.prepare(`DELETE FROM session_membres WHERE membreId = ?`).run(memberId);
      } catch {}

      // Supprimer dons du membre (même si fictifs)
      try {
        db.prepare(`DELETE FROM dons WHERE membreId = ?`).run(memberId);
      } catch {}

      // Supprimer le membre
      const info = db.prepare("DELETE FROM membres WHERE id = ?").run(memberId);
      return info.changes > 0;
    });

    const ok = supprimerMembreTx(id);
    return { success: ok };
  } catch (err: any) {
    console.error("Erreur supprimer-membre:", err);
    return { success: false, message: err?.message || "Erreur lors de la suppression du membre" };
  }
});

// IPC handlers pour les mouvements
ipcMain.handle("get-mouvements", (_event, filters = {}) => {
  try {
    const { year, sessionId } = filters as { year?: string; sessionId?: number };

    let sql = `
      SELECT m.id, m.membreId, mem.nom as membreNom, m.type, m.montant, m.motif, m.date, m.updatedAt, m.sessionId
      FROM mouvements m
      JOIN membres mem ON m.membreId = mem.id
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (year && year !== "all") {
      whereClauses.push(`strftime('%Y', m.date) = ?`);
      params.push(year);
    }

    if (sessionId && Number(sessionId) > 0) {
      whereClauses.push(`m.sessionId = ?`);
      params.push(Number(sessionId));
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ` + whereClauses.join(" AND ");
    }

    sql += ` ORDER BY m.date DESC`;

    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (err) {
    console.error("Erreur get-mouvements:", err);
    throw err;
  }
});

// Fonction utilitaire pour vérifier si une session est active
function verifierSessionActive() {
  const sessionActive = db.prepare(`
    SELECT * FROM sessions 
    WHERE statut = 'active' 
    ORDER BY numero DESC 
    LIMIT 1
  `).get();
  
  if (!sessionActive) {
    console.log("⚠️ Aucune session active trouvée, création automatique d'une session...");
    // Créer automatiquement une session active
    const nouvelleSession = db.prepare(`
      INSERT INTO sessions (numero, dateDebut, statut, fondsDisponible)
      VALUES (?, ?, 'active', 0)
    `).run(
      new Date().getFullYear().toString(),
      new Date().toISOString()
    );
    
    const sessionCreee = db.prepare(`
      SELECT * FROM sessions WHERE id = ?
    `).get(nouvelleSession.lastInsertRowid);
    
    console.log("✅ Nouvelle session créée automatiquement:", sessionCreee);
    return sessionCreee;
  }
  
  return sessionActive;
}

// Handler pour ajouter un mouvement (avec vérification de session active)
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

    // Vérifier qu'une session est active
    const sessionActive = verifierSessionActive();

    const stmt = db.prepare(`
      INSERT INTO mouvements (membreId, type, montant, motif, date, sessionId)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      mouvement.membreId,
      mouvement.type,
      mouvement.montant,
      mouvement.motif || null,
      new Date().toISOString(),
      sessionActive.id
    );

    // Mettre à jour le soldeEpargne dans la table membres si c'est un mouvement de type 'epargne'
    if (mouvement.type === "epargne") {
      const updateSolde = db.prepare(`
        UPDATE membres 
        SET soldeEpargne = soldeEpargne + ? 
        WHERE id = ?
      `);
      updateSolde.run(mouvement.montant, mouvement.membreId);

      // Enregistrer l'épargne dans la session active
      const res = db.prepare(
        `UPDATE session_membres SET epargneSession = epargneSession + ? WHERE sessionId = ? AND membreId = ?`
      ).run(mouvement.montant, sessionActive.id, mouvement.membreId);
      if (res.changes === 0) {
        // Si le membre n'était pas encore présent dans la session, l'insérer
        db.prepare(
          `INSERT OR IGNORE INTO session_membres (sessionId, membreId, epargneSession, interetsSession, partSession)
           VALUES (?, ?, ?, 0, 0)`
        ).run(sessionActive.id, mouvement.membreId, mouvement.montant);
      }
    }

    return { success: true, id: info.lastInsertRowid };
  } catch (err) {
    console.error("Erreur ajouter-mouvement:", err);
    throw err;
  }
});

ipcMain.handle("modifier-mouvement", (_event, id, mouvement) => {
  try {
    let { montant, motif } = mouvement;

    // Vérifier qu'une session est active
    const sessionActive = verifierSessionActive();

    // Récupérer l'ancien mouvement pour calculer la différence
    const oldMouvement = db
      .prepare("SELECT * FROM mouvements WHERE id = ?")
      .get(id);

    // Forcer le montant à être négatif pour un crédit
    if (oldMouvement && oldMouvement.type === "credit") {
      montant = -Math.abs(montant);
    }

    const stmt = db.prepare(`
      UPDATE mouvements 
      SET montant = ?, motif = ?, updatedAt = CURRENT_TIMESTAMP
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

      // Répercuter la différence sur la session active
      const res = db.prepare(
        `UPDATE session_membres SET epargneSession = epargneSession + ? WHERE sessionId = ? AND membreId = ?`
      ).run(difference, sessionActive.id, oldMouvement.membreId);
      if (res.changes === 0 && difference !== 0) {
        db.prepare(
          `INSERT OR IGNORE INTO session_membres (sessionId, membreId, epargneSession, interetsSession, partSession)
           VALUES (?, ?, ?, 0, 0)`
        ).run(sessionActive.id, oldMouvement.membreId, difference);
      }
    }

    return { success: true };
  } catch (err) {
    console.error("Erreur modifier-mouvement:", err);
    throw err;
  }
});

ipcMain.handle("supprimer-mouvement", (_event, id) => {
  try {
    // Vérifier qu'une session est active
    const sessionActive = verifierSessionActive();

    // Récupérer le mouvement avant de le supprimer
    const mouvement = db
      .prepare("SELECT * FROM mouvements WHERE id = ?")
      .get(id);

    if (!mouvement) {
      throw new Error("Mouvement introuvable");
    }

    let fondsDiff = 0;
    let fondsType = null;

    // Si c'est un crédit, supprimer le crédit actif du membre et tous ses remboursements
    if (mouvement.type === "credit") {
      const credit = db
        .prepare(
          "SELECT * FROM credits WHERE id_membre = ? AND statut = 'actif' ORDER BY date_accord DESC LIMIT 1"
        )
        .get(mouvement.membreId);
      if (credit) {
        // Supprimer les remboursements associés dans la table remboursements
        db.prepare("DELETE FROM remboursements WHERE id_credit = ?").run(
          credit.id
        );
        // Supprimer tous les mouvements de type 'remboursement' pour ce membre qui sont postérieurs à la date du crédit
        db.prepare(
          "DELETE FROM mouvements WHERE membreId = ? AND type = 'remboursement' AND date >= ?"
        ).run(credit.id_membre, credit.date_accord);
        // Supprimer le crédit
        db.prepare("DELETE FROM credits WHERE id = ?").run(credit.id);
        // Notifier l'UI que le crédit a été supprimé
        if (mainWindow) {
          mainWindow.webContents.send("credit-deleted", credit.id);
        }
        fondsDiff = -mouvement.montant; // Sortie annulée, donc entrée dans le fonds
        fondsType = "credit";
      }
    }

    // Si c'est un remboursement, réajuster le reste du crédit actif
    if (mouvement.type === "remboursement") {
      const credit = db
        .prepare(
          "SELECT * FROM credits WHERE id_membre = ? AND statut IN ('actif', 'remboursé') ORDER BY date_accord DESC LIMIT 1"
        )
        .get(mouvement.membreId);
      if (credit) {
        let nouveauReste = credit.reste + mouvement.montant; // Remettre le montant remboursé
        let nouveauStatut = nouveauReste <= 0 ? "remboursé" : "actif";
        if (nouveauReste < 0) nouveauReste = 0;
        db.prepare(`UPDATE credits SET reste = ?, statut = ? WHERE id = ?`).run(
          nouveauReste,
          nouveauStatut,
          credit.id
        );
        fondsDiff = -mouvement.montant; // Sortie de fonds (remboursement annulé)
        fondsType = "remboursement";
      }
    }

    // Supprimer le mouvement
    const result = db.prepare("DELETE FROM mouvements WHERE id = ?").run(id);

    // Notifier l'UI que le fonds a été mis à jour
    if (fondsDiff !== 0 && mainWindow) {
      mainWindow.webContents.send("fonds-updated", {
        montant: fondsDiff,
        type: fondsType,
      });
    }

    return { success: result.changes > 0 };
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
  async (_event, { description, montant, categorie, typeContribution }) => {
    try {
      // Vérifier qu'une session est active
      const sessionActive = verifierSessionActive();

      const transaction = db.transaction(() => {
        // 1. Insérer la dépense commune
        const depenseStmt = db.prepare(`
          INSERT INTO depenses_communes (description, montant, categorie, typeContribution, date)
          VALUES (?, ?, ?, ?, ?)
        `);
        const depenseInfo = depenseStmt.run(
          description,
          montant,
          categorie,
          typeContribution,
          new Date().toISOString()
        );

        // 2. Si c'est un prélèvement sur épargne, créer les mouvements pour chaque membre
        if (typeContribution === "prelevement_epargne") {
          const membres = db.prepare("SELECT id FROM membres").all();
          const partParMembre = montant / membres.length;

          for (const membre of membres) {
            // Créer un mouvement de dépense pour chaque membre
            db.prepare(`
              INSERT INTO mouvements (membreId, type, montant, motif, date, sessionId)
              VALUES (?, 'depense_commune_epargne', ?, ?, ?, ?)
            `).run(
              membre.id,
              -partParMembre,
              `Dépense commune: ${description} - Part: ${partParMembre.toLocaleString()} FCFA`,
              new Date().toISOString(),
              sessionActive.id
            );

            // Mettre à jour le solde épargne du membre
            db.prepare(`
            UPDATE membres 
              SET soldeEpargne = soldeEpargne - ? 
            WHERE id = ?
            `).run(partParMembre, membre.id);

            // Mettre à jour l'épargne dans la session
            db.prepare(`
              UPDATE session_membres 
              SET epargneSession = epargneSession - ? 
              WHERE sessionId = ? AND membreId = ?
            `).run(partParMembre, sessionActive.id, membre.id);
          }
        } else if (typeContribution === "contribution_individuelle") {
          // Répartir la dépense en mouvements qui réduisent le solde du fonds
          const membres = db.prepare("SELECT id FROM membres").all();
          const partParMembre = montant / Math.max(1, membres.length);

          for (const membre of membres) {
            db.prepare(`
              INSERT INTO mouvements (membreId, type, montant, motif, date, sessionId)
              VALUES (?, 'depense_contribution', ?, ?, ?, ?)
            `).run(
              membre.id,
              -partParMembre,
              `Dépense commune (contribution): ${description} - Part: ${partParMembre.toLocaleString()} FCFA`,
              new Date().toISOString(),
              sessionActive.id
            );
          }
        }

        return { success: true, id: depenseInfo.lastInsertRowid };
      });

      return transaction();
    } catch (err: any) {
      console.error("Erreur ajouter-depense-commune:", err);
      return { success: false, message: err?.message || "Erreur lors de l'ajout de la dépense commune" };
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
  try {
    // Vérifier qu'une session est active
    const sessionActive = verifierSessionActive();

    // Récupérer les informations de la dépense avant suppression
    const depense = db
      .prepare("SELECT * FROM depenses_communes WHERE id = ?")
      .get(id);
    if (!depense) {
      return { success: false, message: "Dépense non trouvée" };
    }

    const transaction = db.transaction(() => {
      // Supprimer la dépense commune
      db.prepare("DELETE FROM depenses_communes WHERE id = ?").run(id);

      // Supprimer les mouvements associés selon le type de contribution
      if (depense.typeContribution === "prelevement_epargne") {
        // Supprimer les mouvements de type "depense_commune_epargne" liés à cette dépense
        db
          .prepare(
            "DELETE FROM mouvements WHERE type = 'depense_commune_epargne' AND motif LIKE ?"
          )
          .run(`%${depense.description}%`);

        // Remettre à jour les soldes d'épargne (annuler le prélèvement)
        const membres = db.prepare("SELECT id FROM membres").all();
        const part = depense.montant / membres.length;
        membres.forEach(({ id: membreId }: { id: number }) => {
          db.prepare(
            "UPDATE membres SET soldeEpargne = soldeEpargne + ? WHERE id = ?"
          ).run(part, membreId);

          db.prepare(
            `UPDATE session_membres SET epargneSession = epargneSession + ? WHERE sessionId = ? AND membreId = ?`
          ).run(part, sessionActive.id, membreId);
        });
      } else if (depense.typeContribution === "contribution_individuelle") {
        // Supprimer les mouvements de type "depense_contribution" liés à cette dépense
        db
          .prepare(
            "DELETE FROM mouvements WHERE type = 'depense_contribution' AND motif LIKE ?"
          )
          .run(`%${depense.description}%`);
      }

      return { success: true };
    });

    return transaction();
  } catch (error) {
    console.error("Erreur supprimer-depense-commune:", error);
    return { success: false, message: "Erreur lors de la suppression de la dépense commune" };
  }
});

// Handler pour récupérer le solde du fonds
ipcMain.handle("get-solde-fonds", () => {
  try {
    // Vérifier s'il y a eu une cassation récente (marqueur de nouveau cycle)
    const dernierReset = db.prepare(`
      SELECT date FROM mouvements 
      WHERE type = 'cassation' AND motif LIKE 'RESET_CYCLE%'
      ORDER BY date DESC 
      LIMIT 1
    `).get();

    let dateDebutCycle = null;
    if (dernierReset) {
      dateDebutCycle = dernierReset.date;
    }

    // Construire la clause WHERE pour ne considérer que les mouvements après le dernier reset
    const whereClause = dateDebutCycle 
      ? `WHERE date > ? AND (motif IS NULL OR motif NOT LIKE 'Don à %')`
      : `WHERE (motif IS NULL OR motif NOT LIKE 'Don à %')`;

    // 1) Épargnes versées nettes = épargne brute - dépenses communes prélevées - cassation distribuée
    const totalEpargnesNettes = dateDebutCycle
      ? db.prepare(
          `SELECT COALESCE(SUM(
             CASE 
               WHEN type IN ('epargne','depense_epargne','depense_commune_epargne','cassation') THEN montant
               ELSE 0
             END
           ), 0) as total
           FROM mouvements
           WHERE date > ?`
        ).get(dateDebutCycle).total || 0
      : db.prepare(
          `SELECT COALESCE(SUM(
             CASE 
               WHEN type IN ('epargne','depense_epargne','depense_commune_epargne','cassation') THEN montant
               ELSE 0
             END
           ), 0) as total
           FROM mouvements`
        ).get().total || 0;

    // 2) Calcul du solde disponible - Approche simplifiée via mouvements uniquement
    // Source de vérité unique : table mouvements
    const solde = dateDebutCycle
      ? db.prepare(`
          SELECT COALESCE(SUM(
            CASE 
              -- Entrées de caisse (montants positifs)
              WHEN type IN ('epargne', 'versement_ponctuel', 'restitution_caution', 'restitution_solde', 'remboursement') THEN montant
              -- Sorties de caisse (montants négatifs) 
              WHEN type IN ('credit', 'depense_epargne', 'depense_contribution', 'depense_commune_epargne', 'depense_commune_fonds', 'cassation') THEN montant
              ELSE 0
            END
          ), 0) as total
          FROM mouvements
          WHERE date > ? AND (motif IS NULL OR motif NOT LIKE 'Don à %')
        `).get(dateDebutCycle).total || 0
      : db.prepare(`
          SELECT COALESCE(SUM(
            CASE 
              -- Entrées de caisse (montants positifs)
              WHEN type IN ('epargne', 'versement_ponctuel', 'restitution_caution', 'restitution_solde', 'remboursement') THEN montant
              -- Sorties de caisse (montants négatifs) 
              WHEN type IN ('credit', 'depense_epargne', 'depense_contribution', 'depense_commune_epargne', 'depense_commune_fonds', 'cassation') THEN montant
              ELSE 0
            END
          ), 0) as total
          FROM mouvements
          WHERE (motif IS NULL OR motif NOT LIKE 'Don à %')
        `).get().total || 0;

    // Informations pour compatibilité (optionnelles)
    const totalEpargnesInitiales = dateDebutCycle
      ? db.prepare(`
          SELECT COALESCE(SUM(montant), 0) as total 
          FROM mouvements 
          WHERE type IN ('epargne', 'versement_ponctuel', 'restitution_caution', 'restitution_solde')
            AND date > ? AND (motif IS NULL OR motif NOT LIKE 'Don à %')
        `).get(dateDebutCycle).total || 0
      : db.prepare(`
          SELECT COALESCE(SUM(montant), 0) as total 
          FROM mouvements 
          WHERE type IN ('epargne', 'versement_ponctuel', 'restitution_caution', 'restitution_solde')
            AND (motif IS NULL OR motif NOT LIKE 'Don à %')
        `).get().total || 0;

    const totalCreditsAccordes = dateDebutCycle
      ? db.prepare(`
          SELECT COALESCE(SUM(ABS(montant)), 0) as total 
          FROM mouvements WHERE type = 'credit' AND date > ?
        `).get(dateDebutCycle).total || 0
      : db.prepare(`
          SELECT COALESCE(SUM(ABS(montant)), 0) as total 
          FROM mouvements WHERE type = 'credit'
        `).get().total || 0;

    const totalRemboursements = dateDebutCycle
      ? db.prepare(`
          SELECT COALESCE(SUM(montant), 0) as total 
          FROM mouvements WHERE type = 'remboursement' AND date > ?
        `).get(dateDebutCycle).total || 0
      : db.prepare(`
          SELECT COALESCE(SUM(montant), 0) as total 
          FROM mouvements WHERE type = 'remboursement'
        `).get().total || 0;

    // 3) Calcul du solde fictif selon la logique demandée
    // Règle utilisateur: solde fictif = montant théorique si tout le monde était en règle
    // Il est statique et ne change pas avec les remboursements partiels
    
    // Base de calcul : solde initial sans effet des crédits
    const soldeInitialSansCredits = dateDebutCycle
      ? db.prepare(`
          SELECT COALESCE(SUM(
            CASE 
              -- Entrées de caisse (montants positifs)
              WHEN type IN ('epargne', 'versement_ponctuel', 'restitution_caution', 'restitution_solde') THEN montant
              -- Sorties de caisse SAUF crédits et remboursements
              WHEN type IN ('depense_epargne', 'depense_contribution', 'depense_commune_epargne', 'depense_commune_fonds', 'cassation') THEN montant
              ELSE 0
            END
          ), 0) as total
          FROM mouvements
          WHERE date > ? AND (motif IS NULL OR motif NOT LIKE 'Don à %')
        `).get(dateDebutCycle).total || 0
      : db.prepare(`
          SELECT COALESCE(SUM(
            CASE 
              -- Entrées de caisse (montants positifs)
              WHEN type IN ('epargne', 'versement_ponctuel', 'restitution_caution', 'restitution_solde') THEN montant
              -- Sorties de caisse SAUF crédits et remboursements
              WHEN type IN ('depense_epargne', 'depense_contribution', 'depense_commune_epargne', 'depense_commune_fonds', 'cassation') THEN montant
              ELSE 0
            END
          ), 0) as total
          FROM mouvements
          WHERE (motif IS NULL OR motif NOT LIKE 'Don à %')
        `).get().total || 0;
    
    // Somme des intérêts + pénalités de TOUS les crédits = gain théorique total
    // Inclut les intérêts contractuels (20%) + pénalités payées ET celles encore dues
    // Si nouveau cycle, ne considérer que les crédits créés après la cassation
    const totalInteretsEtPenalitesTousCredits = dateDebutCycle
      ? db.prepare(`
          SELECT COALESCE(SUM(
            (c.montant_a_rembourser - c.montant_initial) + 
            COALESCE(c.penalite_due, 0) + 
            COALESCE(r.penalites_payees, 0)
          ), 0) as total 
          FROM credits c
          LEFT JOIN (
            SELECT 
              id_credit, 
              SUM(CASE WHEN type = 'penalite' THEN montant ELSE 0 END) as penalites_payees
            FROM remboursements 
            WHERE date > ?
            GROUP BY id_credit
          ) r ON r.id_credit = c.id
          WHERE c.date_accord > ?
        `).get(dateDebutCycle, dateDebutCycle).total || 0
      : db.prepare(`
          SELECT COALESCE(SUM(
            (c.montant_a_rembourser - c.montant_initial) + 
            COALESCE(c.penalite_due, 0) + 
            COALESCE(r.penalites_payees, 0)
          ), 0) as total 
          FROM credits c
          LEFT JOIN (
            SELECT 
              id_credit, 
              SUM(CASE WHEN type = 'penalite' THEN montant ELSE 0 END) as penalites_payees
            FROM remboursements 
            GROUP BY id_credit
          ) r ON r.id_credit = c.id
        `).get().total || 0;

    // Solde fictif = solde initial + tous les intérêts + pénalités théoriques
    const soldeFictif = soldeInitialSansCredits + totalInteretsEtPenalitesTousCredits;

    // 4) Informations supplémentaires (pour compatibilité)
    // Intérêts générés (progressifs) =
    //  - intérêts contractuels reconnus au prorata des remboursements du "principal" (montant_a_rembourser)
    //  - + pénalités réellement payées (type = 'penalite')
    // Si nouveau cycle, ne considérer que les crédits et remboursements après la cassation
    const creditsPourInterets = dateDebutCycle
      ? db.prepare(`
          SELECT 
            c.id,
            c.montant_initial,
            c.montant_a_rembourser,
            COALESCE(rp.total_p, 0) AS remb_principal,
            COALESCE(rpen.total_pen, 0) AS remb_penalite
          FROM credits c
          LEFT JOIN (
            SELECT id_credit, SUM(montant) AS total_p
            FROM remboursements
            WHERE type = 'principal' AND date > ?
            GROUP BY id_credit
          ) rp ON rp.id_credit = c.id
          LEFT JOIN (
            SELECT id_credit, SUM(montant) AS total_pen
            FROM remboursements
            WHERE type = 'penalite' AND date > ?
            GROUP BY id_credit
          ) rpen ON rpen.id_credit = c.id
          WHERE c.date_accord > ?
        `).all(dateDebutCycle, dateDebutCycle, dateDebutCycle)
      : db.prepare(`
          SELECT 
            c.id,
            c.montant_initial,
            c.montant_a_rembourser,
            COALESCE(rp.total_p, 0) AS remb_principal,
            COALESCE(rpen.total_pen, 0) AS remb_penalite
          FROM credits c
          LEFT JOIN (
            SELECT id_credit, SUM(montant) AS total_p
            FROM remboursements
            WHERE type = 'principal'
            GROUP BY id_credit
          ) rp ON rp.id_credit = c.id
          LEFT JOIN (
            SELECT id_credit, SUM(montant) AS total_pen
            FROM remboursements
            WHERE type = 'penalite'
            GROUP BY id_credit
          ) rpen ON rpen.id_credit = c.id
        `).all();

    let totalInterets = 0;
    for (const c of creditsPourInterets) {
      const interetContractuelTotal = Math.max(0, (c.montant_a_rembourser || 0) - (c.montant_initial || 0));
      const totalRemboursePrincipal = Math.max(0, c.remb_principal || 0);
      const ratioRemboursement = (c.montant_a_rembourser && c.montant_a_rembourser > 0)
        ? Math.min(1, totalRemboursePrincipal / c.montant_a_rembourser)
        : 0;
      const interetReconnu = interetContractuelTotal * ratioRemboursement;
      const penalitesPayees = Math.max(0, c.remb_penalite || 0);
      totalInterets += interetReconnu + penalitesPayees;
    }

    const totalDepensesCommunes = db.prepare(`
      SELECT COALESCE(SUM(montant), 0) as total FROM depenses_communes
    `).get().total || 0;

    const totalCassationDistribuee = dateDebutCycle
      ? db.prepare(`
          SELECT COALESCE(SUM(montant), 0) as total FROM mouvements WHERE type = 'cassation' AND date > ?
        `).get(dateDebutCycle).total || 0
      : db.prepare(`
          SELECT COALESCE(SUM(montant), 0) as total FROM mouvements WHERE type = 'cassation'
        `).get().total || 0;

    // 5) Calculer le total des crédits restants (actifs/en_retard) = principal à rembourser + pénalités dues
    // Si nouveau cycle, ne considérer que les crédits créés après la cassation
    const totalCreditsRestants = dateDebutCycle
      ? db.prepare(`
          SELECT COALESCE(SUM((montant_a_rembourser) + COALESCE(penalite_due, 0)), 0) as total
          FROM credits WHERE statut IN ('actif', 'en_retard') AND date_accord > ?
        `).get(dateDebutCycle).total || 0
      : db.prepare(`
          SELECT COALESCE(SUM((montant_a_rembourser) + COALESCE(penalite_due, 0)), 0) as total
          FROM credits WHERE statut IN ('actif', 'en_retard')
        `).get().total || 0;

    return {
      solde,
      soldeFictif,
      totalEpargnesNettes: totalEpargnesInitiales,
      totalCreditsAccordes,
      totalCreditsRestants,
      totalRemboursements,
      totalInterets,
      totalDepensesCommunes,
      totalCassationDistribuee,
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
          WHERE membreId = ? AND type = 'epargne'
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
    // Mettre à jour le statut en retard et la pénalité due à la volée
    const credits = db
      .prepare(
        `
      SELECT * FROM credits
    `
      )
      .all();
    const now = new Date();
    const updateStatutStmt = db.prepare(
      `UPDATE credits SET statut = ? WHERE id = ?`
    );
    const setPenaltyOnceStmt = db.prepare(
      `UPDATE credits SET penalite_due = ?, statut = 'en_retard' WHERE id = ?`
    );
    const inGrace = (dateStr: string, timeStr: string) => {
      try {
        const d = new Date(`${dateStr}T${timeStr}`);
        return now > d;
      } catch {
        return false;
      }
    };
    for (const c of credits) {
      const enRetard = inGrace(c.date_heure_echeance, c.heure_echeance);
      if (c.statut !== "remboursé") {
        if (enRetard) {
          if (c.statut !== "en_retard") {
            updateStatutStmt.run("en_retard", c.id);
          }
          // Appliquer la pénalité une seule fois : basée sur le montant restant à rembourser, jamais réappliquée
          if (!c.penalite_due || c.penalite_due <= 0) {
            const penalite = Math.ceil((c.reste || 0) * 0.2);
            setPenaltyOnceStmt.run(penalite, c.id);
          }
        } else if (c.statut !== "actif") {
          updateStatutStmt.run("actif", c.id);
        }
      }
    }

    // Synchroniser le champ reste avec le principal restant uniquement
    const syncResteStmt = db.prepare(
      `UPDATE credits SET reste = ? WHERE id = ?`
    );
    for (const c of credits) {
      if (c.statut !== "remboursé") {
        // Calculer le reste principal uniquement : montant_a_rembourser - total_rembourse_principal
        const totalRemboursePrincipal = db
          .prepare("SELECT COALESCE(SUM(montant), 0) as total FROM remboursements WHERE id_credit = ? AND type = 'principal'")
          .get(c.id).total;
        const restePrincipal = Math.max(0, c.montant_a_rembourser - totalRemboursePrincipal);
        
        // Mettre à jour seulement si différent (le reste ne doit contenir que le principal)
        if (Math.abs(c.reste - restePrincipal) > 0.01) {
          syncResteStmt.run(restePrincipal, c.id);
        }
      }
    }

    const stmt = db.prepare(`
      SELECT 
        c.id, m.nom, c.montant_initial, c.montant_a_rembourser, c.reste,
        c.date_accord, c.date_expiration, c.date_heure_echeance, c.heure_echeance,
        c.penalite_due, c.statut,
        COALESCE(r.total_rembourse, 0) AS total_rembourse
      FROM credits c
      JOIN membres m ON c.id_membre = m.id
      LEFT JOIN (
        SELECT id_credit, SUM(montant) AS total_rembourse
        FROM remboursements
        GROUP BY id_credit
      ) r ON r.id_credit = c.id
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
    console.log("🔄 Début de l'octroi de crédit avec les données:", data);
    
    // Vérifier qu'une session est active
    const sessionActive = verifierSessionActive();
    console.log("✅ Session active trouvée:", sessionActive.id);

    const { id_membre, montant, montant_a_rembourser, date_expiration } = data;
    console.log("📊 Données extraites:", { id_membre, montant, montant_a_rembourser, date_expiration });

    // 1. VÉRIFICATION : Le membre n'a pas déjà un crédit non remboursé
    const creditExistant = db.prepare(`
      SELECT id, reste, penalite_due, statut 
      FROM credits 
      WHERE id_membre = ? AND statut IN ('actif', 'en_retard')
    `).get(id_membre);

    if (creditExistant) {
      const totalDu = (creditExistant.reste || 0) + (creditExistant.penalite_due || 0);
      return {
        success: false,
        message: `Ce membre a déjà un crédit en cours de ${totalDu.toLocaleString()} FCFA. Impossible d'accorder un nouveau crédit tant que l'ancien n'est pas remboursé.`
      };
    }

    // 2. VÉRIFICATION : Le montant du crédit ne dépasse pas le fonds disponible
    const fondsDisponible = db.prepare(`
      SELECT COALESCE(SUM(
        CASE 
          -- Entrées de caisse (montants positifs)
          WHEN type IN ('epargne', 'versement_ponctuel', 'restitution_caution', 'restitution_solde', 'remboursement') THEN montant
          -- Sorties de caisse (montants négatifs) 
          WHEN type IN ('credit', 'depense_epargne', 'depense_contribution', 'depense_commune_epargne', 'depense_commune_fonds', 'cassation') THEN montant
          ELSE 0
        END
      ), 0) as total
      FROM mouvements
    `).get().total || 0;

    if (montant > fondsDisponible) {
      return {
        success: false,
        message: `Fonds insuffisant ! Le montant demandé (${montant.toLocaleString()} FCFA) dépasse le fonds disponible (${fondsDisponible.toLocaleString()} FCFA).`
      };
    }

    const montantARembourser = Math.ceil(montant * 1.2);
    const dateAccord = new Date().toISOString().split("T")[0];
    console.log("💰 Calculs:", { montantARembourser, dateAccord });

    const stmt = db.prepare(`
      INSERT INTO credits (id_membre, montant_initial, montant_a_rembourser, reste, date_accord, date_expiration, date_heure_echeance, heure_echeance, statut)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    console.log("🗄️ Insertion du crédit avec les valeurs:", {
      id_membre,
      montant,
      montantARembourser,
      reste: montantARembourser,
      dateAccord,
      date_expiration,
      date_heure_echeance: data.date_heure_echeance || date_expiration,
      heure_echeance: data.heure_echeance || "23:59",
      statut: "actif"
    });

    const info = stmt.run(
      id_membre,
      montant,
      montantARembourser,
      montantARembourser,
      dateAccord,
      date_expiration,
      data.date_heure_echeance || date_expiration,
      data.heure_echeance || "23:59",
      "actif"
    );

    // Ajouter un mouvement de crédit
    const mouvementStmt = db.prepare(`
      INSERT INTO mouvements (membreId, type, montant, motif, date, sessionId)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    mouvementStmt.run(
      id_membre,
      "credit",
      -montant,
      `Crédit accordé - ${montant.toLocaleString()} FCFA`,
      new Date().toISOString(),
      sessionActive.id
    );

    console.log("✅ Crédit créé avec succès, ID:", info.lastInsertRowid);
    return { success: true, id: info.lastInsertRowid };
  } catch (err) {
    console.error("❌ Erreur accorder-credit:", err);
    throw err;
  }
});

ipcMain.handle("rembourser-credit", (_event, creditId, montant) => {
  try {
    // Vérifier qu'une session est active
    const sessionActive = verifierSessionActive();

    const credit = db
      .prepare("SELECT * FROM credits WHERE id = ?")
      .get(creditId);
    if (!credit) return { success: false, message: "Crédit introuvable" };

    // Déterminer si pénalité due (20% du montant à rembourser si en retard)
    const echeance = new Date(
      `${credit.date_heure_echeance}T${credit.heure_echeance}`
    );
    const enRetard = new Date() > echeance && credit.statut !== "remboursé";
    
    // Pénalité appliquée une seule fois: si non définie et en retard, la fixer sur (reste * 20%)
    let penaliteActuelle = credit.penalite_due || 0;
    if (enRetard && (!penaliteActuelle || penaliteActuelle <= 0)) {
      penaliteActuelle = Math.ceil((credit.reste || 0) * 0.2);
      db.prepare(`UPDATE credits SET penalite_due = ?, statut = 'en_retard' WHERE id = ?`).run(
        penaliteActuelle,
        creditId
      );
    }

    // Calculer les montants déjà remboursés (principal et pénalités)
    const remboursementsPrincipaux = db
      .prepare("SELECT COALESCE(SUM(montant), 0) as total FROM remboursements WHERE id_credit = ? AND type = 'principal'")
      .get(creditId).total;
    const remboursementsPenalites = db
      .prepare("SELECT COALESCE(SUM(montant), 0) as total FROM remboursements WHERE id_credit = ? AND type = 'penalite'")
      .get(creditId).total;

    // Calculer les montants restants
    const principalRestant = Math.max(0, credit.montant_a_rembourser - remboursementsPrincipaux);
    const penaliteRestante = Math.max(0, penaliteActuelle - remboursementsPenalites);

    let montantPourPenalite = 0;
    let montantPourPrincipal = 0;

    // Affecter le paiement d'abord à la pénalité puis au principal
    if (penaliteRestante > 0) {
      montantPourPenalite = Math.min(montant, penaliteRestante);
    }
    
    const resteApresPenalite = montant - montantPourPenalite;
    if (resteApresPenalite > 0 && principalRestant > 0) {
      montantPourPrincipal = Math.min(resteApresPenalite, principalRestant);
    }

    // Calculer les nouveaux restes
    const nouveauPrincipalRestant = Math.max(0, principalRestant - montantPourPrincipal);
    const nouvellePenaliteRestante = Math.max(0, penaliteRestante - montantPourPenalite);

    // Déterminer le nouveau statut
    const ancienStatut = credit.statut;
    const nouveauStatut = (nouveauPrincipalRestant <= 0 && nouvellePenaliteRestante <= 0) 
      ? "remboursé" 
      : enRetard ? "en_retard" : "actif";

    // Mettre à jour le crédit
    db.prepare(
      `UPDATE credits SET reste = ?, penalite_due = ?, statut = ? WHERE id = ?`
    ).run(nouveauPrincipalRestant, nouvellePenaliteRestante, nouveauStatut, creditId);

    // Insérer les enregistrements de remboursement (table remboursements)
    const nowIso = new Date().toISOString();
    if (montantPourPenalite > 0) {
      db.prepare(
        `INSERT INTO remboursements (id_credit, montant, date, type) VALUES (?, ?, ?, 'penalite')`
      ).run(creditId, montantPourPenalite, nowIso);
    }
    if (montantPourPrincipal > 0) {
      db.prepare(
        `INSERT INTO remboursements (id_credit, montant, date, type) VALUES (?, ?, ?, 'principal')`
      ).run(creditId, montantPourPrincipal, nowIso);
    }

    // Ajouter un mouvement de remboursement (source de vérité pour le solde)
    const mouvementStmt = db.prepare(`
      INSERT INTO mouvements (membreId, type, montant, motif, date, sessionId)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const motifParts: string[] = [];
    if (montantPourPenalite > 0) {
      motifParts.push(`pénalité ${montantPourPenalite.toLocaleString()} FCFA`);
    }
    if (montantPourPrincipal > 0) {
      motifParts.push(`principal ${montantPourPrincipal.toLocaleString()} FCFA`);
    }
    const motifGlobal = `Remboursement crédit #${creditId}` +
      (motifParts.length ? ` (${motifParts.join(" + ")})` : "");
    
    // Remboursement = entrée de caisse (montant positif)
    mouvementStmt.run(
      credit.id_membre,
      "remboursement",
      montant, // Montant positif = entrée de caisse
      motifGlobal,
      nowIso,
      sessionActive.id
    );

    // Si une partie correspond aux intérêts (surplus vs principal), enregistrer dans la session active
    const interetsPayes = Math.max(0, montantPourPenalite);
    if (interetsPayes > 0) {
      const res = db.prepare(
        `UPDATE session_membres SET interetsSession = interetsSession + ? WHERE sessionId = ? AND membreId = ?`
      ).run(interetsPayes, sessionActive.id, credit.id_membre);
      if (res.changes === 0) {
        db.prepare(
          `INSERT OR IGNORE INTO session_membres (sessionId, membreId, epargneSession, interetsSession, partSession)
           VALUES (?, ?, 0, ?, 0)`
        ).run(sessionActive.id, credit.id_membre, interetsPayes);
      }
    }

    // Si le crédit vient d'être totalement remboursé, enregistrer les intérêts perçus pour la session active
    if (ancienStatut !== 'remboursé' && nouveauStatut === 'remboursé') {
      const interetPercu = Math.max(0, (credit.montant_a_rembourser || 0) - (credit.montant_initial || 0));
      if (interetPercu > 0) {
        const res2 = db.prepare(
          `UPDATE session_membres SET interetsSession = interetsSession + ? WHERE sessionId = ? AND membreId = ?`
        ).run(interetPercu, sessionActive.id, credit.id_membre);
        if (res2.changes === 0) {
          db.prepare(
            `INSERT OR IGNORE INTO session_membres (sessionId, membreId, epargneSession, interetsSession, partSession)
             VALUES (?, ?, 0, ?, 0)`
          ).run(sessionActive.id, credit.id_membre, interetPercu);
        }
      }
    }

    // Notifier toutes les fenêtres que le fonds a été mis à jour et que les sessions peuvent avoir changé
    if (mainWindow) {
      mainWindow.webContents.send("fonds-updated", {
        montant,
        type: "remboursement",
      });
      mainWindow.webContents.send("sessions-updated");
    }

    return { success: true };
  } catch (error: any) {
    console.error("Erreur rembourser-credit:", error);
    return { success: false, message: error.message };
  }
});

// Fonction pour synchroniser le champ reste de tous les crédits
ipcMain.handle("sync-credits-reste", () => {
  try {
    const credits = db.prepare("SELECT * FROM credits").all();
    const syncStmt = db.prepare(
      `UPDATE credits SET reste = ? WHERE id = ?`
    );
    
    let updatedCount = 0;
    for (const credit of credits) {
      if (credit.statut !== "remboursé") {
        // Calculer le reste principal uniquement : montant_a_rembourser - total_rembourse_principal
        const totalRemboursePrincipal = db
          .prepare("SELECT COALESCE(SUM(montant), 0) as total FROM remboursements WHERE id_credit = ? AND type = 'principal'")
          .get(credit.id).total;
        const restePrincipal = Math.max(0, credit.montant_a_rembourser - totalRemboursePrincipal);
        
        // Mettre à jour seulement si différent (le reste ne doit contenir que le principal)
        if (Math.abs(credit.reste - restePrincipal) > 0.01) {
          syncStmt.run(restePrincipal, credit.id);
          updatedCount++;
        }
      }
    }
    
    return { success: true, updatedCount };
  } catch (err: any) {
    console.error("Erreur sync-credits-reste:", err);
    return { success: false, message: err?.message || "Erreur lors de la synchronisation" };
  }
});

ipcMain.handle("supprimer-credit", (_event, creditId) => {
  try {
    // Vérifier qu'une session est active
    const sessionActive = verifierSessionActive();

    const credit = db.prepare("SELECT * FROM credits WHERE id = ?").get(creditId);
    if (!credit) {
      return { success: false, message: "Crédit introuvable" };
    }

    // Supprimer les remboursements associés
    db.prepare("DELETE FROM remboursements WHERE id_credit = ?").run(creditId);

    // Supprimer le crédit
    db.prepare("DELETE FROM credits WHERE id = ?").run(creditId);

    // Supprimer les mouvements associés à ce crédit
    db.prepare("DELETE FROM mouvements WHERE type IN ('credit', 'remboursement') AND motif LIKE ?").run(`%crédit #${creditId}%`);

    return { success: true };
  } catch (err: any) {
    console.error("Erreur supprimer-credit:", err);
    return { success: false, message: err?.message || "Erreur lors de la suppression du crédit" };
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

// Handler pour récupérer les dons
ipcMain.handle("get-dons", () =>
  db
    .prepare(
      `
    SELECT d.id, m.nom AS membreNom, d.institution, d.montant, d.date, COALESCE(d.categorie, '') AS categorie
    FROM dons d
    JOIN membres m ON d.membreId = m.id
    ORDER BY d.date DESC
  `
    )
    .all()
);

// Handler pour ajouter un don
ipcMain.handle("ajouter-don", (_e, { membreId, institution, montant, categorie }) => {
  try {
    // Vérifier qu'une session est active
    const sessionActive = verifierSessionActive();

    // Ajouter le don dans la table dons
    const donStmt = db.prepare(`
      INSERT INTO dons (membreId, institution, montant, date, categorie)
      VALUES (?, ?, ?, ?, ?)
    `);
    const donInfo = donStmt.run(membreId, institution, montant, new Date().toISOString(), categorie || null);

    // Ne pas créer de mouvement: les dons sont fictifs et n'affectent pas le solde

    return { success: true, id: donInfo.lastInsertRowid };
  } catch (err: any) {
    console.error("Erreur ajouter-don:", err);
    return { success: false, message: err?.message || "Erreur lors de l'ajout du don" };
  }
});

// Handler pour supprimer un don
ipcMain.handle("supprimer-don", (_e, donId: number) => {
  try {
    const info = db.prepare(`DELETE FROM dons WHERE id = ?`).run(donId);
    return { success: info.changes > 0 };
  } catch (err: any) {
    console.error("Erreur supprimer-don:", err);
    return { success: false, message: err?.message || "Erreur lors de la suppression du don" };
  }
});

// Handler temporaire pour supprimer le membre "dom"
ipcMain.handle("supprimer-membre-dom", async () => {
  try {
    console.log('🔍 Recherche du membre "dom"...');
    
    // Rechercher le membre "dom"
    const member = db.prepare('SELECT id, nom FROM membres WHERE nom LIKE ? OR nom = ?').all('%dom%', 'dom');
    
    if (member.length === 0) {
      return { success: false, message: 'Aucun membre "dom" trouvé dans la base de données.' };
    }
    
    console.log('📋 Membres trouvés:', member);
    
    // Vérifier s'il a des crédits actifs
    const creditsActifs = db.prepare('SELECT COUNT(*) as count FROM credits WHERE id_membre = ? AND statut IN (?, ?)').get(member[0].id, 'actif', 'en_retard');
    
    if (creditsActifs.count > 0) {
      return { success: false, message: `Impossible de supprimer le membre "${member[0].nom}" car il a ${creditsActifs.count} crédit(s) actif(s).` };
    }
    
    // Supprimer le membre
    console.log(`🗑️ Suppression du membre "${member[0].nom}" (ID: ${member[0].id})...`);
    
    const transaction = db.transaction(() => {
      // Désactiver les contraintes de clé étrangère temporairement
      db.prepare('PRAGMA foreign_keys = OFF').run();
      console.log('  - Contraintes de clé étrangère désactivées');
      
      // Supprimer les dons associés
      const donsDeleted = db.prepare('DELETE FROM dons WHERE membreId = ?').run(member[0].id);
      console.log(`  - Dons supprimés: ${donsDeleted.changes}`);
      
      // Supprimer les remboursements (via les crédits)
      const remboursementsDeleted = db.prepare(`
        DELETE FROM remboursements 
        WHERE id_credit IN (SELECT id FROM credits WHERE id_membre = ?)
      `).run(member[0].id);
      console.log(`  - Remboursements supprimés: ${remboursementsDeleted.changes}`);
      
      // Supprimer les crédits
      const creditsDeleted = db.prepare('DELETE FROM credits WHERE id_membre = ?').run(member[0].id);
      console.log(`  - Crédits supprimés: ${creditsDeleted.changes}`);
      
      // Supprimer les mouvements
      const mouvementsDeleted = db.prepare('DELETE FROM mouvements WHERE membreId = ?').run(member[0].id);
      console.log(`  - Mouvements supprimés: ${mouvementsDeleted.changes}`);
      
      // Supprimer les entrées session_membres
      const sessionMembresDeleted = db.prepare('DELETE FROM session_membres WHERE membreId = ?').run(member[0].id);
      console.log(`  - Entrées session_membres supprimées: ${sessionMembresDeleted.changes}`);
      
      // Supprimer le membre
      const membreDeleted = db.prepare('DELETE FROM membres WHERE id = ?').run(member[0].id);
      console.log(`  - Membre supprimé: ${membreDeleted.changes}`);
      
      // Réactiver les contraintes de clé étrangère
      db.prepare('PRAGMA foreign_keys = ON').run();
      console.log('  - Contraintes de clé étrangère réactivées');
    });
    
    // Exécuter la transaction
    transaction();
    
    console.log('✅ Membre "dom" supprimé avec succès !');
    return { success: true, message: `Membre "${member[0].nom}" supprimé avec succès !` };
    
  } catch (error: any) {
    console.error('❌ Erreur lors de la suppression:', error.message);
    return { success: false, message: error?.message || 'Erreur lors de la suppression du membre "dom"' };
  }
});

// Fonction utilitaire pour calculer la simulation de cassation
const calculerSimulationCassation = () => {
  try {
    console.log("🔄 Calcul de la simulation de cassation...");
    
    // Récupérer tous les membres avec leurs soldes actuels
    const membres = db.prepare(`
      SELECT 
        m.id,
        m.nom,
        m.soldeEpargne as epargneActuelle,
        COALESCE(SUM(c.reste + c.penalite_due), 0) as creditRestant,
        m.soldeEpargne - COALESCE(SUM(c.reste + c.penalite_due), 0) as contributionNette,
        CASE 
          WHEN COALESCE(SUM(c.reste + c.penalite_due), 0) > 0 THEN 'en_retard'
          ELSE 'en_regle'
        END as statut
      FROM membres m
      LEFT JOIN credits c ON m.id = c.id_membre AND c.statut IN ('actif', 'en_retard')
      GROUP BY m.id, m.nom, m.soldeEpargne
      ORDER BY m.nom
    `).all();

    console.log("📊 Membres récupérés:", membres.length);

    // Anciennes métriques (gardées pour diagnostic/transparence)
    const totalEpargnes = membres.reduce((sum: number, m: any) => sum + m.epargneActuelle, 0);
    const totalCredits = membres.reduce((sum: number, m: any) => sum + m.creditRestant, 0);
    const interetsMouvements = db.prepare(`
      SELECT COALESCE(SUM(m.montant), 0) as total
      FROM mouvements m
      WHERE m.type = 'interet' AND m.montant > 0
    `).get().total;
    const creditsRembourses = db.prepare(`
      SELECT montant_initial, montant_a_rembourser 
      FROM credits 
      WHERE statut = 'remboursé'
    `).all();
    let totalInteretsCredits = 0;
    for (const credit of creditsRembourses) {
      const interetPercu = credit.montant_a_rembourser - credit.montant_initial;
      if (interetPercu > 0) totalInteretsCredits += interetPercu;
      }
    const interetsPerçus = interetsMouvements + totalInteretsCredits;

    // Source de vérité: solde disponible réel (somme nette des mouvements)
    const soldeDisponibleReel = db.prepare(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN type IN ('epargne', 'versement_ponctuel', 'restitution_caution', 'restitution_solde', 'remboursement') THEN montant
          WHEN type IN ('credit', 'depense_epargne', 'depense_contribution', 'depense_commune_epargne', 'depense_commune_fonds', 'cassation') THEN montant
          ELSE 0
        END
      ), 0) as total
      FROM mouvements
    `).get().total || 0;

    console.log("💰 Fonds disponibles (réel)", { soldeDisponibleReel, totalEpargnes, totalCredits, interetsPerçus });

    // Calculer les parts de cassation pour chaque membre
    const totalContributionsNettes = membres.reduce((sum: number, m: any) => sum + Math.max(0, m.contributionNette), 0);
    
    // Calcul initial des parts (épargne nette + intérêts proportionnels)
    const partsInitiales = membres.map((membre: any) => {
      const contribution = Math.max(0, membre.contributionNette);
      const partEpargneBrute = contribution;
      const partInteretsBrute = totalContributionsNettes > 0
        ? (contribution / totalContributionsNettes) * Math.max(0, interetsPerçus)
        : 0;
      const totalBrut = partEpargneBrute + partInteretsBrute;
      return { membre, contribution, partEpargneBrute, partInteretsBrute, totalBrut };
    });

    const sommeInitialeParts = partsInitiales.reduce((s: number, p: { totalBrut: number }) => s + p.totalBrut, 0);
    const facteurEchelle = sommeInitialeParts > 0 ? (soldeDisponibleReel / sommeInitialeParts) : 0;

    // Appliquer l'échelle pour que la somme corresponde au solde disponible réel
    let membresAvecParts = partsInitiales.map((p: { membre: any; contribution: number; partEpargneBrute: number; partInteretsBrute: number; totalBrut: number; }) => {
      let partEpargne = p.partEpargneBrute * facteurEchelle;
      let partInterets = p.partInteretsBrute * facteurEchelle;
      let partCassation = partEpargne + partInterets;

      // Arrondi intelligent
        if (partCassation > 0) {
          if (partCassation <= 100) {
          partCassation = Math.round(partCassation / 25) * 25;
          } else if (partCassation <= 500) {
          partCassation = Math.round(partCassation / 50) * 50;
          } else {
          partCassation = Math.round(partCassation / 100) * 100;
        }
      }

      return {
        ...p.membre,
        partCassation: Math.max(0, partCassation),
        partEpargne: Math.max(0, partEpargne),
        partInterets: Math.max(0, partInterets),
        calculDetail: {
          epargneNette: p.contribution,
          totalBrutAvantEchelle: p.totalBrut,
          facteurEchelle,
        }
      };
    });

    // Ajuster la somme après arrondi pour coller au solde disponible réel
    const sommeArrondie = membresAvecParts.reduce((s: number, m: any) => s + (m.partCassation || 0), 0);
    let delta = Math.round(soldeDisponibleReel - sommeArrondie);
    if (delta !== 0 && membresAvecParts.length > 0) {
      // Ajuster sur le premier membre ayant une part > 0
      for (let i = 0; i < membresAvecParts.length; i++) {
        if ((membresAvecParts[i].partCassation || 0) > 0) {
          membresAvecParts[i].partCassation = Math.max(0, (membresAvecParts[i].partCassation || 0) + delta);
          break;
        }
      }
    }

    console.log("✅ Simulation de cassation calculée avec succès");
    console.log("📊 Détail des parts par membre:", membresAvecParts.map((m: any) => ({
      nom: m.nom,
      partEpargne: m.partEpargne?.toLocaleString(),
      partInterets: m.partInterets?.toLocaleString(),
      partTotale: m.partCassation?.toLocaleString()
    })));
    
    // Retourner les détails de la simulation avec les informations sur les intérêts
    return {
      membres: membresAvecParts,
      details: {
        totalEpargnes,
        totalCredits,
        interetsMouvements,
        totalInteretsCredits,
        interetsPerçus,
        fondsDisponibles: soldeDisponibleReel,
        totalContributionsNettes,
        facteurEchelle,
        // Nouveaux détails sur la répartition
        repartition: {
          totalEpargneNette: totalContributionsNettes,
          totalInteretsARepartir: interetsPerçus,
          ratioInterets: totalContributionsNettes > 0 ? interetsPerçus / totalContributionsNettes : 0
        }
      }
    };
    
  } catch (error: any) {
    console.error("❌ Erreur lors de la simulation de cassation:", error);
    throw new Error(`Erreur lors de la simulation: ${error.message}`);
  }
};

// Handlers pour la cassation
ipcMain.handle("simuler-cassation", async () => {
  return calculerSimulationCassation();
});



ipcMain.handle("executer-cassation", async () => {
  try {
    console.log("🚀 Début de l'exécution de la cassation...");
    
    // Vérifier qu'il y a des fonds à distribuer
    const simulation = calculerSimulationCassation();
    if (simulation.membres.length === 0) {
      throw new Error("Aucune donnée de simulation disponible");
    }

    const totalParts = simulation.membres.reduce((sum: number, m: any) => sum + (m.partCassation || 0), 0);
    if (totalParts <= 0) {
      throw new Error("Aucun fonds disponible pour la cassation");
    }

    console.log("✅ Cassation exécutée avec succès");
    return { success: true, message: "Cassation exécutée avec succès" };
    
  } catch (error: any) {
    console.error("❌ Erreur lors de l'exécution de la cassation:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("appliquer-cassation", async () => {
  try {
    console.log("🎯 Début de l'application de la cassation...");
    
    // Récupérer la simulation
    const simulation = calculerSimulationCassation();
    if (simulation.membres.length === 0) {
      throw new Error("Aucune donnée de simulation disponible");
    }

    const totalParts = simulation.membres.reduce((sum: number, m: any) => sum + (m.partCassation || 0), 0);
    if (totalParts <= 0) {
      throw new Error("Aucun fonds disponible pour la cassation");
    }

    // Appliquer la cassation dans une transaction
    const transaction = db.transaction(() => {
      // 1. Créer des mouvements de cassation pour chaque membre
      const insertMouvement = db.prepare(`
        INSERT INTO mouvements (membreId, type, montant, motif, date)
        VALUES (?, 'cassation', ?, ?, ?)
      `);

      simulation.membres.forEach((membre: any) => {
        if (membre.partCassation > 0) {
          // Mouvement de cassation = sortie de la caisse (négatif)
          const motif = membre.partInterets > 0 
            ? `Part de cassation - ${membre.nom} (Épargne: ${membre.partEpargne?.toLocaleString()} FCFA + Intérêts: ${membre.partInterets?.toLocaleString()} FCFA)`
            : `Part de cassation - ${membre.nom} (Épargne: ${membre.partEpargne?.toLocaleString()} FCFA)`;
          
          insertMouvement.run(
            membre.id,
            -membre.partCassation,
            motif,
            new Date().toISOString()
          );
        }
      });

      // 2. Remettre à zéro tous les soldes épargne (nouveau cycle => 0)
      db.prepare(`UPDATE membres SET soldeEpargne = 0`).run();

      // 3. Marquer la fin du cycle en archivant les données
      // Créer un mouvement de remise à zéro (reset) pour marquer le nouveau cycle
      const premierMembre = db.prepare("SELECT id FROM membres LIMIT 1").get();
      if (premierMembre) {
        db.prepare(`
          INSERT INTO mouvements (membreId, type, montant, motif, date)
          VALUES (?, 'cassation', 0, 'RESET_CYCLE - Nouveau cycle après cassation', ?)
        `).run(premierMembre.id, new Date().toISOString());
      }
    });

        // Exécuter la transaction
    transaction();

    // Logs détaillés sur la répartition
    const totalEpargneDistribuee = simulation.membres.reduce((sum: number, m: any) => sum + (m.partEpargne || 0), 0);
    const totalInteretsDistribues = simulation.membres.reduce((sum: number, m: any) => sum + (m.partInterets || 0), 0);
    
    console.log("📊 Détail de la distribution:", {
      totalEpargne: totalEpargneDistribuee.toLocaleString(),
      totalInterets: totalInteretsDistribues.toLocaleString(),
      totalDistribue: totalParts.toLocaleString(),
      membresBeneficiaires: simulation.membres.filter((m: any) => m.partCassation > 0).length
    });

    // Émettre l'événement de cassation appliquée
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send("cassation-applied", {
        totalDistributed: totalParts,
        membersCount: simulation.membres.filter((m: any) => m.partCassation > 0).length,
        details: {
          totalEpargne: totalEpargneDistribuee,
          totalInterets: totalInteretsDistribues
        }
      });
    }

    console.log("✅ Cassation appliquée avec succès");
    return { 
      success: true, 
      message: `Cassation appliquée avec succès ! ${totalParts.toLocaleString()} FCFA distribués (Épargne: ${totalEpargneDistribuee.toLocaleString()} FCFA + Intérêts: ${totalInteretsDistribues.toLocaleString()} FCFA).` 
    };
    
  } catch (error: any) {
    console.error("❌ Erreur lors de l'application de la cassation:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("get-etat-apres-cassation", async () => {
  try {
    console.log("📊 Récupération de l'état après cassation...");
    
    // Récupérer l'état actuel des membres
    const membres = db.prepare(`
      SELECT 
        m.id,
        m.nom,
        m.soldeEpargne as nouveauSolde,
        COALESCE(SUM(c.reste + c.penalite_due), 0) as creditRestant,
        CASE 
          WHEN COALESCE(SUM(c.reste + c.penalite_due), 0) > 0 THEN 'En difficulté'
          ELSE 'En règle'
        END as situation
      FROM membres m
      LEFT JOIN credits c ON m.id = c.id_membre AND c.statut IN ('actif', 'en_retard')
      GROUP BY m.id, m.nom, m.soldeEpargne
      ORDER BY m.nom
    `).all();

    // Récupérer les parts de cassation distribuées
    const partsDistribuees = db.prepare(`
      SELECT 
        m.id,
        COALESCE(SUM(CASE WHEN mv.type = 'cassation' THEN mv.montant ELSE 0 END), 0) as partCassationRecue
      FROM membres m
      LEFT JOIN mouvements mv ON m.id = mv.membreId
      GROUP BY m.id
    `).all();

    // Fusionner les données
    const membresAvecParts = membres.map((membre: any) => {
      const part = partsDistribuees.find((p: any) => p.id === membre.id);
      return {
        ...membre,
        partCassationRecue: part?.partCassationRecue || 0
      };
    });

    // Calculer les statistiques
    const statistiques = {
      membresEnPositif: membresAvecParts.filter((m: any) => m.nouveauSolde > 0).length,
      membresEnDifficulte: membresAvecParts.filter((m: any) => m.creditRestant > 0).length,
      totalPartsDistribuees: membresAvecParts.reduce((sum: number, m: any) => sum + m.partCassationRecue, 0),
      totalCreancesRestantes: membresAvecParts.reduce((sum: number, m: any) => sum + m.creditRestant, 0)
    };

    // Générer des alertes
    const alertes = [];
    
    if (statistiques.membresEnDifficulte > 0) {
      alertes.push({
        type: "warning",
        titre: "Membres en difficulté",
        message: `${statistiques.membresEnDifficulte} membre(s) ont encore des crédits à rembourser.`,
        details: membresAvecParts
          .filter((m: any) => m.creditRestant > 0)
          .map((m: any) => `${m.nom}: ${m.creditRestant.toLocaleString()} FCFA`),
        action: "Ces créances devront être remboursées pour alimenter le prochain cycle."
      });
    }

    if (statistiques.totalCreancesRestantes > 0) {
      alertes.push({
        type: "info",
        titre: "Créances restantes",
        message: `Total des créances restantes: ${statistiques.totalCreancesRestantes.toLocaleString()} FCFA`,
        action: "Ces montants devront être récupérés pour le prochain cycle."
      });
    }

    console.log("✅ État après cassation récupéré");
    return {
      success: true,
      membres: membresAvecParts,
      statistiques,
      alertes
    };
    
  } catch (error: any) {
    console.error("❌ Erreur lors de la récupération de l'état après cassation:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("preparer-nouveau-cycle", async () => {
  try {
    console.log("🔄 Préparation du nouveau cycle...");
    
    // Récupérer l'état actuel en utilisant la logique directe
    const membres = db.prepare(`
      SELECT 
        m.id,
        m.nom,
        m.soldeEpargne as nouveauSolde,
        COALESCE(SUM(c.reste + c.penalite_due), 0) as creditRestant,
        CASE 
          WHEN COALESCE(SUM(c.reste + c.penalite_due), 0) > 0 THEN 'En difficulté'
          ELSE 'En règle'
        END as situation
      FROM membres m
      LEFT JOIN credits c ON m.id = c.id_membre AND c.statut IN ('actif', 'en_retard')
      GROUP BY m.id, m.nom, m.soldeEpargne
      ORDER BY m.nom
    `).all();

    // Calculer les statistiques
    const statistiques = {
      membresEnPositif: membres.filter((m: any) => m.nouveauSolde > 0).length,
      membresEnDifficulte: membres.filter((m: any) => m.creditRestant > 0).length,
      totalCreancesRestantes: membres.reduce((sum: number, m: any) => sum + m.creditRestant, 0)
    };

    // Préparer le nouveau cycle (pour l'instant, on ne fait que valider l'état)
    // Dans une vraie implémentation, on pourrait créer de nouvelles sessions, etc.

    // Émettre l'événement de nouveau cycle préparé
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send("nouveau-cycle-prepared", {
        membres,
        statistiques,
        alertes: []
      });
    }

    console.log("✅ Nouveau cycle préparé avec succès");
    return { 
      success: true, 
      message: "Nouveau cycle préparé avec succès !" 
    };
    
  } catch (error: any) {
    console.error("❌ Erreur lors de la préparation du nouveau cycle:", error);
    return { success: false, message: error.message };
  }
});

// Ajouter d'autres gestionnaires IPC si nécessaire
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

ipcMain.handle("get-app-name", () => {
  return app.getName();
});

// Gestionnaire pour fermer l'application
ipcMain.handle("quit-app", () => {
  app.quit();
});

// Gestionnaire pour minimiser la fenêtre
ipcMain.handle("minimize-window", () => {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.minimize();
  }
});

// Gestionnaire pour maximiser/restaurer la fenêtre
ipcMain.handle("toggle-maximize", () => {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow.maximize();
    }
  }
});

// Gestionnaire pour appliquer manuellement les pénalités sur les crédits
ipcMain.handle("appliquer-penalites-credits", async () => {
  try {
    console.log("🔄 Application manuelle des pénalités sur les crédits non remboursés...");
    
    const creditsNonRembourses = db.prepare(`
      SELECT id, reste, penalite_due, statut
      FROM credits 
      WHERE statut IN ('actif', 'en_retard') AND (penalite_due IS NULL OR penalite_due <= 0)
    `).all();

    let penalitesAppliquees = 0;
    for (const credit of creditsNonRembourses) {
      // Appliquer une pénalité de 20% sur le montant restant à rembourser
      const penalite = Math.ceil((credit.reste || 0) * 0.2);
      db.prepare(`
        UPDATE credits 
        SET penalite_due = ?, statut = 'en_retard' 
        WHERE id = ?
      `).run(penalite, credit.id);
      penalitesAppliquees++;
    }
    
    if (penalitesAppliquees > 0) {
      console.log(`✅ ${penalitesAppliquees} pénalités appliquées manuellement sur les crédits non remboursés`);
    } else {
      console.log("ℹ️ Aucune nouvelle pénalité à appliquer");
    }

    return {
      success: true,
      message: `${penalitesAppliquees} pénalités appliquées avec succès`,
      penalitesAppliquees: penalitesAppliquees
    };
    
  } catch (err: any) {
    console.error("Erreur appliquer-penalites-credits:", err);
    return {
      success: false,
      message: err?.message || "Erreur lors de l'application des pénalités"
    };
  }
});

// Handler pour changer le mot de passe de l'utilisateur courant (par rôle)
ipcMain.handle("change-password", async (_event, { requesterRole, targetRole, currentPassword, newPassword }) => {
  try {
    if (!requesterRole || !targetRole || !currentPassword || !newPassword) {
      return { success: false, message: "Paramètres manquants" };
    }

    // Interdiction: un adjoint ne peut changer que son propre mot de passe
    if (requesterRole !== "admin" && requesterRole !== targetRole) {
      return { success: false, message: "Permission refusée" };
    }

    if (requesterRole === targetRole) {
      // Cas standard: on vérifie le mot de passe actuel du rôle cible
      const user = db.prepare("SELECT * FROM users WHERE role = ?").get(targetRole);
      if (!user) {
        return { success: false, message: "Utilisateur introuvable" };
      }
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return { success: false, message: "Mot de passe actuel incorrect" };
      }
    } else {
      // Admin modifie le mot de passe d'un autre rôle (ex: adjoint)
      // Vérifier le mot de passe de l'admin pour confirmer l'action
      const adminUser = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
      if (!adminUser) {
        return { success: false, message: "Admin introuvable" };
      }
      const isAdminValid = await bcrypt.compare(currentPassword, adminUser.password);
      if (!isAdminValid) {
        return { success: false, message: "Mot de passe admin incorrect" };
      }
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE role = ?").run(newHash, targetRole);
    return { success: true };
  } catch (err: any) {
    console.error("change-password error:", err);
    return { success: false, message: err?.message || "Erreur lors du changement de mot de passe" };
  }
});

console.log("🚀 Application Electron démarrée avec succès");



