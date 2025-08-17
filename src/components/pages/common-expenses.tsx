"use client";

import { useState, useEffect } from "react";
/* import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; */
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
import { Textarea } from "@/components/ui/textarea";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Wallet,
  TrendingDown,
  Users,
  AlertTriangle,
  Receipt,
  RefreshCw,
  DollarSign,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card.js";
import { useRole } from "../../hooks/useRole";
import { Checkbox } from "@/components/ui/checkbox";

interface CommonExpense {
  id: number;
  date: string;
  categorie: string;
  montant: number;
  description: string;
  typeContribution: "prelevement_epargne" | "contribution_individuelle";
}

interface CommonFundBalance {
  balance: number;
  lastUpdated: string;
  totalMembers: number;
  contributionPerMember: number;
}

// Nouvelle interface pour la modale "Gérer le fonds"
interface GestionFondsData {
  montantTotal: number;
  description: string;
  categorie: string;
  typeContribution: "prelevement_epargne" | "contribution_individuelle";
}

const EXPENSE_CATEGORIES = [
  "Boisson",
  "Deuil",
  "Evènement",
  "Transport",
  "Matériel",
  "Communication",
  "autres",
];

export function CommonExpenses() {
  const { role } = useRole();
  const [expenses, setExpenses] = useState<CommonExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isGestionFondsOpen, setIsGestionFondsOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<CommonExpense | null>(
    null
  );
  const [selectedExpenses, setSelectedExpenses] = useState<number[]>([]);
  const [gestionFondsData, setGestionFondsData] = useState<GestionFondsData>({
    montantTotal: 0,
    description: "",
    categorie: "",
    typeContribution: "prelevement_epargne",
  });
  const [montantTotalStr, setMontantTotalStr] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [isMultiDeleteDialogOpen, setIsMultiDeleteDialogOpen] = useState(false);

  // Charger les membres pour avoir le bon nombre
  const loadMembers = async () => {
    try {
      if (window.electronAPI) {
        const membersData = await window.electronAPI.getMembres();
        setMembers(membersData);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des membres:", error);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  // Calcul du solde du fonds basé sur les dépenses
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.montant,
    0
  );

  // Calcul du solde du fonds selon la formule : (∑Épargnes) - (∑Crédits en cours - montant initial) - (∑Dépenses communes) + (∑Cotisations)
  const [fundBalance, setFundBalance] = useState<CommonFundBalance>({
    balance: 0,
    lastUpdated: new Date().toISOString(),
    totalMembers: members.length,
    contributionPerMember: 1000000,
  });

  // Charger le solde du fonds depuis la base de données
  const loadFundBalance = async () => {
    try {
      if (window.electronAPI) {
        const fonds = await window.electronAPI.getSoldeFonds();
        const membersList = await window.electronAPI.getMembres();
        setFundBalance({
          balance: fonds.solde,
          lastUpdated: new Date().toISOString(),
          totalMembers: membersList.length,
          contributionPerMember: 1000000,
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement du solde:", error);
    }
  };

  useEffect(() => {
    loadFundBalance();
  }, [members.length]);

  // Charger les données depuis la base de données
  const loadData = async () => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        const expensesData = await window.electronAPI.getDepensesCommunes();
        setExpenses(expensesData);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des dépenses:", error);
      toast.error("Erreur lors du chargement des dépenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Écouter les événements de suppression de crédit et mise à jour du fonds pour recharger les données
  useEffect(() => {
    if (window.electronAPI) {
      const handleCreditDeleted = (creditId: number) => {
        console.log(
          `Crédit ${creditId} supprimé, rechargement des dépenses communes...`
        );
        loadData();
        loadFundBalance();
      };

      const handleFondsUpdated = (data: { montant: number; type: string }) => {
        console.log(
          `Dépenses communes: Fonds mis à jour - ${data.type} - ${data.montant} FCFA`
        );
        loadFundBalance();
      };

      const handleMouvementsUpdated = (data: {
        type: string;
        depenseId: number;
        depenseType: string;
      }) => {
        console.log(
          `Dépenses communes: Mouvements mis à jour - ${data.type} - Dépense ${data.depenseId} (${data.depenseType})`
        );
        loadData();
        loadFundBalance();
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

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || expense.categorie === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleGestionFonds = async () => {
    try {
      if (!window.electronAPI) {
        toast.error("API Electron non disponible");
        return;
      }

      if (gestionFondsData.montantTotal <= 0) {
        toast.error("Le montant total doit être supérieur à 0");
        return;
      }

      if (!gestionFondsData.description.trim()) {
        toast.error("Veuillez saisir une description");
        return;
      }

      if (!gestionFondsData.categorie) {
        toast.error("Veuillez sélectionner une catégorie");
        return;
      }

      // Plus de saisie de montant par membre, calcul automatique dans le résumé

      // Créer la dépense commune
      const depenseData = {
        description: gestionFondsData.description,
        montant: gestionFondsData.montantTotal,
        categorie: gestionFondsData.categorie,
        typeContribution: gestionFondsData.typeContribution,
      };

      const result = await window.electronAPI.ajouterDepenseCommune(
        depenseData
      );

      if (result.success) {
        const message =
          gestionFondsData.typeContribution === "prelevement_epargne"
            ? `Dépense de ${gestionFondsData.montantTotal.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA prélevée sur l'épargne des membres.`
            : `Dépense de ${gestionFondsData.montantTotal.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA répartie en contributions individuelles.`;

        toast.success(message);

        // Réinitialiser le formulaire
        setGestionFondsData({
          montantTotal: 0,
          description: "",
          categorie: "",
          typeContribution: "prelevement_epargne",
        });
        setMontantTotalStr(""); // Reset the string input

        setIsGestionFondsOpen(false);
        loadData();
        loadFundBalance();
      } else {
        toast.error("Erreur lors de l'enregistrement de la dépense");
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la dépense:", error);
      toast.error(
        "Une erreur est survenue lors de l'enregistrement de la dépense."
      );
    }
  };

  const handleEditExpense = async () => {
    if (!selectedExpense || !window.electronAPI) return;

    try {
      const oldAmount =
        expenses.find((e) => e.id === selectedExpense.id)?.montant || 0;
      const difference = selectedExpense.montant - oldAmount;

      if (difference > 0 && difference > fundBalance.balance) {
        toast.error("Le nouveau montant dépasse le solde disponible.");
        return;
      }

      const depenseData = {
        id: selectedExpense.id,
        description: selectedExpense.description,
        montant: selectedExpense.montant,
        categorie: selectedExpense.categorie,
      };

      const result = await window.electronAPI.modifierDepenseCommune(
        selectedExpense.id,
        depenseData
      );

      if (result.success) {
        toast.success("Les informations de la dépense ont été mises à jour.");
        setIsEditDialogOpen(false);
        setSelectedExpense(null);
        loadData(); // Recharger les données
        loadFundBalance(); // Recharger le solde du fonds
      } else {
        toast.error("Erreur lors de la modification de la dépense");
      }
    } catch (error) {
      console.error("Erreur lors de la modification de la dépense:", error);
      toast.error(
        "Une erreur est survenue lors de la modification de la dépense."
      );
    }
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.supprimerDepenseCommune(
        selectedExpense.id
      );

      if (result.success) {
        toast.success(
          `Le montant de ${selectedExpense.montant.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA a été remboursé au fonds.`
        );
        setIsDeleteDialogOpen(false);
        setSelectedExpense(null);
        loadData(); // Recharger les données
        loadFundBalance(); // Recharger le solde du fonds
      } else {
        toast.error("Erreur lors de la suppression de la dépense");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la dépense:", error);
      toast.error(
        "Une erreur est survenue lors de la suppression de la dépense."
      );
    }
  };

  const openEditDialog = (expense: CommonExpense) => {
    setSelectedExpense({ ...expense });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (expense: CommonExpense) => {
    setSelectedExpense(expense);
    setIsDeleteDialogOpen(true);
  };

  // Gestion des cases à cocher
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedExpenses(filteredExpenses.map((expense) => expense.id));
    } else {
      setSelectedExpenses([]);
    }
  };

  const handleSelectExpense = (expenseId: number, checked: boolean) => {
    if (checked) {
      setSelectedExpenses((prev) => [...prev, expenseId]);
    } else {
      setSelectedExpenses((prev) => prev.filter((id) => id !== expenseId));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedExpenses.length === 0) return;

    try {
      if (!window.electronAPI) {
        toast.error("API Electron non disponible");
        return;
      }

      // Supprimer les dépenses sélectionnées
      for (const expenseId of selectedExpenses) {
        const result = await window.electronAPI.supprimerDepenseCommune(
          expenseId
        );
        if (!result.success) {
          toast.error(
            `Erreur lors de la suppression de la dépense ${expenseId}`
          );
          return;
        }
      }

      toast.success(
        `${selectedExpenses.length} dépense(s) supprimée(s) avec succès`
      );
      setSelectedExpenses([]);
      loadData();
      loadFundBalance(); // Recharger le solde du fonds après la suppression
    } catch (error) {
      console.error("Erreur lors de la suppression des dépenses:", error);
      toast.error("Erreur lors de la suppression des dépenses");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement des dépenses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Dépenses Communes
          </h1>
          <p className="text-slate-600 mt-2">
            Gérez le fonds commun et les dépenses collectives
          </p>
        </div>
        <div className="flex gap-3">
          {role === "admin" && (
            <Dialog
              open={isGestionFondsOpen}
              onOpenChange={setIsGestionFondsOpen}
            >
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Wallet className="h-4 w-4 mr-2" />
                  Gérer le Fonds
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Gérer le Fonds</DialogTitle>
                  <DialogDescription>
                    Enregistrez une dépense commune et choisissez le type de
                    contribution.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="category">Catégorie</Label>
                    <Select
                      value={gestionFondsData.categorie}
                      onValueChange={(value: string) =>
                        setGestionFondsData({
                          ...gestionFondsData,
                          categorie: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="montant">Montant total (FCFA)</Label>
                    <Input
                      id="montant"
                      type="number"
                      value={montantTotalStr}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, "");
                        setMontantTotalStr(v);
                        setGestionFondsData({
                          ...gestionFondsData,
                          montantTotal: v === "" ? 0 : Number(v),
                        });
                      }}
                      placeholder="5000000"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={gestionFondsData.description}
                      onChange={(e) =>
                        setGestionFondsData({
                          ...gestionFondsData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Description de la dépense..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Type de contribution</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="prelevement-epargne"
                          name="typeContribution"
                          value="prelevement_epargne"
                          checked={
                            gestionFondsData.typeContribution ===
                            "prelevement_epargne"
                          }
                          onChange={(e) =>
                            setGestionFondsData({
                              ...gestionFondsData,
                              typeContribution: "prelevement_epargne" as const,
                            })
                          }
                          className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <Label
                          htmlFor="prelevement-epargne"
                          className="cursor-pointer"
                        >
                          Prélèvement sur épargne
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="contribution-individuelle"
                          name="typeContribution"
                          value="contribution_individuelle"
                          checked={
                            gestionFondsData.typeContribution ===
                            "contribution_individuelle"
                          }
                          onChange={(e) =>
                            setGestionFondsData({
                              ...gestionFondsData,
                              typeContribution:
                                "contribution_individuelle" as const,
                            })
                          }
                          className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <Label
                          htmlFor="contribution-individuelle"
                          className="cursor-pointer"
                        >
                          Contribution individuelle
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Saisie du montant par membre supprimée; calcul dans le résumé */}

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Résumé :</strong>
                      <br />
                      {gestionFondsData.typeContribution ===
                      "prelevement_epargne" ? (
                        <>
                          • Montant total :{" "}
                          {gestionFondsData.montantTotal.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                          <br />• Répartition : {members.length} membres
                          <br />• Montant par membre :{" "}
                          {Math.round(
                            gestionFondsData.montantTotal / members.length
                          ).toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}{" "}
                          FCFA
                        </>
                      ) : (
                        <>
                          • Montant total :{" "}
                          {gestionFondsData.montantTotal.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                          <br />• Nombre de membres : {members.length}
                          <br />• Montant par membre :{" "}
                          {(members.length > 0
                            ? Math.round(
                                gestionFondsData.montantTotal / members.length
                              )
                            : 0
                          ).toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}{" "}
                          FCFA
                        </>
                      )}
                    </p>
                  </div>

                  <Button
                    onClick={handleGestionFonds}
                    disabled={
                      role !== "admin" ||
                      !gestionFondsData.categorie ||
                      gestionFondsData.montantTotal <= 0 ||
                      !gestionFondsData.description.trim()
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Enregistrer la Dépense
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Solde du fonds commun */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-slate-900">
                Solde du Fonds Commun
              </CardTitle>
              <p className="text-sm text-slate-600">
                Dernière mise à jour:{" "}
                {new Date(fundBalance.lastUpdated).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <Wallet className="h-8 w-8 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600">Solde disponible</p>
              <p className="text-3xl font-bold text-blue-600">
                {fundBalance.balance.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Total membres</p>
              <p className="text-xl font-semibold text-slate-900">
                {fundBalance.totalMembers}
              </p>
            </div>
          </div>

          {fundBalance.balance < 10000000 && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Attention :</strong> Le solde du fonds commun est
                faible. Pensez à le reconstituer pour les prochaines dépenses.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Dépenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalExpenses.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Nombre de Dépenses
            </CardTitle>
            <Receipt className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {expenses.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Dépense Moyenne
            </CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {expenses.length > 0
                ? Math.round(totalExpenses / expenses.length).toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })
                : 0}{" "}
              FCFA
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des dépenses */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>
              Historique des Dépenses ({filteredExpenses.length})
            </CardTitle>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher une dépense..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedExpenses.length > 0 && role === "admin" && (
                <>
                  <Button
                    onClick={() => setIsMultiDeleteDialogOpen(true)}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer ({selectedExpenses.length})
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
                          Cette action est irréversible. Toutes les dépenses
                          sélectionnées seront supprimées définitivement.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p>
                          Êtes-vous sûr de vouloir supprimer{" "}
                          <strong>{selectedExpenses.length}</strong> dépenses ?
                        </p>
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                          <h4 className="font-semibold text-red-800 mb-2">
                            ⚠️ Attention
                          </h4>
                          <ul className="text-sm text-red-700 space-y-1">
                            <li>
                              • Les dépenses sélectionnées seront supprimées
                              définitivement
                            </li>
                            <li>
                              • Le montant sera remboursé au fonds commun après
                              suppression
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
          {filteredExpenses.length === 0 &&
          (searchTerm || categoryFilter !== "all") ? (
            <div className="text-center py-8 text-slate-500">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucune dépense trouvée</p>
              <p className="text-sm">
                Aucune dépense ne correspond à vos critères de recherche
              </p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucune dépense enregistrée</p>
              <p className="text-sm">
                Commencez par enregistrer votre première dépense commune
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedExpenses.length === filteredExpenses.length &&
                        filteredExpenses.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Type de contribution</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="w-12">
                      <Checkbox
                        checked={selectedExpenses.includes(expense.id)}
                        onCheckedChange={(checked) =>
                          handleSelectExpense(expense.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(expense.date).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          expense.categorie === "Boisson"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : expense.categorie === "Deuil"
                            ? "bg-gray-100 text-gray-800 border-gray-200"
                            : expense.categorie === "Evènement"
                            ? "bg-purple-100 text-purple-800 border-purple-200"
                            : expense.categorie === "Transport"
                            ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                            : expense.categorie === "Matériel"
                            ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                            : expense.categorie === "Communication"
                            ? "bg-pink-100 text-pink-800 border-pink-200"
                            : "bg-slate-100 text-slate-800 border-slate-200"
                        }
                      >
                        {expense.categorie}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-red-600">
                      -{expense.montant.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          expense.typeContribution === "prelevement_epargne"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-green-100 text-green-800 border-green-200"
                        }
                      >
                        {expense.typeContribution === "prelevement_epargne"
                          ? "Prélèvement sur épargne"
                          : "Contribution individuelle"}
                      </Badge>
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
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
                              onClick={() => openEditDialog(expense)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                          )}
                          {role === "admin" && (
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(expense)}
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
            <DialogTitle>Modifier la dépense</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la dépense sélectionnée.
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-category">Catégorie</Label>
                <Select
                  value={selectedExpense.categorie}
                  onValueChange={(value: string) =>
                    setSelectedExpense({ ...selectedExpense, categorie: value })
                  }
                  disabled={role !== "admin"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-amount">Montant (FCFA)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={selectedExpense.montant}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      montant: Number(e.target.value),
                    })
                  }
                  disabled={role !== "admin"}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={selectedExpense.description}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  disabled={role !== "admin"}
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
                  onClick={handleEditExpense}
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
              Cette action est irréversible. La dépense sera supprimée
              définitivement.
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <p>Êtes-vous sûr de vouloir supprimer cette dépense ?</p>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm">
                  <strong>Catégorie :</strong> {selectedExpense.categorie}
                  <br />
                  <strong>Montant :</strong> {` `}
                  {selectedExpense.montant.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                  <br />
                  <strong>Description :</strong> {selectedExpense.description}
                </p>
              </div>

              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  <strong>Note :</strong> Le montant sera remboursé au fonds
                  commun après suppression.
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
                  onClick={handleDeleteExpense}
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
