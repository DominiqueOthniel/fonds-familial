"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRole } from "../../hooks/useRole";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Calculator,
  AlertTriangle,
  CheckCircle,
  Wallet,
  TrendingUp,
  CreditCard,
  Users,
  Play,
  FileDown,
  Loader2,
} from "lucide-react";

interface Member {
  id: number;
  nom: string;
  epargneActuelle: number;
  creditRestant: number;
  contributionNette: number;
  statut: string;
  partCassation: number;
  // Nouveaux champs pour la répartition détaillée
  partEpargne?: number;
  partInterets?: number;
  // Champs optionnels pour l'après cassation
  soldePersonnelApres?: number;
  epargneEnFondsApres?: number;
  creditRestantApres?: number;
}

export function Cassation() {
  const { role } = useRole();
  const [isSimulated, setIsSimulated] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [cassationExecuted, setCassationExecuted] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fondsDisponibles, setFondsDisponibles] = useState(0); // Solde disponible réel (somme nette des mouvements)
  const [totalParts, setTotalParts] = useState(0);
  const [totalCautions, setTotalCautions] = useState(0);
  const [applyingCassation, setApplyingCassation] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Nouveaux états pour l'après cassation
  const [etatApresCassation, setEtatApresCassation] = useState<any>(null);
  const [showApresCassation, setShowApresCassation] = useState(false);
  const [nouveauCyclePrepared, setNouveauCyclePrepared] = useState(false);

  const loadSimulation = async () => {
    setLoading(true);
    try {
      console.log("🔄 Début du chargement de la simulation...");
      console.log("🔍 Vérification de l'API:", window.electronAPI);
      
      if (window.electronAPI && (window.electronAPI as any).simulerCassation) {
        console.log("✅ API simulerCassation disponible");
        
        const result = await (window.electronAPI as any).simulerCassation();
        console.log("📊 Données de simulation récupérées:", result);
        
        if (result && result.membres && Array.isArray(result.membres)) {
          setMembers(result.membres);
          setIsSimulated(true);

          // Debug: Afficher les données récupérées
          console.log("💰 Crédits en cours par membre:", result.membres.map((m: any) => ({ nom: m.nom, creditRestant: m.creditRestant })));
          console.log("🎯 Parts de cassation avec arrondi:", result.membres.map((m: any) => ({ 
            nom: m.nom, 
            partCassation: m.partCassation,
            partFormatee: m.partCassation?.toLocaleString() + ' FCFA'
          })));

          // Utiliser les détails de la simulation pour les fonds disponibles
          if (result.details) {
            console.log("🏦 Détails de la simulation:", result.details);
            // Source de vérité: toujours récupérer le solde réel depuis le backend
            const fonds = await (window.electronAPI as any).getSoldeFonds();
            setFondsDisponibles(fonds.solde);

            // Total des parts calculé depuis les données de simulation
            const totalPartsLocal = result.membres.reduce(
              (sum: number, m: any) => sum + (m.partCassation ?? 0),
              0
            );
            console.log("📊 Total des parts calculé:", totalPartsLocal);
            setTotalParts(totalPartsLocal);
          } else {
            // Fallback: Récupération via IPC si pas de détails
            console.log("🏦 Récupération du solde du fonds via IPC...");
            const fonds = await (window.electronAPI as any).getSoldeFonds();
            console.log("🏦 Fonds disponibles:", fonds);
            setFondsDisponibles(fonds.solde);
            
            const totalPartsLocal = result.membres.reduce(
              (sum: number, m: any) => sum + (m.partCassation ?? 0),
              0
            );
            setTotalParts(totalPartsLocal);
          }
        } else {
          console.warn("⚠️ Aucune donnée de simulation reçue ou format incorrect:", result);
          setMembers([]);
          setIsSimulated(false);
        }
      } else {
        console.error("❌ API simulerCassation non disponible");
        console.log("🔍 API disponible:", Object.keys(window.electronAPI || {}));
      }
    } catch (error) {
      console.error("❌ Erreur lors du chargement de la simulation:", error);
      toast.error("Erreur lors du chargement de la simulation");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && (window.electronAPI as any).executerCassation) {
        await (window.electronAPI as any).executerCassation();
        setCassationExecuted(true);
        setIsConfirmDialogOpen(false);
        loadSimulation();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCassation = async () => {
    setApplyingCassation(true);
    try {
      if (
        window.electronAPI &&
        (window.electronAPI as any).appliquerCassation
      ) {
        const result = await (window.electronAPI as any).appliquerCassation();
        if (result.success) {
          toast.success(result.message || "Cassation appliquée avec succès");
          setCassationExecuted(true);
          setIsConfirmDialogOpen(false);
          // Recharger les données
          loadSimulation();
        } else {
          toast.error(
            result.message || "Erreur lors de l'application de la cassation"
          );
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'application de la cassation:", error);
      toast.error("Erreur lors de l'application de la cassation");
    } finally {
      setApplyingCassation(false);
    }
  };

  const handleExportCassationPdf = async () => {
    setExportingPdf(true);
    try {
      const result = await window.electronAPI.exportCassationPdf();
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(`Erreur lors de l'export PDF: ${result.message}`);
      }
    } catch (error) {
      toast.error("Erreur lors de l'export PDF de la cassation");
      console.error("Export PDF cassation error:", error);
    } finally {
      setExportingPdf(false);
    }
  };

  // Nouvelle fonction pour récupérer l'état après cassation
  const loadEtatApresCassation = async () => {
    setLoading(true);
    try {
      if (
        window.electronAPI &&
        (window.electronAPI as any).getEtatApresCassation
      ) {
        const result = await (
          window.electronAPI as any
        ).getEtatApresCassation();
        if (result.success) {
          setEtatApresCassation(result);
          setShowApresCassation(true);
        } else {
          toast.error(
            result.message ||
              "Erreur lors de la récupération de l'état après cassation"
          );
        }
      }
    } catch (error) {
      console.error(
        "Erreur lors de la récupération de l'état après cassation:",
        error
      );
      toast.error("Erreur lors de la récupération de l'état après cassation");
    } finally {
      setLoading(false);
    }
  };

  // Nouvelle fonction pour préparer le nouveau cycle
  const handlePreparerNouveauCycle = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.preparerNouveauCycle();
      if (result.success) {
        toast.success(result.message || "Nouveau cycle préparé avec succès");
        setNouveauCyclePrepared(true);
        setShowApresCassation(false);
        // Recharger les données
        loadSimulation();
      } else {
        toast.error(
          result.message || "Erreur lors de la préparation du nouveau cycle"
        );
      }
    } catch (error) {
      console.error("Erreur lors de la préparation du nouveau cycle:", error);
      toast.error("Erreur lors de la préparation du nouveau cycle");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSimulation();
  }, []);

  // Écouter l'événement de cassation appliquée
  useEffect(() => {
    if (window.electronAPI && (window.electronAPI as any).onCassationApplied) {
      const handleCassationApplied = (data: {
        totalDistributed: number;
        membersCount: number;
        details?: {
          totalEpargne: number;
          totalInterets: number;
        };
      }) => {
        console.log("Cassation appliquée:", data);
        
        // Afficher une notification de succès avec détails
        let message = `Cassation appliquée avec succès ! ${data.totalDistributed.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA distribués à ${data.membersCount} membre(s).`;
        
        if (data.details) {
          message += ` (Épargne: ${data.details.totalEpargne.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA + Intérêts: ${data.details.totalInterets.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA)`;
        }
        
        toast.success(message);
        
        // Recharger les données
        loadSimulation();
      };

      (window.electronAPI as any).onCassationApplied(handleCassationApplied);

      // Cleanup function
      return () => {
        // Note: Dans une vraie application, on devrait avoir une méthode pour retirer les listeners
        // Mais pour l'instant, on laisse le listener actif
      };
    }
  }, []);

  // Écouter l'événement de nouveau cycle préparé
  useEffect(() => {
    if (
      window.electronAPI &&
      (window.electronAPI as any).onNouveauCyclePrepared
    ) {
      const handleNouveauCyclePrepared = (data: {
        membres: any[];
        statistiques: any;
        alertes: any[];
      }) => {
        console.log("Nouveau cycle préparé:", data);
        toast.success(
          `Nouveau cycle préparé ! ${
            data.statistiques.membresEnPositif
          } membre(s) en positif, ${data.statistiques.totalCreancesRestantes.toLocaleString()} FCFA de créances restantes.`
        );
        // Mettre à jour l'état local
        setEtatApresCassation(data);
        setNouveauCyclePrepared(true);
      };

      (window.electronAPI as any).onNouveauCyclePrepared(
        handleNouveauCyclePrepared
      );

      // Cleanup function
      return () => {
        // Note: Dans une vraie application, on devrait avoir une méthode pour retirer les listeners
        // Mais pour l'instant, on laisse le listener actif
      };
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI && (window.electronAPI as any).onFondsUpdated) {
      const handler = async () => {
        try {
          const fonds = await (window.electronAPI as any).getSoldeFonds();
          setFondsDisponibles(fonds.solde);
        } catch {}
      };
      (window.electronAPI as any).onFondsUpdated(handler);
      return () => {
        // pas de remove fourni; noop
      };
    }
  }, []);

  const totalEpargnes = members.reduce(
    (sum, member) => sum + (member.epargneActuelle || 0),
    0
  );
  const totalCreditsEnCours = members.reduce(
    (sum, member) => sum + (member.creditRestant || 0),
    0
  );
  const totalContributionsNettes = members.reduce(
    (sum, member) => sum + (member.contributionNette || 0),
    0
  );
  const contributionNette = totalEpargnes - totalCreditsEnCours;
  const pourcentage =
    totalContributionsNettes > 0
      ? (contributionNette / totalContributionsNettes) * 100
      : 0;
  const sumParts = members.reduce(
    (sum, member) => sum + (member.partCassation || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Cassation du Fonds
          </h1>
          <p className="text-slate-600 mt-2">
            Simulation et exécution de la cassation quinquennale du fonds familial
          </p>
        </div>
        {isSimulated && (
          <Button 
            variant="outline" 
            onClick={handleExportCassationPdf}
            disabled={exportingPdf}
          >
            {exportingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            {exportingPdf ? "Export en cours..." : "Exporter PDF"}
          </Button>
        )}
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Attention :</strong> La cassation est une opération
          irréversible qui répartit tous les fonds entre les membres et remet
          les comptes à zéro. Cette opération doit être effectuée tous les ans.
        </AlertDescription>
      </Alert>

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
              {totalEpargnes.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Crédits en Cours
            </CardTitle>
            <CreditCard className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalCreditsEnCours.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Inclut les pénalités de retard
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Fonds Disponibles (épargnes ajustées)
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {fondsDisponibles.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
            </div>
          </CardContent>
        </Card>
      </div>

      {isSimulated && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Solde disponible (source officielle) :</strong> somme nette de tous les mouvements (entrées − sorties), exactement comme calculé par le backend.
            <br />
            <strong>Arrondi intelligent :</strong> Les parts sont arrondies à 25, 50 ou 100 FCFA selon le montant total pour des montants réalistes.
          </AlertDescription>
        </Alert>
      )}

      {/* Affichage de l'état après cassation */}
      {showApresCassation && etatApresCassation && (
        <div className="space-y-6">
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                État Après Cassation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {etatApresCassation.statistiques.membresEnPositif}
                  </div>
                  <div className="text-sm text-slate-600">
                    Membres en positif
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {etatApresCassation.statistiques.membresEnDifficulte}
                  </div>
                  <div className="text-sm text-slate-600">
                    Membres en difficulté
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {etatApresCassation.statistiques.totalPartsDistribuees.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                  </div>
                  <div className="text-sm text-slate-600">FCFA distribués</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {etatApresCassation.statistiques.totalCreancesRestantes.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                  </div>
                  <div className="text-sm text-slate-600">FCFA de créances</div>
                </div>
              </div>

              {/* Alertes */}
              {etatApresCassation.alertes &&
                etatApresCassation.alertes.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {etatApresCassation.alertes.map(
                      (alerte: any, index: number) => (
                        <Alert
                          key={index}
                          className={
                            alerte.type === "warning"
                              ? "border-red-200 bg-red-50"
                              : "border-blue-200 bg-blue-50"
                          }
                        >
                          <AlertTriangle
                            className={`h-4 w-4 ${
                              alerte.type === "warning"
                                ? "text-red-600"
                                : "text-blue-600"
                            }`}
                          />
                          <AlertDescription>
                            <div className="font-semibold">{alerte.titre}</div>
                            <div className="text-sm mt-1">{alerte.message}</div>
                            {alerte.details && (
                              <div className="text-xs mt-2 text-slate-600">
                                {alerte.details.join(", ")}
                              </div>
                            )}
                            {alerte.action && (
                              <div className="text-xs mt-1 text-blue-600">
                                {alerte.action}
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )
                    )}
                  </div>
                )}

              {/* Tableau des membres après cassation */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membre</TableHead>
                      <TableHead>Part Reçue</TableHead>
                      <TableHead>Nouveau Solde</TableHead>
                      <TableHead>Crédit Restant</TableHead>
                      <TableHead>Situation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {etatApresCassation.membres.map((membre: any) => (
                      <TableRow key={membre.id}>
                        <TableCell className="font-medium">
                          {membre.nom}
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {membre.partCassationRecue.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                        </TableCell>
                        <TableCell
                          className={`font-bold ${
                            (membre.nouveauSolde || 0) > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {(membre.nouveauSolde || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                        </TableCell>
                        <TableCell className="text-red-600">
                          {membre.creditRestant > 0
                            ? `${membre.creditRestant.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              membre.situation === "En règle"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {membre.situation}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Affichage du nouveau cycle préparé */}
      {nouveauCyclePrepared && etatApresCassation && (
        <div className="space-y-6">
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Nouveau Cycle Préparé
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Nouveau cycle prêt !</strong> Les soldes ont été
                  reportés et le fonds est prêt pour de nouvelles opérations.
                  Les créances restantes devront être remboursées pour alimenter
                  le prochain cycle.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {etatApresCassation?.statistiques?.membresEnPositif || 0}
                  </div>
                  <div className="text-sm text-slate-600">
                    Membres prêts pour le nouveau cycle
                  </div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {(etatApresCassation?.statistiques?.totalCreancesRestantes || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                  </div>
                  <div className="text-sm text-slate-600">
                    FCFA de créances à récupérer
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {(etatApresCassation?.statistiques?.totalPartsDistribuees || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                  </div>
                  <div className="text-sm text-slate-600">
                    FCFA distribués lors de la cassation
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-slate-900 mb-3">
                  Prochaines étapes :
                </h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>
                    • Les membres peuvent maintenant effectuer de nouvelles
                    épargnes
                  </li>
                  <li>
                    • Les crédits restants doivent être remboursés pour
                    alimenter le fonds
                  </li>
                  <li>
                    • Les remboursements alimenteront le prochain cycle de
                    cassation
                  </li>
                  <li>• Le fonds est prêt pour de nouvelles opérations</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-4">
        <Button
          onClick={() => {
            setIsSimulated(false);
            setCassationExecuted(false);
            setNouveauCyclePrepared(false);
            setEtatApresCassation(null);
            setShowApresCassation(false);
            loadSimulation();
          }}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={loading}
        >
          <Calculator className="h-4 w-4 mr-2" />
          Simuler la Cassation
        </Button>

        {isSimulated && !cassationExecuted && role === "admin" && (
          <>
            <Dialog
              open={isConfirmDialogOpen}
              onOpenChange={setIsConfirmDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Confirmer la Cassation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmer la Cassation</DialogTitle>
                  <DialogDescription>
                    Cette action est irréversible et répartira tous les fonds
                    entre les membres.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Êtes-vous sûr de vouloir exécuter la cassation ? Cette
                      action est irréversible et :
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Répartira tous les fonds entre les membres</li>
                        <li>Remettra tous les comptes à zéro</li>
                        <li>Effacera l'historique des transactions</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsConfirmDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleExecute}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={loading}
                  >
                    Confirmer la Cassation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              onClick={handleApplyCassation}
              className="bg-green-600 hover:bg-green-700"
              disabled={applyingCassation || fondsDisponibles === 0}
            >
              <Play className="h-4 w-4 mr-2" />
              {applyingCassation
                ? "Application en cours..."
                : "Appliquer la Cassation"}
            </Button>
          </>
        )}

        {/* Nouveaux boutons pour l'après cassation */}
        {cassationExecuted && role === "admin" && (
          <>
            <Button
              onClick={loadEtatApresCassation}
              className="bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Voir État Après Cassation
            </Button>

            {etatApresCassation && (
              <Button
                onClick={handlePreparerNouveauCycle}
                className="bg-orange-600 hover:bg-orange-700"
                disabled={loading}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Préparer Nouveau Cycle
              </Button>
            )}
          </>
        )}
      </div>

      {cassationExecuted && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Cassation exécutée avec succès !</strong> Les fonds ont été
            répartis entre les membres et tous les comptes ont été remis à zéro.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {isSimulated
              ? "Simulation de la Répartition"
              : "Répartition des Membres"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun membre enregistré</p>
              <p className="text-sm">
                Ajoutez des membres pour pouvoir effectuer la cassation.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Total Épargnes</TableHead>
                  <TableHead>Crédits en Cours</TableHead>
                  <TableHead>Contribution Nette</TableHead>
                  <TableHead>Pourcentage</TableHead>
                  {isSimulated && (
                    <>
                      <TableHead>Part Épargne</TableHead>
                      <TableHead>Part Intérêts</TableHead>
                      <TableHead>Part Totale</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.nom}</TableCell>
                    <TableCell>
                      {(member.epargneActuelle ?? member.epargneNette ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                    </TableCell>
                    <TableCell className="text-red-600">
                      {member.creditRestant > 0
                        ? `${(member.creditRestant ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA`
                        : "-"}
                      {member.creditRestant > 0 && member.statut === "en_retard" && (
                        <div className="text-xs text-slate-500">
                          Inclut pénalités
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {(member.contributionNette ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                    </TableCell>
                    <TableCell>
                      {isSimulated && totalContributionsNettes > 0
                        ? (
                            ((member.contributionNette ?? 0) /
                              totalContributionsNettes) *
                            100
                          ).toFixed(1)
                        : "0.0"}
                      %
                    </TableCell>
                    {isSimulated && (
                      <>
                        <TableCell className="text-blue-600">
                          {(member.partEpargne ?? member.contributionNette ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                        </TableCell>
                        <TableCell className="text-orange-600">
                          {(member.partInterets ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          {(member.partCassation ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Section des détails de la simulation */}
      {isSimulated && (
        <Card>
          <CardHeader>
            <CardTitle>Détails de la Simulation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">💰 Fonds Disponibles</h4>
                <div className="text-xl font-bold text-blue-600">
                  {fondsDisponibles.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  Total à répartir entre les membres
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">📊 Total des Parts</h4>
                <div className="text-xl font-bold text-green-600">
                  {totalParts.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Somme des parts calculées
                </p>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-semibold text-orange-800 mb-2">👥 Membres Bénéficiaires</h4>
                <div className="text-xl font-bold text-orange-600">
                  {members.filter(m => (m.partCassation || 0) > 0).length}
                </div>
                <p className="text-sm text-orange-600 mt-1">
                  Membres recevant une part
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isSimulated && (
        <Card>
          <CardHeader>
            <CardTitle>Résumé de la Cassation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">
                  Méthode de Calcul (Logique Alice/Bob)
                </h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• <strong>ÉTAPE 1</strong> : Épargnes initiales de chaque membre</li>
                  <li>• <strong>ÉTAPE 2</strong> : Calcul des intérêts perçus sur crédits remboursés</li>
                  <li>• <strong>ÉTAPE 3</strong> : Fonds disponible = Épargnes - Crédits + Intérêts</li>
                  <li>• <strong>ÉTAPE 4</strong> : Contribution nette = Épargne - Crédit restant</li>
                  <li>• <strong>ÉTAPE 5</strong> : Part = (Contribution nette / Total contributions) × Fonds disponible</li>
                  <li className="font-semibold text-green-600">• <strong>Nouveau solde</strong> = Ancien solde + Part de cassation</li>
                  <li className="font-semibold text-orange-600">• <strong>Épargnes en fonds</strong> = 0 FCFA (remise à zéro)</li>
                  <li className="font-semibold text-red-600">• <strong>Crédits</strong> = Inchangés (dettes persistent)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">
                  Total du Fonds Disponible à Redistribuer
                </h3>
                <div className="text-2xl font-bold text-green-600">
                  {sumParts.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Répartition selon la logique Alice/Bob : Fonds disponible = Épargnes - Crédits + Intérêts
                </p>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">État Après Cassation:</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• <strong>Nouveaux soldes personnels</strong> = Anciens soldes + Parts reçues</li>
                    <li>• <strong>Crédits restants</strong> = Inchangés (dettes persistent)</li>
                    <li>• <strong>Fonds commun</strong> = 0 FCFA (entièrement distribué)</li>
                    <li>• <strong>Épargnes en fonds</strong> = 0 FCFA (nouveau départ)</li>
                  </ul>
                </div>
                <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-1">💡 Logique Alice/Bob - Cassation Complète :</h4>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>• <strong>ÉTAPE 1</strong> : Épargnes initiales (Alice: 80k, Bob: 20k)</li>
                    <li>• <strong>ÉTAPE 2</strong> : Intérêts perçus sur crédits remboursés</li>
                    <li>• <strong>ÉTAPE 3</strong> : Fonds disponible = Épargnes - Crédits + Intérêts</li>
                    <li>• <strong>ÉTAPE 4</strong> : Contributions nettes = Épargne - Crédit restant</li>
                    <li>• <strong>ÉTAPE 5</strong> : Distribution proportionnelle du fonds disponible</li>
                    <li>• <strong>Résultat</strong> : Nouveau solde = Ancien solde + Part de cassation</li>
                  </ul>
                </div>
                
                <div className="mt-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-800 mb-1">💰 Répartition des Intérêts :</h4>
                  <ul className="text-xs text-orange-700 space-y-1">
                    <li>• <strong>Part Épargne</strong> : Montant de l'épargne nette de chaque membre</li>
                    <li>• <strong>Part Intérêts</strong> : Intérêts proportionnels selon la contribution nette</li>
                    <li>• <strong>Formule</strong> : Part Intérêts = (Contribution nette / Total contributions) × Total intérêts</li>
                    <li>• <strong>Part Totale</strong> : Épargne nette + Part des intérêts (avec arrondi)</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Synchronisation efficace : la page Cassation écoute les événements cassation-applied et nouveau-cycle-prepared
        pour mettre à jour l'état local et l'UI en temps réel après chaque opération de cassation.
        Les handlers simulerCassation, executerCassation, appliquerCassation, getEtatApresCassation, preparerNouveauCycle
        sont utilisés pour piloter tout le workflow de cassation, garantissant la cohérence et la traçabilité. */}
    </div>
  );
}
