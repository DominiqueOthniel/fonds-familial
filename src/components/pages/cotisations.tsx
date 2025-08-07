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
  Plus,
  Users,
  TrendingUp,
  Wallet,
  Calendar,
  DollarSign,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: number;
  nom: string;
  telephone: string;
  ville: string;
  profession: string;
  dateAdhesion: string;
  caution: number;
}

interface Mouvement {
  id: number;
  membreId: number;
  membreNom: string;
  type: string;
  montant: number;
  motif: string;
  date: string;
}

interface CotisationStats {
  totalMembres: number;
  totalCotisations: number;
  moyenneParMembre: number;
}

export function Cotisations() {
  const [members, setMembers] = useState<Member[]>([]);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCotisation, setNewCotisation] = useState({
    type: "annuelle" as "annuelle" | "ponctuel",
    montantParMembre: 1000000,
    date: new Date().toISOString().split("T")[0],
  });

  // Charger les données depuis la base de données
  const loadData = async () => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        const [membersData, mouvementsData] = await Promise.all([
          window.electronAPI.getMembres(),
          window.electronAPI.getMouvements(),
        ]);
        setMembers(membersData);
        setMouvements(mouvementsData);
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

  // Calculer les statistiques
  const stats: CotisationStats = {
    totalMembres: members.length,
    totalCotisations: mouvements
      .filter((m) => m.type === "épargne")
      .reduce((sum, m) => sum + m.montant, 0),
    moyenneParMembre:
      members.length > 0
        ? Math.round(
            mouvements
              .filter((m) => m.type === "épargne")
              .reduce((sum, m) => sum + m.montant, 0) / members.length
          )
        : 0,
  };

  // Calculer les cotisations par membre
  const getCotisationsByMember = () => {
    const cotisationsByMember = new Map<
      number,
      { membre: Member; total: number; mouvements: Mouvement[] }
    >();

    // Initialiser avec tous les membres
    members.forEach((member) => {
      cotisationsByMember.set(member.id, {
        membre: member,
        total: 0,
        mouvements: [],
      });
    });

    // Ajouter les mouvements d'épargne
    mouvements
      .filter((m) => m.type === "épargne")
      .forEach((mouvement) => {
        const memberData = cotisationsByMember.get(mouvement.membreId);
        if (memberData) {
          memberData.total += mouvement.montant;
          memberData.mouvements.push(mouvement);
        }
      });

    // Trier les mouvements par date (plus récent en premier)
    cotisationsByMember.forEach((memberData) => {
      memberData.mouvements.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    });

    return Array.from(cotisationsByMember.values());
  };

  const handleAddCotisation = async () => {
    try {
      if (!window.electronAPI) {
        toast.error("API Electron non disponible");
        return;
      }

      if (!newCotisation.date) {
        toast.error("Veuillez sélectionner une date");
        return;
      }

      const cotisationData = {
        montantParMembre: newCotisation.montantParMembre,
        date: newCotisation.date,
        type: newCotisation.type,
      };

      const result = await window.electronAPI.addCotisation(cotisationData);

      if (result.success) {
        toast.success(
          `Prélèvement de ${newCotisation.montantParMembre.toLocaleString()} FCFA effectué pour ${
            result.nbMembres
          } membres.`
        );
        setNewCotisation({
          type: "annuelle",
          montantParMembre: 1000000,
          date: new Date().toISOString().split("T")[0],
        });
        setIsAddDialogOpen(false);
        loadData(); // Recharger les données
      } else {
        toast.error("Erreur lors du prélèvement de cotisation");
      }
    } catch (error) {
      console.error("Erreur lors du prélèvement de cotisation:", error);
      toast.error("Une erreur est survenue lors du prélèvement de cotisation.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement des cotisations...</span>
        </div>
      </div>
    );
  }

  const cotisationsByMember = getCotisationsByMember();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Gestion des Cotisations
          </h1>
          <p className="text-slate-600 mt-2">
            Gérez les cotisations annuelles et versements ponctuels des membres
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Prélèvement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nouveau Prélèvement de Cotisation</DialogTitle>
              <DialogDescription>
                Effectuez un prélèvement de cotisation pour tous les membres.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type de prélèvement</Label>
                <Select
                  value={newCotisation.type}
                  onValueChange={(value: "annuelle" | "ponctuel") =>
                    setNewCotisation({ ...newCotisation, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annuelle">
                      Prélèvement cotisation annuelle
                    </SelectItem>
                    <SelectItem value="ponctuel">
                      Versement ponctuel (réunion)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Montant par membre (FCFA)</Label>
                <Input
                  type="number"
                  value={newCotisation.montantParMembre}
                  onChange={(e) =>
                    setNewCotisation({
                      ...newCotisation,
                      montantParMembre: Number(e.target.value),
                    })
                  }
                  placeholder="1000000"
                />
              </div>

              <div>
                <Label>Date du prélèvement</Label>
                <Input
                  type="date"
                  value={newCotisation.date}
                  onChange={(e) =>
                    setNewCotisation({
                      ...newCotisation,
                      date: e.target.value,
                    })
                  }
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Total à prélever :</strong>
                  <br />
                  {newCotisation.montantParMembre.toLocaleString()} FCFA ×{" "}
                  {members.length} membres ={" "}
                  <span className="font-bold">
                    {(
                      newCotisation.montantParMembre * members.length
                    ).toLocaleString()}{" "}
                    FCFA
                  </span>
                </p>
              </div>

              <Button
                onClick={handleAddCotisation}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={
                  !newCotisation.montantParMembre || !newCotisation.date
                }
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Effectuer le Prélèvement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
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
              {stats.totalMembres}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Cotisations
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalCotisations.toLocaleString()} FCFA
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Moyenne par Membre
            </CardTitle>
            <Wallet className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.moyenneParMembre.toLocaleString()} FCFA
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des cotisations par membre */}
      <Card>
        <CardHeader>
          <CardTitle>
            Cotisations par Membre ({cotisationsByMember.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cotisationsByMember.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun membre enregistré</p>
              <p className="text-sm">
                Commencez par ajouter des membres au fonds familial.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Date d'adhésion</TableHead>
                  <TableHead>Total Cotisations</TableHead>
                  <TableHead>Nombre de Mouvements</TableHead>
                  <TableHead>Dernier Mouvement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cotisationsByMember.map(({ membre, total, mouvements }) => (
                  <TableRow key={membre.id}>
                    <TableCell className="font-medium">{membre.nom}</TableCell>
                    <TableCell>{membre.ville}</TableCell>
                    <TableCell>
                      {new Date(membre.dateAdhesion).toLocaleDateString(
                        "fr-FR"
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {total.toLocaleString()} FCFA
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {mouvements.length}
                      </span>
                    </TableCell>
                    <TableCell>
                      {mouvements.length > 0 && mouvements[0] ? (
                        <div className="text-sm">
                          <div className="font-medium">
                            {new Date(mouvements[0].date).toLocaleDateString(
                              "fr-FR"
                            )}
                          </div>
                          <div className="text-slate-500 text-xs">
                            {mouvements[0].motif}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">
                          Aucun mouvement
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
