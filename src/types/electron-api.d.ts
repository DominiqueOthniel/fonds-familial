declare global {
  interface Window {
    electronAPI: {
      // Authentification
      login: (credentials: {
        email: string;
        password: string;
      }) => Promise<{ success: boolean; role?: string; message?: string }>;
      onSetRole: (callback: (role: string) => void) => void;
      changePassword: (data: { requesterRole: string; targetRole: string; currentPassword: string; newPassword: string }) => Promise<{ success: boolean; message?: string }>;

      // Membres
      ajouterMembre: (
        membre: any
      ) => Promise<{ success: boolean; id?: number }>;
      getMembres: () => Promise<any[]>;
      modifierMembre: (
        id: number,
        membre: any
      ) => Promise<{ success: boolean }>;
      supprimerMembre: (
        id: number
      ) => Promise<{ success: boolean; message?: string }>;
      supprimerSession: (
        sessionId: number
      ) => Promise<{ success: boolean; message?: string }>;
      supprimerMembreDom: () => Promise<{ success: boolean; message?: string }>;
      updateSessionEpargne: (
        membreId: number,
        montant: number
      ) => Promise<{ success: boolean; message?: string }>;
      getDetailsMembre: (membreId: number) => Promise<{
        membre: any;
        soldeEpargne: number;
        totalCotisations: number;
        totalDepenses: number;
        creditActuel: number;
        creditInitial: number;
        totalPenalites: number;
        creditsDetails: Array<{
          id: number;
          montant_initial: number;
          reste: number;
          penalite_due: number;
          statut: string;
          date_accord: string;
          date_heure_echeance: string;
        }>;
        nbMouvements: number;
        cassationTotal: number;
        ancienSoldePersonnel: number;
      }>;
      getHistoriqueMembre: (membreId: number) => Promise<any[]>;

      // Mouvements
      getMouvements: (filters?: { year?: string; sessionId?: number }) => Promise<any[]>;
      ajouterMouvement: (mouvement: {
        membreId: number;
        type:
          | "epargne"
          | "cotisation_annuelle"
          | "versement_ponctuel"
          | "depot_caution"
          | "restitution_caution"
          | "credit"
          | "remboursement"
          | "interet"
          | "depense_commune_fonds"
          | "depense_commune_epargne"
          | "depense_epargne"
          | "depense_contribution"
          | "restitution_solde"
          | "sortie_restitution"
          | "cassation";
        montant: number;
        motif?: string;
      }) => Promise<{ success: boolean; id?: number }>;
      modifierMouvement: (
        id: number,
        mouvement: any
      ) => Promise<{ success: boolean }>;
      supprimerMouvement: (id: number) => Promise<{ success: boolean }>;
      onMouvementsUpdated: (
        callback: (data: { type: string; depenseId: number; depenseType: string }) => void
      ) => void;
      removeMouvementsUpdatedListener: (
        callback: (data: { type: string; depenseId: number; depenseType: string }) => void
      ) => void;

      // Dépenses communes
      getDepensesCommunes: () => Promise<any[]>;
      ajouterDepenseCommune: (d: {
        description: string;
        montant: number;
        categorie: string;
        typeContribution: "prelevement_epargne" | "contribution_individuelle";
      }) => Promise<{ success: boolean; id?: number }>;
      modifierDepenseCommune: (
        id: number,
        d: { description: string; montant: number; categorie: string }
      ) => Promise<{ success: boolean }>;
      supprimerDepenseCommune: (id: number) => Promise<{ success: boolean }>;

      // Solde du fonds
      getSoldeFonds: () => Promise<{
        solde: number;
        soldeFictif: number;
        totalEpargnesNettes: number;
        totalCreditsAccordes: number;
        totalCreditsRestants: number;
        totalRemboursements: number;
        totalInterets: number;
        totalDepensesCommunes: number;
        totalCassationDistribuee: number;
      }>;

      // Cotisations
      addCotisation: (data: {
        montantParMembre: number;
        date: string;
        type: "annuelle" | "ponctuel";
      }) => Promise<{
        success: boolean;
        nbMembres?: number;
        message?: string;
        membresInsuffisants?: Array<{
          nom: string;
          solde: number;
          montantRequis: number;
        }>;
      }>;

      // Crédits
      getCredits: () => Promise<any[]>;
      accorderCredit: (data: {
        id_membre: number;
        montant: number;
        date_expiration: string;
        date_heure_echeance: string;
        heure_echeance: string;
      }) => Promise<{ success: boolean; message?: string }>;
      rembourserCredit: (
        creditId: number,
        montant: number
      ) => Promise<{ success: boolean; message?: string }>;
      supprimerCredit: (
        creditId: number
      ) => Promise<{ success: boolean; message?: string }>;
      syncCreditsReste: () => Promise<{ success: boolean; updatedCount?: number; message?: string }>;
      onCreditDeleted: (callback: (creditId: number) => void) => void;
      onCreditUpdated: (callback: (creditId: number) => void) => void;
      onFondsUpdated: (
        callback: (data: { montant: number; type: string }) => void
      ) => void;
      removeCreditDeletedListener: (
        callback: (creditId: number) => void
      ) => void;
      removeCreditUpdatedListener: (
        callback: (creditId: number) => void
      ) => void;
      removeFondsUpdatedListener: (
        callback: (data: { montant: number; type: string }) => void
      ) => void;

      // Caisse
      ajouterCaisse: (
        type: string,
        categorie: string,
        montant: number,
        description?: string
      ) => Promise<{ success: boolean; message?: string }>;
      getSoldeCaisse: () => Promise<number>;
      getHistoriqueCaisse: () => Promise<any[]>;

      // Dons
      getDons: () => Promise<Array<any>>;
      ajouterDon: (don: { membreId: number; institution: string; montant: number; categorie?: string }) => Promise<{ success: boolean; id?: number; message?: string }>;
      supprimerDon: (donId: number) => Promise<{ success: boolean; message?: string }>;

      // Sessions
      getSessions: () => Promise<{
        sessions: any[];
        sessionActive: any | null;
      }>;
      creerSession: () => Promise<{
        success: boolean;
        message?: string;
        sessionId?: number;
        penalitesAppliquees?: number;
      }>;
      modifierNomSession: (
        sessionId: number,
        nouveauNom: string
      ) => Promise<{ success: boolean; message?: string }>;
      terminerSession: (sessionId: number) => Promise<{ success: boolean; message?: string }>;
      cassationSession: (sessionId: number) => Promise<{ success: boolean; message?: string }>;
      supprimerSession: (sessionId: number) => Promise<{ success: boolean; message?: string }>;

      // Cassation
      simulerCassation: () => Promise<any[]>;
      executerCassation: () => Promise<{ success: boolean; parts: any[] }>;
      appliquerCassation: () => Promise<{ success: boolean; message?: string }>;
      onCassationApplied: (
        callback: (data: {
          totalDistributed: number;
          membersCount: number;
        }) => void
      ) => void;

      // Export PDF
      exportMouvementsPdf: (sessionId?: number) => Promise<{ success: boolean; filePath?: string; message: string }>;
      exportMembrePdf: (membreId: number) => Promise<{ success: boolean; filePath?: string; message: string }>;
      exportCassationPdf: () => Promise<{ success: boolean; filePath?: string; message: string }>;

      // Nouveau cycle
      preparerNouveauCycle: () => Promise<{ success: boolean; message: string }>;
    };
  }
}

export {};
