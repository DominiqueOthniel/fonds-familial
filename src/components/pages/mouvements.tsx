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
  CheckCircle,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useRole } from "../../hooks/useRole";

interface Transaction {
  id: number;
  membreId: number;
  membreNom: string;
  type: string;
  montant: number;
  motif: string;
  date: string;
  updatedAt?: string;
  sessionId?: number;
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
  const { role } = useRole();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const [exportingPdf, setExportingPdf] = useState(false);
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
        const filters = sessionFilter !== "all" ? { sessionId: Number(sessionFilter) } : {};
        const [transactionsData, membersData, sessionsData] = await Promise.all([
          window.electronAPI.getMouvements(filters),
          window.electronAPI.getMembres(),
          window.electronAPI.getSessions(),
        ]);
        console.log("🔍 Debug sessions:", sessionsData);
        console.log("🔍 Debug transactions sample:", transactionsData.slice(0, 3));
        setTransactions(transactionsData);
        setMembers(membersData);
        setSessions(sessionsData.sessions || []);
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
  }, [sessionFilter]);

  // Écouter les événements de suppression de crédit et mise à jour du fonds pour recharger les données
  useEffect(() => {
    if (window.electronAPI) {
      const handleCreditDeleted = (creditId: number) => {
        console.log(
          `Crédit ${creditId} supprimé, rechargement des mouvements...`
        );
        loadData();
      };

      const handleFondsUpdated = (data: { montant: number; type: string }) => {
        console.log(`Fonds mis à jour: ${data.type} - ${data.montant} FCFA`);
        loadData();
      };

      const handleMouvementsUpdated = (data: {
        type: string;
        depenseId: number;
        depenseType: string;
      }) => {
        console.log(
          `Mouvements mis à jour: ${data.type} - Dépense ${data.depenseId} (${data.depenseType})`
        );
        loadData();
      };

      window.electronAPI.onCreditDeleted(handleCreditDeleted);
      window.electronAPI.onFondsUpdated(handleFondsUpdated);
      window.electronAPI.onMouvementsUpdated(handleMouvementsUpdated);

      // Cleanup function
      return () => {
        // Retirer les listeners pour éviter les memory leaks
        if (window.electronAPI) {
          if (window.electronAPI.removeCreditDeletedListener) {
            window.electronAPI.removeCreditDeletedListener(handleCreditDeleted);
          }
          if (window.electronAPI.removeFondsUpdatedListener) {
            window.electronAPI.removeFondsUpdatedListener(handleFondsUpdated);
          }
          if (window.electronAPI.removeMouvementsUpdatedListener) {
            window.electronAPI.removeMouvementsUpdatedListener(
              handleMouvementsUpdated
            );
          }
        }
      };
    }
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

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const sessionId = sessionFilter === "all" ? undefined : parseInt(sessionFilter);
      const result = await window.electronAPI.exportMouvementsPdf(sessionId);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(`Erreur lors de l'export PDF: ${result.message}`);
      }
    } catch (error) {
      toast.error("Erreur lors de l'export PDF");
      console.error("Export PDF error:", error);
    } finally {
      setExportingPdf(false);
    }
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
      case "credit":
        return "bg-red-100 text-red-800 border-red-200";
      case "remboursement":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "depense_epargne":
        return "bg-red-100 text-red-800 border-red-200";
      case "depense_contribution":
        return "bg-green-100 text-green-800 border-green-200";
      case "cassation":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "epargne":
        return "Épargne";
      case "credit":
        return "Crédit";
      case "remboursement":
        return "Remboursement";
      case "depense_epargne":
        return "Dépense Épargne";
      case "depense_contribution":
        return "Dépense Contribution";
      case "cassation":
        return "Cassation";
      default:
        return type;
    }
  };

  // Fonction pour calculer les pénalités si le crédit est en retard
  const calculerPenalites = (transaction: Transaction) => {
    if (transaction.type !== "credit") return 0;

    // Pour les mouvements de type crédit, on ne peut pas calculer les pénalités
    // car on n'a pas accès aux informations de date d'échéance
    // Cette fonction sera utilisée si on ajoute ces informations plus tard
    return 0;
  };

  // Lire le fonds disponible via IPC (calcul Electron unique)
  const [fundBalance, setFundBalance] = useState(0);
  const [soldeFictif, setSoldeFictif] = useState(0);
  const [totalCreditsRestants, setTotalCreditsRestants] = useState(0);

  useEffect(() => {
      const loadFundBalance = async () => {
    try {
      if (window.electronAPI) {
        const fonds = await window.electronAPI.getSoldeFonds();
        setFundBalance(fonds.solde);
        setSoldeFictif(fonds.soldeFictif || 0);
        setTotalCreditsRestants(fonds.totalCreditsRestants || 0);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du solde:", error);
    }
  };

    loadFundBalance();
  }, [transactions]);

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
        <Button 
          variant="outline" 
          onClick={handleExportPdf}
          disabled={exportingPdf}
        >
          {exportingPdf ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          {exportingPdf ? "Export en cours..." : "Exporter PDF"}
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
              {totalIn.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
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
              {totalOut.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Fonds Disponibles
            </CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {fundBalance.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Solde Fictif (Si Tous En Règle)
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {soldeFictif.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
            </div>
            <div className="text-sm text-slate-500 mt-1">
              +{totalCreditsRestants.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA de crédits restants
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
                  <SelectItem value="epargne">Épargne</SelectItem>
                  <SelectItem value="credit">Crédit</SelectItem>
                  <SelectItem value="remboursement">Remboursement</SelectItem>
                  <SelectItem value="depense_epargne">
                    Dépense Épargne
                  </SelectItem>
                  <SelectItem value="depense_contribution">
                    Dépense Contribution
                  </SelectItem>
                  <SelectItem value="cassation">Cassation</SelectItem>
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
              <Select value={sessionFilter} onValueChange={setSessionFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sessions</SelectItem>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nom || `Session ${s.numero}`}
                    </SelectItem>
                  ))}
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
                  <TableHead>Session</TableHead>
                  <TableHead>Membre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Modifié le</TableHead>
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
                    <TableCell className="font-medium">
                      {(() => {
                        if (!transaction.sessionId) {
                          return "Aucune session";
                        }
                        const s = sessions.find((x: any) => x.id === transaction.sessionId);
                        return s ? (s.nom || `Session ${s.numero}`) : `Session ${transaction.sessionId}`;
                      })()}
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
                        {transaction.montant.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                      </span>
                    </TableCell>
                    <TableCell>{transaction.motif}</TableCell>
                    <TableCell>
                      {transaction.updatedAt
                        ? new Date(transaction.updatedAt).toLocaleString(
                            "fr-FR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "—"}
                    </TableCell>
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
                  {selectedTransaction.montant.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
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
