const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  login: (credentials) => ipcRenderer.invoke("login", credentials),
    invoke: (channel, data) => ipcRenderer.invoke(channel, data)
});

contextBridge.exposeInMainWorld("electronAPI", {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
});


contextBridge.exposeInMainWorld("apiMembres", {
  ajouterMembre: (nom, tel, prof, ville, dateNaissance, caution) =>
    ipcRenderer.invoke("ajouter-membre", nom, tel, prof, ville, dateNaissance, caution),
  getMembres: () => ipcRenderer.invoke("get-membres"),
  supprimerMembre: (id) => ipcRenderer.invoke("supprimer-membre", id),
    modifierMembre: (id, nom, tel, prof, ville, dateNaissance, caution) =>
    ipcRenderer.invoke("modifier-membre", id, nom, tel, prof, ville, dateNaissance, caution),
});


contextBridge.exposeInMainWorld("apiComptes", {
  getMouvements: () => ipcRenderer.invoke("get-mouvements"),
  ajouterMouvement: (mouvement) => ipcRenderer.invoke("ajouter-mouvement", mouvement),
  getSolde: (membreId, type) => ipcRenderer.invoke("get-solde", membreId, type),
  deposer: (membreId, type, montant) => ipcRenderer.invoke("deposer", membreId, type, montant),
  retirer: (membreId, type, montant) => ipcRenderer.invoke("retirer", membreId, type, montant),
  getCautionsParMembre: (idMembre) => ipcRenderer.invoke("get-cautions-par-membre", idMembre),
    getSoldes: () => ipcRenderer.invoke("get-soldes"), // AJOUTE ÇA
});


contextBridge.exposeInMainWorld("apiCredits", {
  // ... autres méthodes ...
  getCredits: () => ipcRenderer.invoke("get-credits"),
  getRemboursements: () => ipcRenderer.invoke("get-remboursements"),
  accorderCredit: (data) => ipcRenderer.invoke("accorder-credit", data),
  rembourserCredit: (data) => ipcRenderer.invoke("rembourser-credit", data),
});
