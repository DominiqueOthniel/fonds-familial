declare global {
  interface Window {
    electronAPI: {
      // Authentification
      login: (credentials: {
        email: string;
        password: string;
      }) => Promise<{ success: boolean; role?: string; message?: string }>;
      onSetRole: (callback: (role: string) => void) => void;

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
      getDetailsMembre: (membreId: number) => Promise<{
        membre: any;
        soldeEpargne: number;
        totalCotisations: number;
        totalDepenses: number;
        creditActuel: number;
        nbMouvements: number;
      }>;
      getHistoriqueMembre: (membreId: number) => Promise<any[]>;

      // Mouvements
      getMouvements: () => Promise<any[]>;
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
          | "depense_commune_epargne";
        montant: number;
        motif?: string;
      }) => Promise<{ success: boolean; id?: number }>;
      modifierMouvement: (
        id: number,
        mouvement: any
      ) => Promise<{ success: boolean }>;
      supprimerMouvement: (id: number) => Promise<{ success: boolean }>;

      // Dépenses communes
      getDepensesCommunes: () => Promise<any[]>;
      ajouterDepenseCommune: (d: {
        description: string;
        montant: number;
        categorie: string;
        useEpargne?: boolean;
      }) => Promise<{ success: boolean; id?: number }>;
      modifierDepenseCommune: (
        id: number,
        d: { description: string; montant: number; categorie: string }
      ) => Promise<{ success: boolean }>;
      supprimerDepenseCommune: (id: number) => Promise<{ success: boolean }>;

      // Solde du fonds
      getSoldeFonds: () => Promise<{
        solde: number;
        totalEpargne: number;
        totalCotisations: number;
        totalDepensesCommunes: number;
        totalCredit: number;
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
      accorderCredit: (
        data: any
      ) => Promise<{ success: boolean; message?: string }>;
      rembourserCredit: (
        creditId: number,
        montant: number
      ) => Promise<{ success: boolean; message?: string }>;
      supprimerCredit: (
        creditId: number
      ) => Promise<{ success: boolean; message?: string }>;
      supprimerCredit: (
        creditId: number
      ) => Promise<{ success: boolean; message?: string }>;

      // Caisse
      ajouterCaisse: (
        type: string,
        categorie: string,
        montant: number,
        description?: string
      ) => Promise<{ success: boolean; message?: string }>;
      getSoldeCaisse: () => Promise<number>;
      getHistoriqueCaisse: () => Promise<any[]>;
    };
  }
}

export {};
