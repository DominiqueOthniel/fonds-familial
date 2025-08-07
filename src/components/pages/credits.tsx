"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Banknote,
  TrendingUp,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import "../../types/electron-api.d.ts"; // Import des types Electron API

interface Credit {
  id: number;
  id_membre: number;
  nom: string;
  montant_initial: number;
  montant_a_rembourser: number;
  reste: number;
  date_accord: string;
  date_expiration: string;
  statut: "actif" | "remboursé" | "en_retard";
}

interface Member {
  id: number;
  nom: string;
  telephone: string;
  ville: string;
  profession: string;
  dateAdhesion: string;
  caution: number;
}

export function Credits() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCredits, setSelectedCredits] = useState<number[]>([]);
  const [isMultiDeleteDialogOpen, setIsMultiDeleteDialogOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRepaymentDialogOpen, setIsRepaymentDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState(0);
  const [newCredit, setNewCredit] = useState({
    memberId: 0,
    montant: 0,
  });

  // Charger les données depuis la base de données
  const loadData = async () => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        const [creditsData, membersData] = await Promise.all([
          window.electronAPI.getCredits(),
          window.electronAPI.getMembres(),
        ]);
        setCredits(creditsData);
        setMembers(membersData);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCredits = credits.filter((credit) => {
    const matchesSearch = credit.nom
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || credit.statut === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Gestion des cases à cocher
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCredits(filteredCredits.map((credit) => credit.id));
    } else {
      setSelectedCredits([]);
    }
  };

  const handleSelectCredit = (creditId: number, checked: boolean) => {
    if (checked) {
      setSelectedCredits((prev) => [...prev, creditId]);
    } else {
      setSelectedCredits((prev) => prev.filter((id) => id !== creditId));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCredits.length === 0) return;

    try {
      if (!window.electronAPI) {
        toast.error("API Electron non disponible");
        return;
      }

      // Supprimer les crédits sélectionnés
      for (const creditId of selectedCredits) {
        const result = await window.electronAPI.supprimerCredit(creditId);
        if (!result.success) {
          toast.error(`Erreur lors de la suppression du crédit ${creditId}`);
          return;
        }
      }

      toast.success(
        `${selectedCredits.length} crédit(s) supprimé(s) avec succès`
      );
      setSelectedCredits([]);
      loadData();
    } catch (error) {
      console.error("Erreur lors de la suppression des crédits:", error);
      toast.error("Erreur lors de la suppression des crédits");
    }
  };

  // Fonction pour calculer la date d'échéance (31 août suivant)
  const calculateDueDate = (startDate: Date) => {
    const year = startDate.getFullYear();
    const augustDeadline = new Date(year, 7, 31); // 31 août de l'année courante

    // Si on est après le 31 août, prendre le 31 août de l'année suivante
    if (startDate > augustDeadline) {
      return new Date(year + 1, 7, 31);
    }
    return augustDeadline;
  };

  const handleAddCredit = async () => {
    try {
      if (!window.electronAPI) {
        toast.error("API Electron non disponible");
        return;
      }

      const selectedMember = members.find((m) => m.id === newCredit.memberId);
      if (!selectedMember) {
        toast.error("Veuillez sélectionner un membre");
        return;
      }

      const dateEcheance = calculateDueDate(new Date());
      const creditData = {
        id_membre: newCredit.memberId,
        montant: newCredit.montant,
        date_expiration: dateEcheance.toISOString().split("T")[0],
      };

      const result = await window.electronAPI.accorderCredit(creditData);

      if (result.success) {
        toast.success(
          `Crédit de ${newCredit.montant.toLocaleString()} FCFA accordé à ${
            selectedMember.nom
          }.`
        );
        setNewCredit({
          memberId: 0,
          montant: 0,
        });
        setIsAddDialogOpen(false);
        loadData(); // Recharger les données
      } else {
        toast.error(result.message || "Erreur lors de l'octroi du crédit");
      }
    } catch (error) {
      console.error("Erreur lors de l'octroi du crédit:", error);
      toast.error("Une erreur est survenue lors de l'octroi du crédit.");
    }
  };

  const handleRepayment = (credit: Credit) => {
    setSelectedCredit(credit);
    setRepaymentAmount(0);
    setIsRepaymentDialogOpen(true);
  };

  const rembourserCredit = async (creditId: number, montant: number) => {
    try {
      if (!window.electronAPI) {
        toast.error("API Electron non disponible");
        return;
      }

      const result = await window.electronAPI.rembourserCredit(
        creditId,
        montant
      );

      if (result.success) {
        toast.success(
          `Remboursement de ${montant.toLocaleString()} FCFA enregistré avec succès.`
        );
        loadData(); // Recharger les données
      } else {
        toast.error(result.message || "Erreur lors du remboursement");
      }
    } catch (error) {
      console.error("Erreur lors du remboursement:", error);
      toast.error(
        "Une erreur est survenue lors de l'enregistrement du remboursement."
      );
    }
  };

  const handleValidateRepayment = () => {
    if (selectedCredit && repaymentAmount > 0) {
      const montantRestant = selectedCredit.reste;
      const montantAValider = Math.min(repaymentAmount, montantRestant);

      rembourserCredit(selectedCredit.id, montantAValider);
      setIsRepaymentDialogOpen(false);
      setSelectedCredit(null);
      setRepaymentAmount(0);
    }
  };

  const handleDeleteCredit = async () => {
    if (!selectedCredit || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.supprimerCredit(
        selectedCredit.id
      );

      if (result.success) {
        toast.success(`Le crédit de ${selectedCredit.nom} a été supprimé.`);
        setIsDeleteDialogOpen(false);
        setSelectedCredit(null);
        loadData(); // Recharger les données
      } else {
        toast.error(
          result.message || "Erreur lors de la suppression du crédit"
        );
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du crédit:", error);
      toast.error("Une erreur est survenue lors de la suppression du crédit.");
    }
  };

  const openDetailsDialog = (credit: Credit) => {
    setSelectedCredit(credit);
    setIsDetailsDialogOpen(true);
  };

  const openDeleteDialog = (credit: Credit) => {
    setSelectedCredit(credit);
    setIsDeleteDialogOpen(true);
  };

  const getProgressPercentage = (credit: Credit) => {
    const totalRembourse = credit.montant_a_rembourser - credit.reste;
    return (totalRembourse / credit.montant_a_rembourser) * 100;
  };

  const activeCredits = credits.filter((c) => c.statut === "actif");
  const completedCredits = credits.filter((c) => c.statut === "remboursé");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement des crédits...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Gestion des Crédits
          </h1>
          <p className="text-slate-600 mt-2">
            Gérez les prêts accordés aux membres
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Crédit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Accorder un nouveau crédit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="member">Membre</Label>
                  <Select
                    onValueChange={(value: string) =>
                      setNewCredit({ ...newCredit, memberId: Number(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un membre" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem
                          key={member.id}
                          value={member.id.toString()}
                        >
                          {member.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="montant">Montant du crédit (FCFA)</Label>
                  <Input
                    id="montant"
                    type="number"
                    value={newCredit.montant}
                    onChange={(e) =>
                      setNewCredit({
                        ...newCredit,
                        montant: Number(e.target.value),
                      })
                    }
                    placeholder="2000000"
                  />
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Intérêt fixe :</strong> 20%
                    <br />
                    <strong>Montant total à rembourser :</strong>{" "}
                    {(newCredit.montant * 1.2).toLocaleString()} FCFA
                    <br />
                    <strong>Date d'échéance :</strong> 31 août{" "}
                    {calculateDueDate(new Date()).getFullYear()}
                  </p>
                </div>
                <Button
                  onClick={handleAddCredit}
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={!newCredit.memberId || !newCredit.montant}
                >
                  Accorder le crédit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Crédits Actifs
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {activeCredits.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Crédits Terminés
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedCredits.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Montant Total Prêté
            </CardTitle>
            <Banknote className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {credits
                .reduce((sum, c) => sum + c.montant_initial, 0)
                .toLocaleString()}{" "}
              FCFA
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Intérêts Générés
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {credits
                .reduce(
                  (sum, c) =>
                    sum + (c.montant_a_rembourser - c.montant_initial),
                  0
                )
                .toLocaleString()}{" "}
              FCFA
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Crédits en Cours ({filteredCredits.length})</CardTitle>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher un crédit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="remboursé">Remboursé</SelectItem>
                </SelectContent>
              </Select>
              {selectedCredits.length > 0 && (
                <>
                  <Button
                    onClick={() => setIsMultiDeleteDialogOpen(true)}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer ({selectedCredits.length})
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
                          Cette action est irréversible. Tous les crédits
                          sélectionnés seront supprimés définitivement.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p>
                          Êtes-vous sûr de vouloir supprimer{" "}
                          <strong>{selectedCredits.length}</strong> crédits ?
                        </p>
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                          <h4 className="font-semibold text-red-800 mb-2">
                            ⚠️ Attention
                          </h4>
                          <ul className="text-sm text-red-700 space-y-1">
                            <li>
                              • Les crédits sélectionnés seront supprimés
                              définitivement
                            </li>
                            <li>
                              • Cette action est irréversible et définitive
                            </li>
                          </ul>
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
          {filteredCredits.length === 0 &&
          (searchTerm || statusFilter !== "all") ? (
            <div className="text-center py-8 text-slate-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun crédit trouvé</p>
              <p className="text-sm">
                Aucun crédit ne correspond à vos critères de recherche
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedCredits.length === filteredCredits.length &&
                          filteredCredits.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Membre</TableHead>
                    <TableHead>Date de crédit</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Progression</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCredits.map((credit) => (
                    <TableRow key={credit.id}>
                      <TableCell className="w-12">
                        <Checkbox
                          checked={selectedCredits.includes(credit.id)}
                          onCheckedChange={(checked) =>
                            handleSelectCredit(credit.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {credit.nom}
                      </TableCell>
                      <TableCell>
                        {new Date(credit.date_accord).toLocaleDateString(
                          "fr-FR"
                        )}
                      </TableCell>
                      <TableCell>
                        {credit.montant_initial.toLocaleString()} FCFA
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress
                            value={getProgressPercentage(credit)}
                            className="w-20"
                          />
                          <span className="text-xs text-slate-500">
                            {Math.round(getProgressPercentage(credit))}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            credit.statut === "actif"
                              ? "destructive"
                              : "default"
                          }
                        >
                          {credit.statut === "actif" ? (
                            <>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Actif
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Remboursé
                            </>
                          )}
                        </Badge>
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
                              onClick={() => openDetailsDialog(credit)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Détails
                            </DropdownMenuItem>
                            {credit.statut === "actif" && (
                              <DropdownMenuItem
                                onClick={() => handleRepayment(credit)}
                              >
                                <CreditCard className="mr-2 h-4 w-4" />
                                Rembourser
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(credit)}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modale de détails */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détails du crédit</DialogTitle>
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2">
                    Informations générales
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Membre :</span>
                      <span className="font-medium">{selectedCredit.nom}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Date de crédit :</span>
                      <span className="font-medium">
                        {new Date(
                          selectedCredit.date_accord
                        ).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Date d'échéance :</span>
                      <span className="font-medium">
                        {new Date(
                          selectedCredit.date_expiration
                        ).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Taux d'intérêt :</span>
                      <span className="font-medium">
                        {/* selectedCredit.interet is not a property of Credit */}
                        {/* Assuming a default or placeholder value if not available */}
                        20%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2">
                    Montants
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Montant initial :</span>
                      <span className="font-medium">
                        {selectedCredit.montant_initial.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Intérêts :</span>
                      <span className="font-medium">
                        {(
                          selectedCredit.montant_a_rembourser -
                          selectedCredit.montant_initial
                        ).toLocaleString()}{" "}
                        FCFA
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-slate-600 font-medium">
                        Total à rembourser :
                      </span>
                      <span className="font-bold">
                        {selectedCredit.montant_a_rembourser.toLocaleString()}{" "}
                        FCFA
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Progression du remboursement
                </h3>
                <div className="space-y-3">
                  <Progress
                    value={getProgressPercentage(selectedCredit)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">
                      Remboursé :{" "}
                      {(
                        selectedCredit.montant_a_rembourser -
                        selectedCredit.reste
                      ).toLocaleString()}{" "}
                      FCFA
                    </span>
                    <span className="text-red-600 font-medium">
                      Restant : {selectedCredit.reste.toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-slate-900">
                      {Math.round(getProgressPercentage(selectedCredit))}%
                      remboursé
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsDialogOpen(false)}
                >
                  Fermer
                </Button>
                {selectedCredit.statut === "actif" && (
                  <Button
                    onClick={() => {
                      setIsDetailsDialogOpen(false);
                      handleRepayment(selectedCredit);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Rembourser
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modale de remboursement */}
      <Dialog
        open={isRepaymentDialogOpen}
        onOpenChange={setIsRepaymentDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remboursement de crédit</DialogTitle>
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Détails du crédit
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Membre :</span>
                    <span className="font-medium">{selectedCredit.nom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Montant total :</span>
                    <span className="font-medium">
                      {selectedCredit.montant_a_rembourser.toLocaleString()}{" "}
                      FCFA
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Déjà remboursé :</span>
                    <span className="font-medium text-green-600">
                      {(
                        selectedCredit.montant_a_rembourser -
                        selectedCredit.reste
                      ).toLocaleString()}{" "}
                      FCFA
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-slate-600 font-medium">
                      Montant restant :
                    </span>
                    <span className="font-bold text-red-600">
                      {selectedCredit.reste.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="repaymentAmount">
                  Montant à rembourser (FCFA)
                </Label>
                <Input
                  id="repaymentAmount"
                  type="number"
                  value={repaymentAmount}
                  onChange={(e) => setRepaymentAmount(Number(e.target.value))}
                  placeholder="Saisir le montant"
                  max={selectedCredit.reste}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Maximum : {selectedCredit.reste.toLocaleString()} FCFA
                </p>
              </div>

              {repaymentAmount > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Nouveau solde après remboursement :</strong>
                    <br />
                    Remboursé :{" "}
                    {(
                      selectedCredit.montant_a_rembourser -
                      selectedCredit.reste +
                      repaymentAmount
                    ).toLocaleString()}{" "}
                    FCFA
                    <br />
                    Restant :{" "}
                    {(
                      selectedCredit.reste - repaymentAmount
                    ).toLocaleString()}{" "}
                    FCFA
                    <br />
                    Progression :{" "}
                    {Math.round(
                      ((selectedCredit.montant_a_rembourser -
                        selectedCredit.reste +
                        repaymentAmount) /
                        selectedCredit.montant_a_rembourser) *
                        100
                    )}
                    %
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsRepaymentDialogOpen(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleValidateRepayment}
                  disabled={
                    repaymentAmount <= 0 ||
                    repaymentAmount > selectedCredit.reste
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Valider le remboursement
                </Button>
              </div>
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
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-4">
              <p>Êtes-vous sûr de vouloir supprimer ce crédit ?</p>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm">
                  <strong>Membre :</strong> {selectedCredit.nom}
                  <br />
                  <strong>Montant :</strong>{" "}
                  {selectedCredit.montant_initial.toLocaleString()} FCFA
                  <br />
                  <strong>Statut :</strong> {selectedCredit.statut}
                </p>
              </div>

              {selectedCredit.statut === "actif" && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-800 mb-2">
                    Attention :
                  </h4>
                  <p className="text-sm text-red-700">
                    Ce crédit est encore actif. Sa suppression annulera
                    définitivement le prêt et les remboursements déjà effectués.
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleDeleteCredit}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Supprimer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
