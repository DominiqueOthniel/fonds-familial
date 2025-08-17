const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
	// Authentification
	login: (credentials: { email: string; password: string }) =>
		ipcRenderer.invoke("login", credentials),
	changePassword: (data: { requesterRole: string; targetRole: string; currentPassword: string; newPassword: string }) =>
		ipcRenderer.invoke("change-password", data),
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
	diagnostiquerMembre: (membreId: number) =>
		ipcRenderer.invoke("diagnostiquer-membre", membreId),

	// Mouvements
	getMouvements: (filters?: { year?: string; sessionId?: number }) =>
		ipcRenderer.invoke("get-mouvements", filters),
	ajouterMouvement: (mouvement: any) =>
		ipcRenderer.invoke("ajouter-mouvement", mouvement),
	modifierMouvement: (id: number, mouvement: any) =>
		ipcRenderer.invoke("modifier-mouvement", id, mouvement),
	supprimerMouvement: (id: number) =>
		ipcRenderer.invoke("supprimer-mouvement", id),
	onFondsUpdated: (
		callback: (data: { montant: number; type: string }) => void
	) =>
		ipcRenderer.on(
			"fonds-updated",
			(_e: any, data: { montant: number; type: string }) => callback(data)
		),
	onMouvementsUpdated: (
		callback: (data: { type: string; depenseId: number; depenseType: string }) => void
	) =>
		ipcRenderer.on(
			"mouvements-updated",
			(
				_e: any,
				data: { type: string; depenseId: number; depenseType: string }
			) => callback(data)
		),
	removeMouvementsUpdatedListener: (
		callback: (data: { type: string; depenseId: number; depenseType: string }) => void
	) => ipcRenderer.removeListener("mouvements-updated", callback),

	// Dépenses communes
	getDepensesCommunes: () => ipcRenderer.invoke("get-depenses-communes"),
	ajouterDepenseCommune: (d: {
		description: string;
		montant: number;
		categorie: string;
		typeContribution: "annuelle" | "ponctuel";
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
	accorderCredit: (data: {
		id_membre: number;
		montant: number;
		date_expiration: string;
		date_heure_echeance: string;
		heure_echeance: string;
	}) => ipcRenderer.invoke("accorder-credit", data),
	rembourserCredit: (creditId: number, montant: number) =>
		ipcRenderer.invoke("rembourser-credit", creditId, montant),
	supprimerCredit: (creditId: number) =>
		ipcRenderer.invoke("supprimer-credit", creditId),
	syncCreditsReste: () => ipcRenderer.invoke("sync-credits-reste"),
	onCreditDeleted: (callback: (creditId: number) => void) =>
		ipcRenderer.on("credit-deleted", (_e: any, creditId: number) =>
			callback(creditId)
		),
	removeCreditDeletedListener: (callback: (creditId: number) => void) =>
		ipcRenderer.removeListener("credit-deleted", callback),
	onCreditUpdated: (callback: (creditId: number) => void) =>
		ipcRenderer.on("credit-updated", (_e: any, creditId: number) =>
			callback(creditId)
		),
	removeCreditUpdatedListener: (callback: (creditId: number) => void) =>
		ipcRenderer.removeListener("credit-updated", callback),
	removeFondsUpdatedListener: (
		callback: (data: { montant: number; type: string }) => void
	) => ipcRenderer.removeListener("fonds-updated", callback),

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

	// Dons
	getDons: () => ipcRenderer.invoke("get-dons"),
	ajouterDon: (don: { membreId: number; institution: string; montant: number; categorie?: string }) => ipcRenderer.invoke("ajouter-don", don),
	supprimerDon: (donId: number) => ipcRenderer.invoke("supprimer-don", donId),

	// Cassation
	simulerCassation: () => ipcRenderer.invoke("simuler-cassation"),
	executerCassation: () => ipcRenderer.invoke("executer-cassation"),
	appliquerCassation: () => ipcRenderer.invoke("appliquer-cassation"),
	getEtatApresCassation: () => ipcRenderer.invoke("get-etat-apres-cassation"),
	preparerNouveauCycle: () => ipcRenderer.invoke("preparer-nouveau-cycle"),
	onCassationApplied: (
		callback: (data: { totalDistributed: number; membersCount: number }) => void
	) =>
		ipcRenderer.on(
			"cassation-applied",
			(_e: any, data: { totalDistributed: number; membersCount: number }) =>
				callback(data)
		),
	onNouveauCyclePrepared: (
		callback: (data: {
			membres: any[];
			statistiques: any;
			alertes: any[];
		}) => void
	) =>
		ipcRenderer.on(
			"nouveau-cycle-prepared",
			(
				_e: any,
				data: {
					membres: any[];
					statistiques: any;
					alertes: any[];
				}
			) => callback(data)
		),

	onSessionsUpdated: (callback: () => void) =>
		ipcRenderer.on("sessions-updated", () => callback()),
	removeSessionsUpdatedListener: (callback: () => void) =>
		ipcRenderer.removeListener("sessions-updated", callback),

	// Sessions
	getSessions: () => ipcRenderer.invoke("get-sessions"),
	creerSession: () => ipcRenderer.invoke("creer-session"),
	modifierNomSession: (sessionId: number, nouveauNom: string) =>
		ipcRenderer.invoke("modifier-nom-session", sessionId, nouveauNom),
	terminerSession: (sessionId: number) => ipcRenderer.invoke("terminer-session", sessionId),
	cassationSession: (sessionId: number) => ipcRenderer.invoke("cassation-session", sessionId),
	updateSessionEpargne: (membreId: number, montant: number) => 
		ipcRenderer.invoke("update-session-epargne", membreId, montant),
	updateSessionInterets: (membreId: number, montant: number) => 
		ipcRenderer.invoke("update-session-interets", membreId, montant),
	supprimerSession: (sessionId: number) => 
		ipcRenderer.invoke("supprimer-session", sessionId),
	supprimerMembreDom: () => ipcRenderer.invoke("supprimer-membre-dom"),

	// Export PDF
	exportMouvementsPdf: (sessionId?: number) => ipcRenderer.invoke("export-mouvements-pdf", sessionId),
	exportMembrePdf: (membreId: number) => ipcRenderer.invoke("export-membre-pdf", membreId),
	exportCassationPdf: () => ipcRenderer.invoke("export-cassation-pdf"),
});
