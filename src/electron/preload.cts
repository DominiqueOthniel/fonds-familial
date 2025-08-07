const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Authentification
  login: (credentials: { email: string; password: string }) =>
    ipcRenderer.invoke("login", credentials),
  onSetRole: (callback: (role: string) => void) =>
    ipcRenderer.on("set-role", (_e: any, role: string) => callback(role)),

  // Membres
  ajouterMembre: (membre: any) => ipcRenderer.invoke("ajouter-membre", membre),
  getMembres: () => ipcRenderer.invoke("get-membres"),
  modifierMembre: (id: number, membre: any) =>
    ipcRenderer.invoke("modifier-membre", id, membre),
  supprimerMembre: (id: number) => ipcRenderer.invoke("supprimer-membre", id),
  getDetailsMembre: (membreId: number) =>
    ipcRenderer.invoke("get-details-membre", membreId),
  getHistoriqueMembre: (membreId: number) =>
    ipcRenderer.invoke("get-historique-membre", membreId),

  // Mouvements
  getMouvements: () => ipcRenderer.invoke("get-mouvements"),
  ajouterMouvement: (mouvement: any) =>
    ipcRenderer.invoke("ajouter-mouvement", mouvement),
  modifierMouvement: (id: number, mouvement: any) =>
    ipcRenderer.invoke("modifier-mouvement", id, mouvement),
  supprimerMouvement: (id: number) =>
    ipcRenderer.invoke("supprimer-mouvement", id),

  // Dépenses communes
  getDepensesCommunes: () => ipcRenderer.invoke("get-depenses-communes"),
  ajouterDepenseCommune: (d: {
    description: string;
    montant: number;
    categorie: string;
    useEpargne?: boolean;
  }) => ipcRenderer.invoke("ajouter-depense-commune", d),
  modifierDepenseCommune: (
    id: number,
    d: { description: string; montant: number; categorie: string }
  ) => ipcRenderer.invoke("modifier-depense-commune", id, d),
  supprimerDepenseCommune: (id: number) =>
    ipcRenderer.invoke("supprimer-depense-commune", id),

  // Solde du fonds
  getSoldeFonds: () => ipcRenderer.invoke("get-solde-fonds"),

  // Cotisations
  addCotisation: (data: {
    montantParMembre: number;
    date: string;
    type: "annuelle" | "ponctuel";
  }) => ipcRenderer.invoke("ajouter-prelevement-cotisation", data),

  // Crédits
  getCredits: () => ipcRenderer.invoke("get-credits"),
  accorderCredit: (data: any) => ipcRenderer.invoke("accorder-credit", data),
  rembourserCredit: (creditId: number, montant: number) =>
    ipcRenderer.invoke("rembourser-credit", creditId, montant),
  supprimerCredit: (creditId: number) =>
    ipcRenderer.invoke("supprimer-credit", creditId),

  // Caisse
  ajouterCaisse: (
    type: string,
    categorie: string,
    montant: number,
    description?: string
  ) =>
    ipcRenderer.invoke("ajouterCaisse", type, categorie, montant, description),
  getSoldeCaisse: () => ipcRenderer.invoke("getSoldeCaisse"),
  getHistoriqueCaisse: () => ipcRenderer.invoke("getHistoriqueCaisse"),
});
