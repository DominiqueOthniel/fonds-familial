"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  TrendingUp,
  TrendingDown,
  Calculator,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

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

export function Mouvements() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>(
    []
  );

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
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    const matchesMember =
      memberFilter === "all" || transaction.membreNom === memberFilter;
    return matchesSearch && matchesType && matchesMember;
  });

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

  const totalIn = filteredTransactions
    .filter((entry) => entry.montant > 0)
    .reduce((sum, entry) => sum + entry.montant, 0);

  const totalOut = filteredTransactions
    .filter((entry) => entry.montant < 0)
    .reduce((sum, entry) => sum + Math.abs(entry.montant), 0);

  const uniqueMembers = Array.from(
    new Set(transactions.map((t) => t.membreNom))
  ).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement des mouvements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Gestion des Mouvements
          </h1>
          <p className="text-slate-600 mt-2">
            Consultez et gérez tous les mouvements financiers
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Entrées
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalIn.toLocaleString()} FCFA
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Sorties
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalOut.toLocaleString()} FCFA
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Solde Net
            </CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totalIn - totalOut >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {(totalIn - totalOut).toLocaleString()} FCFA
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>
              Mouvements Financiers ({filteredTransactions.length})
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
                  <SelectItem value="cotisation_annuelle">
                    Cotisation Annuelle
                  </SelectItem>
                  <SelectItem value="versement_ponctuel">
                    Versement Ponctuel
                  </SelectItem>
                  <SelectItem value="depot_caution">Dépôt Caution</SelectItem>
                  <SelectItem value="restitution_caution">
                    Restitution Caution
                  </SelectItem>
                  <SelectItem value="credit">Crédit</SelectItem>
                  <SelectItem value="remboursement">Remboursement</SelectItem>
                  <SelectItem value="interet">Intérêt</SelectItem>
                  <SelectItem value="depense_commune_fonds">
                    Dépense Fonds
                  </SelectItem>
                  <SelectItem value="depense_commune_epargne">
                    Dépense Épargne
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={memberFilter} onValueChange={setMemberFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par membre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les membres</SelectItem>
                  {uniqueMembers.map((member) => (
                    <SelectItem key={member} value={member}>
                      {member}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTransactions.length > 0 && (
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
          {filteredTransactions.length === 0 &&
          (searchTerm || typeFilter !== "all" || memberFilter !== "all") ? (
            <div className="text-center py-8 text-slate-500">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun mouvement trouvé</p>
              <p className="text-sm">
                Aucun mouvement ne correspond à vos critères de recherche
              </p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun mouvement enregistré</p>
              <p className="text-sm">
                Commencez par ajouter votre premier mouvement.
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
                    <TableCell>
                      <span
                        className={`font-medium ${
                          transaction.montant >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.montant >= 0 ? "+" : ""}
                        {transaction.montant.toLocaleString()} FCFA
                      </span>
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
                          <DropdownMenuItem
                            onClick={() => openEditDialog(transaction)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(transaction)}
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
            <DialogTitle>Modifier le mouvement</DialogTitle>
            <DialogDescription>
              Modifiez les informations du mouvement sélectionné.
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
              Cette action est irréversible. Le mouvement sera supprimé
              définitivement.
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <p>Êtes-vous sûr de vouloir supprimer ce mouvement ?</p>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm">
                  <strong>Membre :</strong> {selectedTransaction.membreNom}
                  <br />
                  <strong>Type :</strong>{" "}
                  {getTypeLabel(selectedTransaction.type)}
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
