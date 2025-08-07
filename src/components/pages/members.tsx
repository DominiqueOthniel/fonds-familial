"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Users,
  Wallet,
  TrendingUp,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface Member {
  id: number;
  nom: string;
  telephone: string;
  ville: string;
  profession: string;
  dateAdhesion: string;
  caution: number;
  soldeEpargne?: number;
  totalCotisations?: number;
  creditActuel?: number;
}

interface Mouvement {
  id: number;
  type: string;
  montant: number;
  motif: string;
  date: string;
  membreNom: string;
}

export function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberHistory, setMemberHistory] = useState<Mouvement[]>([]);
  const [memberDetails, setMemberDetails] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [newMember, setNewMember] = useState({
    nom: "",
    telephone: "",
    ville: "",
    profession: "",
  });
  const [isMultiDeleteDialogOpen, setIsMultiDeleteDialogOpen] = useState(false);

  // Charger les membres depuis la base de données
  const loadMembers = async () => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        const data = await window.electronAPI.getMembres();
        setMembers(data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des membres:", error);
      toast.error("Erreur lors du chargement des membres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const filteredMembers = members.filter(
    (member) =>
      member.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.profession.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddMember = async () => {
    try {
      if (!window.electronAPI) {
        toast.error("API Electron non disponible");
        return;
      }

      const memberData = {
        ...newMember,
        dateAdhesion: new Date().toISOString().split("T")[0],
        caution: 30000,
      };

      const result = await window.electronAPI.ajouterMembre(memberData);

      if (result.success) {
        toast.success(`Membre ajouté avec succès: ${newMember.nom}`);
        setNewMember({
          nom: "",
          telephone: "",
          ville: "",
          profession: "",
        });
        setIsAddDialogOpen(false);
        loadMembers(); // Recharger les données
      } else {
        toast.error("Erreur lors de l'ajout du membre");
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout du membre:", error);
      toast.error("Erreur lors de l'ajout du membre");
    }
  };

  const handleEditMember = async () => {
    if (!selectedMember || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.modifierMembre(
        selectedMember.id,
        selectedMember
      );

      if (result.success) {
        toast.success(`Membre modifié avec succès: ${selectedMember.nom}`);
        setIsEditDialogOpen(false);
        setSelectedMember(null);
        loadMembers(); // Recharger les données
      } else {
        toast.error("Erreur lors de la modification du membre");
      }
    } catch (error) {
      console.error("Erreur lors de la modification du membre:", error);
      toast.error("Erreur lors de la modification du membre");
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.supprimerMembre(
        selectedMember.id
      );

      if (result.success) {
        toast.success(`Membre supprimé avec succès: ${selectedMember.nom}`);
        setIsDeleteDialogOpen(false);
        setSelectedMember(null);
        loadMembers(); // Recharger les données
      } else {
        toast.error(
          result.message || "Erreur lors de la suppression du membre"
        );
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du membre:", error);
      toast.error("Erreur lors de la suppression du membre");
    }
  };

  const openEditDialog = (member: Member) => {
    setSelectedMember({ ...member });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (member: Member) => {
    setSelectedMember(member);
    setIsDeleteDialogOpen(true);
  };

  const openHistoryDialog = async (member: Member) => {
    setSelectedMember(member);
    setIsHistoryDialogOpen(true);
    setLoadingHistory(true);

    try {
      if (window.electronAPI) {
        const history = await window.electronAPI.getHistoriqueMembre(member.id);
        setMemberHistory(history);
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique:", error);
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoadingHistory(false);
    }
  };

  const openDetailsDialog = async (member: Member) => {
    setSelectedMember(member);
    setIsDetailsDialogOpen(true);
    setLoadingDetails(true);

    try {
      if (window.electronAPI) {
        const details = await window.electronAPI.getDetailsMembre(member.id);
        setMemberDetails(details);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des détails:", error);
      toast.error("Erreur lors du chargement des détails");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Gestion des cases à cocher
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMembers(filteredMembers.map((member) => member.id));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleSelectMember = (memberId: number, checked: boolean) => {
    if (checked) {
      setSelectedMembers((prev) => [...prev, memberId]);
    } else {
      setSelectedMembers((prev) => prev.filter((id) => id !== memberId));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMembers.length === 0) return;

    try {
      if (!window.electronAPI) {
        toast.error("API Electron non disponible");
        return;
      }

      // Supprimer les membres sélectionnés
      for (const memberId of selectedMembers) {
        const result = await window.electronAPI.supprimerMembre(memberId);
        if (!result.success) {
          toast.error(`Erreur lors de la suppression du membre ${memberId}`);
          return;
        }
      }

      toast.success(
        `${selectedMembers.length} membre(s) supprimé(s) avec succès`
      );
      setSelectedMembers([]);
      loadMembers();
    } catch (error) {
      console.error("Erreur lors de la suppression des membres:", error);
      toast.error("Erreur lors de la suppression des membres");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement des membres...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Gestion des Membres
          </h1>
          <p className="text-slate-600 mt-2">
            Gérez les membres de votre fonds familial
          </p>
        </div>

        <div className="flex gap-3">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Membre
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter un nouveau membre</DialogTitle>
                <DialogDescription>
                  Remplissez les informations du nouveau membre à ajouter au
                  fonds familial.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nom">Nom complet</Label>
                  <Input
                    id="nom"
                    value={newMember.nom}
                    onChange={(e) =>
                      setNewMember({ ...newMember, nom: e.target.value })
                    }
                    placeholder="Nom et prénom"
                  />
                </div>
                <div>
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    value={newMember.telephone}
                    onChange={(e) =>
                      setNewMember({ ...newMember, telephone: e.target.value })
                    }
                    placeholder="06 12 34 56 78"
                  />
                </div>
                <div>
                  <Label htmlFor="ville">Ville</Label>
                  <Input
                    id="ville"
                    value={newMember.ville}
                    onChange={(e) =>
                      setNewMember({ ...newMember, ville: e.target.value })
                    }
                    placeholder="Ville de résidence"
                  />
                </div>
                <div>
                  <Label htmlFor="profession">Profession</Label>
                  <Input
                    id="profession"
                    value={newMember.profession}
                    onChange={(e) =>
                      setNewMember({ ...newMember, profession: e.target.value })
                    }
                    placeholder="Profession"
                  />
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Date d'adhésion :</strong>{" "}
                    {new Date().toLocaleDateString("fr-FR")}
                    <br />
                    <strong>Caution :</strong> 30,000 FCFA (fixe)
                  </p>
                </div>
                <Button
                  onClick={handleAddMember}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Ajouter le membre
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Membres
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {members.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Cautions
            </CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {members
                .reduce((sum, m) => sum + (m.caution || 0), 0)
                .toLocaleString()}{" "}
              FCFA
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Caution Moyenne
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {members.length > 0
                ? Math.round(
                    members.reduce((sum, m) => sum + (m.caution || 0), 0) /
                      members.length
                  ).toLocaleString()
                : 0}{" "}
              FCFA
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des membres */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Liste des Membres ({members.length})</CardTitle>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher un membre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              {selectedMembers.length > 0 && (
                <>
                  <Button
                    onClick={() => setIsMultiDeleteDialogOpen(true)}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer ({selectedMembers.length})
                  </Button>
                  <Dialog
                    open={isMultiDeleteDialogOpen}
                    onOpenChange={setIsMultiDeleteDialogOpen}
                  >
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="h-5 w-5" />
                          Confirmer la suppression
                        </DialogTitle>
                        <DialogDescription>
                          Cette action est irréversible. Tous les membres
                          sélectionnés et leurs données associées seront
                          supprimés définitivement.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p>
                          Êtes-vous sûr de vouloir supprimer{" "}
                          <strong>{selectedMembers.length}</strong> membres ?
                        </p>
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                          <h4 className="font-semibold text-red-800 mb-2">
                            ⚠️ Attention : Suppression en cascade
                          </h4>
                          <ul className="text-sm text-red-700 space-y-1">
                            <li>
                              • Toutes les épargnes et mouvements des membres
                              seront supprimés
                            </li>
                            <li>
                              • Tous les crédits et remboursements associés
                              seront effacés
                            </li>
                            <li>
                              • L'historique complet des transactions sera perdu
                            </li>
                            <li>
                              • Cette action est irréversible et définitive
                            </li>
                          </ul>
                          <p className="text-xs text-red-600 mt-2 font-medium">
                            La suppression respecte les contraintes de la base
                            de données et supprime automatiquement toutes les
                            données liées.
                          </p>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsMultiDeleteDialogOpen(false)}
                          >
                            Annuler
                          </Button>
                          <Button
                            onClick={async () => {
                              setIsMultiDeleteDialogOpen(false);
                              await handleDeleteSelected();
                            }}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Supprimer définitivement
                          </Button>
                        </DialogFooter>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 && searchTerm ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun membre trouvé</p>
              <p className="text-sm">
                Aucun membre ne correspond à votre recherche "{searchTerm}"
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedMembers.length === filteredMembers.length &&
                        filteredMembers.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Profession</TableHead>
                  <TableHead>Date d'adhésion</TableHead>
                  <TableHead>Solde Épargne</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="w-12">
                      <Checkbox
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={(checked) =>
                          handleSelectMember(member.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">{member.nom}</TableCell>
                    <TableCell>{member.telephone}</TableCell>
                    <TableCell>{member.ville}</TableCell>
                    <TableCell>{member.profession}</TableCell>
                    <TableCell>
                      {new Date(member.dateAdhesion).toLocaleDateString(
                        "fr-FR"
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {(member.soldeEpargne || 0).toLocaleString()} FCFA
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openDetailsDialog(member)}
                          >
                            <svg
                              className="mr-2 h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Détails
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openHistoryDialog(member)}
                          >
                            <History className="mr-2 h-4 w-4" />
                            Historique
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openEditDialog(member)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(member)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de modification */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le membre</DialogTitle>
            <DialogDescription>
              Modifiez les informations du membre sélectionné.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-nom">Nom complet</Label>
                <Input
                  id="edit-nom"
                  value={selectedMember.nom}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      nom: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-telephone">Téléphone</Label>
                <Input
                  id="edit-telephone"
                  value={selectedMember.telephone}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      telephone: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-ville">Ville</Label>
                <Input
                  id="edit-ville"
                  value={selectedMember.ville}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      ville: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-profession">Profession</Label>
                <Input
                  id="edit-profession"
                  value={selectedMember.profession}
                  onChange={(e) =>
                    setSelectedMember({
                      ...selectedMember,
                      profession: e.target.value,
                    })
                  }
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleEditMember}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Sauvegarder
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Toutes les données du membre seront
              supprimées définitivement.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <p>
                Êtes-vous sûr de vouloir supprimer{" "}
                <strong>{selectedMember.nom}</strong> ?
              </p>

              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-800 mb-2">
                  ⚠️ Attention : Suppression en cascade
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>
                    • Toutes les épargnes et mouvements du membre seront
                    supprimés
                  </li>
                  <li>
                    • Tous les crédits et remboursements associés seront effacés
                  </li>
                  <li>• L'historique complet des transactions sera perdu</li>
                  <li>• Cette action est irréversible et définitive</li>
                </ul>
                <p className="text-xs text-red-600 mt-2 font-medium">
                  La suppression respecte les contraintes de la base de données
                  et supprime automatiquement toutes les données liées.
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleDeleteMember}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Supprimer définitivement
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog d'historique */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique de {selectedMember?.nom}
            </DialogTitle>
            <DialogDescription>
              Tous les mouvements financiers de ce membre
            </DialogDescription>
          </DialogHeader>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Chargement de l'historique...</span>
              </div>
            </div>
          ) : memberHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun mouvement</p>
              <p className="text-sm">
                Ce membre n'a pas encore effectué de transactions
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600">Total Épargne</p>
                  <p className="text-lg font-bold text-green-600">
                    {memberHistory
                      .filter((m) => m.type === "épargne")
                      .reduce((sum, m) => sum + m.montant, 0)
                      .toLocaleString()}{" "}
                    FCFA
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Cotisations</p>
                  <p className="text-lg font-bold text-blue-600">
                    {memberHistory
                      .filter((m) => m.type === "cotisation")
                      .reduce((sum, m) => sum + m.montant, 0)
                      .toLocaleString()}{" "}
                    FCFA
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Dépenses</p>
                  <p className="text-lg font-bold text-red-600">
                    {memberHistory
                      .filter((m) => m.type === "depense")
                      .reduce((sum, m) => sum + Math.abs(m.montant), 0)
                      .toLocaleString()}{" "}
                    FCFA
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Crédits</p>
                  <p className="text-lg font-bold text-orange-600">
                    {memberHistory
                      .filter((m) => m.type === "crédit")
                      .reduce((sum, m) => sum + m.montant, 0)
                      .toLocaleString()}{" "}
                    FCFA
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Nombre de Mouvements</p>
                  <p className="text-lg font-bold text-slate-900">
                    {memberHistory.length}
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Motif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberHistory.map((mouvement) => (
                    <TableRow key={mouvement.id}>
                      <TableCell>
                        {new Date(mouvement.date).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            mouvement.type === "epargne"
                              ? "bg-emerald-100 text-emerald-800"
                              : mouvement.type === "cotisation_annuelle"
                              ? "bg-green-100 text-green-800"
                              : mouvement.type === "versement_ponctuel"
                              ? "bg-blue-100 text-blue-800"
                              : mouvement.type === "depense_commune_epargne"
                              ? "bg-red-100 text-red-800"
                              : mouvement.type === "credit"
                              ? "bg-orange-100 text-orange-800"
                              : mouvement.type === "remboursement"
                              ? "bg-purple-100 text-purple-800"
                              : mouvement.type === "interet"
                              ? "bg-pink-100 text-pink-800"
                              : mouvement.type === "depot_caution"
                              ? "bg-yellow-100 text-yellow-800"
                              : mouvement.type === "restitution_caution"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {mouvement.type === "epargne"
                            ? "Épargne"
                            : mouvement.type === "cotisation_annuelle"
                            ? "Cotisation Annuelle"
                            : mouvement.type === "versement_ponctuel"
                            ? "Versement Ponctuel"
                            : mouvement.type === "depense_commune_epargne"
                            ? "Dépense Épargne"
                            : mouvement.type === "credit"
                            ? "Crédit"
                            : mouvement.type === "remboursement"
                            ? "Remboursement"
                            : mouvement.type === "interet"
                            ? "Intérêt"
                            : mouvement.type === "depot_caution"
                            ? "Dépôt Caution"
                            : mouvement.type === "restitution_caution"
                            ? "Restitution Caution"
                            : mouvement.type}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`font-medium ${
                          mouvement.type === "epargne" ||
                          mouvement.type === "cotisation_annuelle" ||
                          mouvement.type === "versement_ponctuel" ||
                          mouvement.type === "remboursement" ||
                          mouvement.type === "interet" ||
                          mouvement.type === "restitution_caution"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {mouvement.type === "epargne" ||
                        mouvement.type === "cotisation_annuelle" ||
                        mouvement.type === "versement_ponctuel" ||
                        mouvement.type === "remboursement" ||
                        mouvement.type === "interet" ||
                        mouvement.type === "restitution_caution"
                          ? "+"
                          : "-"}
                        {Math.abs(mouvement.montant).toLocaleString()} FCFA
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {mouvement.motif}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de détails */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Détails de {selectedMember?.nom}
            </DialogTitle>
            <DialogDescription>
              Informations complètes et statistiques du membre
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Chargement des détails...</span>
              </div>
            </div>
          ) : memberDetails ? (
            <div className="space-y-6">
              {/* Informations personnelles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">
                    Informations Personnelles
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Nom complet :</span>
                      <span className="font-medium">
                        {memberDetails.membre.nom}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Téléphone :</span>
                      <span className="font-medium">
                        {memberDetails.membre.telephone}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Ville :</span>
                      <span className="font-medium">
                        {memberDetails.membre.ville}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Profession :</span>
                      <span className="font-medium">
                        {memberDetails.membre.profession}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Date d'adhésion :</span>
                      <span className="font-medium">
                        {new Date(
                          memberDetails.membre.dateAdhesion
                        ).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Caution :</span>
                      <span className="font-medium text-blue-600">
                        {memberDetails.membre.caution.toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">
                    Statistiques Financières
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Solde Épargne :</span>
                      <span className="font-medium text-green-600">
                        {memberDetails.soldeEpargne.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Total Cotisations :
                      </span>
                      <span className="font-medium text-blue-600">
                        {memberDetails.totalCotisations.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Dépenses :</span>
                      <span className="font-medium text-red-600">
                        {memberDetails.totalDepenses.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Crédit Actuel :</span>
                      <span className="font-medium text-orange-600">
                        {memberDetails.creditActuel.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Nombre de Mouvements :
                      </span>
                      <span className="font-medium text-slate-900">
                        {memberDetails.nbMouvements}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Solde personnel */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-slate-900 mb-2">
                  Solde Personnel
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-slate-700 mb-2">
                      Entrées Personnelles
                    </h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Dépôts épargne :</span>
                        <span className="font-medium text-green-600">
                          {memberDetails.soldeEpargne.toLocaleString()} FCFA
                        </span>
                      </div>
                      <div className="pt-1 border-t border-slate-200">
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-700">
                            Total Entrées :
                          </span>
                          <span className="text-green-600">
                            {memberDetails.soldeEpargne.toLocaleString()} FCFA
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-slate-700 mb-2">
                      Sorties Personnelles
                    </h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">
                          Crédits accordés :
                        </span>
                        <span className="font-medium text-orange-600">
                          {memberDetails.creditActuel.toLocaleString()} FCFA
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">
                          Cotisations et versements :
                        </span>
                        <span className="font-medium text-blue-600">
                          {memberDetails.totalCotisations.toLocaleString()} FCFA
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">
                          Dépenses communes :
                        </span>
                        <span className="font-medium text-red-600">
                          {memberDetails.totalDepenses.toLocaleString()} FCFA
                        </span>
                      </div>
                      <div className="pt-1 border-t border-slate-200">
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-700">
                            Total Sorties :
                          </span>
                          <span className="text-red-600">
                            {(
                              memberDetails.creditActuel +
                              memberDetails.totalCotisations +
                              memberDetails.totalDepenses
                            ).toLocaleString()}{" "}
                            FCFA
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-slate-900">
                      Solde Personnel
                    </span>
                    <span
                      className={`text-2xl font-bold ${
                        memberDetails.soldeEpargne -
                          memberDetails.creditActuel -
                          memberDetails.totalCotisations -
                          memberDetails.totalDepenses >=
                        0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {(
                        memberDetails.soldeEpargne -
                        memberDetails.creditActuel -
                        memberDetails.totalCotisations -
                        memberDetails.totalDepenses
                      ).toLocaleString()}{" "}
                      FCFA
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Calculé selon : Épargne - Crédits - Cotisations - Dépenses
                  </p>
                </div>
              </div>

              {/* Résumé financier */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-slate-900 mb-2">
                  Résumé Financier
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-slate-600">Solde Net</p>
                    <p className="text-lg font-bold text-green-600">
                      {(
                        memberDetails.soldeEpargne +
                        memberDetails.totalCotisations -
                        memberDetails.creditActuel -
                        memberDetails.totalDepenses
                      ).toLocaleString()}{" "}
                      FCFA
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-600">Total Entrées</p>
                    <p className="text-lg font-bold text-blue-600">
                      {(
                        memberDetails.soldeEpargne +
                        memberDetails.totalCotisations
                      ).toLocaleString()}{" "}
                      FCFA
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-600">Total Sorties</p>
                    <p className="text-lg font-bold text-red-600">
                      {(
                        memberDetails.creditActuel + memberDetails.totalDepenses
                      ).toLocaleString()}{" "}
                      FCFA
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p className="text-lg font-medium">
                Aucune information disponible
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
