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
import {
  Plus,
  Search,
  TrendingUp,
  Users,
  Calculator,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useRole } from "../../hooks/useRole";

interface Transaction {
  id: number;
  membreId: number;
  membreNom: string;
  type: string;
  montant: number;
  motif: string;
  date: string;
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

export function Epargnes() {
  const { role } = useRole();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>(
    []
  );
  const [newTransaction, setNewTransaction] = useState({
    membreId: 0,
    montant: 0,
    montantStr: "",
    motif: "",
  });

  // Charger les données depuis la base de données
  const loadData = async () => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        const [transactionsData, membersData] = await Promise.all([
          window.electronAPI.getMouvements(),
          window.electronAPI.getMembres(),
        ]);
        setTransactions(transactionsData);
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

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      (transaction.membreNom?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (transaction.motif?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      );
    // Only show actual savings (epargne type), not contributions or expense savings
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    const isEpargne = transaction.type === "epargne";
    return matchesSearch && matchesType && isEpargne;
  });

  const handleAddTransaction = async () => {
    try {
      if (!window.electronAPI) {
        toast.error("API Electron non disponible");
        return;
      }

      const selectedMember = members.find(
        (m) => m.id === newTransaction.membreId
      );
      if (!selectedMember) {
        toast.error("Veuillez sélectionner un membre");
        return;
      }

      const mouvementData = {
        membreId: newTransaction.membreId,
        type: "epargne" as const, // Nouveau type pour épargne personnelle avec intérêts
        montant: newTransaction.montant,
        motif: newTransaction.motif,
      };

      const result = await window.electronAPI.ajouterMouvement(mouvementData);

      if (result.success) {
        toast.success(
          `Épargne de ${newTransaction.montant.toLocaleString()} FCFA enregistrée pour ${
            selectedMember.nom
          }.`
        );
        setNewTransaction({
          membreId: 0,
          montant: 0,
          montantStr: "",
          motif: "",
        });
        setIsAddDialogOpen(false);
        loadData(); // Recharger les données
      } else {
        toast.error("Erreur lors de l'ajout du mouvement");
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout du mouvement:", error);
      toast.error(
        "Une erreur est survenue lors de l'enregistrement du mouvement."
      );
    }
  };

  const handleEditTransaction = async () => {
    if (!selectedTransaction || !window.electronAPI) return;

    try {
      const mouvementData = {
        montant: selectedTransaction.montant,
        motif: selectedTransaction.motif,
      };

      const result = await window.electronAPI.modifierMouvement(
        selectedTransaction.id,
        mouvementData
      );

      if (result.success) {
        toast.success("Mouvement modifié avec succès");
        setIsEditDialogOpen(false);
        setSelectedTransaction(null);
        loadData(); // Recharger les données
      } else {
        toast.error("Erreur lors de la modification du mouvement");
      }
    } catch (error) {
      console.error("Erreur lors de la modification du mouvement:", error);
      toast.error(
        "Une erreur est survenue lors de la modification du mouvement."
      );
    }
  };

  const handleDeleteTransaction = async () => {
    if (!selectedTransaction || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.supprimerMouvement(
        selectedTransaction.id
      );

      if (result.success) {
        toast.success("Mouvement supprimé avec succès");
        setIsDeleteDialogOpen(false);
        setSelectedTransaction(null);
        loadData(); // Recharger les données
      } else {
        toast.error("Erreur lors de la suppression du mouvement");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du mouvement:", error);
      toast.error(
        "Une erreur est survenue lors de la suppression du mouvement."
      );
    }
  };

  const openEditDialog = (transaction: Transaction) => {
    setSelectedTransaction({ ...transaction });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };

  // Gestion des cases à cocher
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(
        filteredTransactions.map((transaction) => transaction.id)
      );
    } else {
      setSelectedTransactions([]);
    }
  };

  const handleSelectTransaction = (transactionId: number, checked: boolean) => {
    if (checked) {
      setSelectedTransactions((prev) => [...prev, transactionId]);
    } else {
      setSelectedTransactions((prev) =>
        prev.filter((id) => id !== transactionId)
      );
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedTransactions.length === 0) return;

    try {
      if (!window.electronAPI) {
        toast.error("API Electron non disponible");
        return;
      }

      // Supprimer les transactions sélectionnées
      for (const transactionId of selectedTransactions) {
        const result = await window.electronAPI.supprimerMouvement(
          transactionId
        );
        if (!result.success) {
          toast.error(
            `Erreur lors de la suppression du mouvement ${transactionId}`
          );
          return;
        }
      }

      toast.success(
        `${selectedTransactions.length} mouvement(s) supprimé(s) avec succès`
      );
      setSelectedTransactions([]);
      loadData();
    } catch (error) {
      console.error("Erreur lors de la suppression des mouvements:", error);
      toast.error("Erreur lors de la suppression des mouvements");
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "epargne":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "cotisation_annuelle":
        return "bg-green-100 text-green-800 border-green-200";
      case "versement_ponctuel":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "depot_caution":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "restitution_caution":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "credit":
        return "bg-red-100 text-red-800 border-red-200";
      case "remboursement":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "interet":
        return "bg-pink-100 text-pink-800 border-pink-200";
      case "depense_commune_fonds":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "depense_commune_epargne":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "epargne":
        return "Épargne";
      case "cotisation_annuelle":
        return "Cotisation Annuelle";
      case "versement_ponctuel":
        return "Versement Ponctuel";
      case "depot_caution":
        return "Dépôt Caution";
      case "restitution_caution":
        return "Restitution Caution";
      case "credit":
        return "Crédit";
      case "remboursement":
        return "Remboursement";
      case "interet":
        return "Intérêt";
      case "depense_commune_fonds":
        return "Dépense Fonds";
      case "depense_commune_epargne":
        return "Dépense Épargne";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement des épargnes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Gestion des Épargnes
          </h1>
          <p className="text-slate-600 mt-2">
            Gérez les épargnes et cotisations des membres
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Épargne
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter une épargne</DialogTitle>
                <DialogDescription>
                  Enregistrez une nouvelle épargne pour un membre.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="member">Membre</Label>
                  <Select
                    onValueChange={(value: string) =>
                      setNewTransaction({
                        ...newTransaction,
                        membreId: Number(value),
                      })
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
                  <Label htmlFor="montant">Montant (FCFA)</Label>
                  <Input
                    id="montant"
                    type="number"
                    value={newTransaction.montantStr}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      setNewTransaction({
                        ...newTransaction,
                        montantStr: v,
                        montant: v === "" ? 0 : Number(v),
                      });
                    }}
                    placeholder="500000"
                  />
                </div>
                <div>
                  <Label htmlFor="motif">Motif</Label>
                  <Input
                    id="motif"
                    value={newTransaction.motif}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        motif: e.target.value,
                      })
                    }
                    placeholder="Épargne mensuelle"
                  />
                </div>
                <Button
                  onClick={handleAddTransaction}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!newTransaction.membreId || !newTransaction.montant || !newTransaction.motif}
                >
                  Ajouter l'épargne
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Épargnes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {transactions
                .filter((t) => t.type === "epargne")
                .reduce((sum, t) => sum + t.montant, 0)
                .toLocaleString()}{" "}
              FCFA
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Nombre d'Épargnes
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {transactions.filter((t) => t.type === "epargne").length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Moyenne par Épargne
            </CardTitle>
            <Calculator className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {(() => {
                const epargnes = transactions.filter(
                  (t) => t.type === "epargne"
                );
                return epargnes.length > 0
                  ? Math.round(
                      epargnes.reduce((sum, t) => sum + t.montant, 0) /
                        epargnes.length
                    ).toLocaleString()
                  : 0;
              })()}{" "}
              FCFA
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>
              Historique des Épargnes (
              {transactions.filter((t) => t.type === "epargne").length})
            </CardTitle>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher par membre ou motif..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="epargne">Épargne</SelectItem>
                </SelectContent>
              </Select>
              {selectedTransactions.length > 0 && role === "admin" && (
                <Button
                  onClick={handleDeleteSelected}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer ({selectedTransactions.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 && searchTerm ? (
            <div className="text-center py-8 text-slate-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucune épargne trouvée</p>
              <p className="text-sm">
                Aucune épargne ne correspond à votre recherche "{searchTerm}"
              </p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucune épargne enregistrée</p>
              <p className="text-sm">
                Commencez par ajouter votre première épargne.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedTransactions.length ===
                          filteredTransactions.length &&
                        filteredTransactions.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Membre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="w-12">
                      <Checkbox
                        checked={selectedTransactions.includes(transaction.id)}
                        onCheckedChange={(checked) =>
                          handleSelectTransaction(
                            transaction.id,
                            checked as boolean
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.membreNom}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getTypeColor(transaction.type)}
                      >
                        {getTypeLabel(transaction.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      +{transaction.montant.toLocaleString()} FCFA
                    </TableCell>
                    <TableCell>{transaction.motif}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {role === "admin" && (
                            <DropdownMenuItem
                              onClick={() => openEditDialog(transaction)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                          )}
                          {role === "admin" && (
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(transaction)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          )}
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
            <DialogTitle>Modifier l'épargne</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'épargne sélectionnée.
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-montant">Montant (FCFA)</Label>
                <Input
                  id="edit-montant"
                  type="number"
                  value={selectedTransaction.montant}
                  onChange={(e) =>
                    setSelectedTransaction({
                      ...selectedTransaction,
                      montant: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-motif">Motif</Label>
                <Input
                  id="edit-motif"
                  value={selectedTransaction.motif}
                  onChange={(e) =>
                    setSelectedTransaction({
                      ...selectedTransaction,
                      motif: e.target.value,
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
                  onClick={handleEditTransaction}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={role !== "admin"}
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
              Cette action est irréversible. L'épargne sera supprimée
              définitivement.
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <p>Êtes-vous sûr de vouloir supprimer cette épargne ?</p>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm">
                  <strong>Membre :</strong> {selectedTransaction.membreNom}
                  <br />
                  <strong>Montant :</strong>{" "}
                  {selectedTransaction.montant.toLocaleString()} FCFA
                  <br />
                  <strong>Motif :</strong> {selectedTransaction.motif}
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
                  onClick={handleDeleteTransaction}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={role !== "admin"}
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
