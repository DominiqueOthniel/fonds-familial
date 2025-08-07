"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calculator,
  AlertTriangle,
  CheckCircle,
  Wallet,
  TrendingUp,
  CreditCard,
  Users,
} from "lucide-react";

interface Member {
  id: number;
  name: string;
  totalEpargne: number;
  totalCredits: number;
  partCassation: number;
}

export function Cassation() {
  const [isSimulated, setIsSimulated] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [cassationExecuted, setCassationExecuted] = useState(false);

  const members: Member[] = [
    {
      id: 1,
      name: "Marie Dubois",
      totalEpargne: 12500,
      totalCredits: 0,
      partCassation: 0,
    },
    {
      id: 2,
      name: "Jean Martin",
      totalEpargne: 8750,
      totalCredits: 2000,
      partCassation: 0,
    },
    {
      id: 3,
      name: "Sophie Laurent",
      totalEpargne: 15200,
      totalCredits: 1500,
      partCassation: 0,
    },
    {
      id: 4,
      name: "Pierre Durand",
      totalEpargne: 9800,
      totalCredits: 0,
      partCassation: 0,
    },
    {
      id: 5,
      name: "Anne Moreau",
      totalEpargne: 6900,
      totalCredits: 1200,
      partCassation: 0,
    },
  ];

  const totalFonds = 125430; // Total des fonds disponibles
  const totalEpargnes = members.reduce(
    (sum, member) => sum + member.totalEpargne,
    0
  );
  const totalCreditsEnCours = members.reduce(
    (sum, member) => sum + member.totalCredits,
    0
  );
  const fondsDisponibles = totalFonds - totalCreditsEnCours;

  const simulateCassation = () => {
    const membersWithCassation = members.map((member) => {
      // Calcul de la part basée sur les épargnes moins les crédits en cours
      const contributionNette = member.totalEpargne - member.totalCredits;
      const pourcentage =
        contributionNette / (totalEpargnes - totalCreditsEnCours);
      const partCassation = Math.max(0, fondsDisponibles * pourcentage);

      return {
        ...member,
        partCassation: Math.round(partCassation),
      };
    });

    setIsSimulated(true);
    // Update members with calculated parts (in real app, this would update state)
    members.forEach((member, index) => {
      const cass = membersWithCassation[index];
      member.partCassation = cass ? cass.partCassation : 0;
    });
  };

  const executeCassation = () => {
    setCassationExecuted(true);
    setIsConfirmDialogOpen(false);
    // In real app, this would reset all accounts and distribute funds
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Cassation du Fonds
        </h1>
        <p className="text-slate-600 mt-2">
          Simulation et exécution de la cassation quinquennale du fonds familial
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Attention :</strong> La cassation est une opération
          irréversible qui répartit tous les fonds entre les membres et remet
          les comptes à zéro. Cette opération doit être effectuée tous les 5
          ans.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total des Fonds
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              FCFA {totalFonds.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Épargnes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              FCFA {totalEpargnes.toLocaleString()}
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
              FCFA {totalCreditsEnCours.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Fonds Disponibles
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              FCFA {fondsDisponibles.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button
          onClick={simulateCassation}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={cassationExecuted}
        >
          <Calculator className="h-4 w-4 mr-2" />
          Simuler la Cassation
        </Button>

        {isSimulated && !cassationExecuted && (
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
                  onClick={executeCassation}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Confirmer la Cassation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Total Épargnes</TableHead>
                <TableHead>Crédits en Cours</TableHead>
                <TableHead>Contribution Nette</TableHead>
                <TableHead>Pourcentage</TableHead>
                {isSimulated && <TableHead>Part de Cassation</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const contributionNette =
                  member.totalEpargne - member.totalCredits;
                const pourcentage =
                  (contributionNette / (totalEpargnes - totalCreditsEnCours)) *
                  100;

                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>
                      FCFA {member.totalEpargne.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {member.totalCredits > 0
                        ? `FCFA ${member.totalCredits.toLocaleString()}`
                        : "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      FCFA {contributionNette.toLocaleString()}
                    </TableCell>
                    <TableCell>{pourcentage.toFixed(1)}%</TableCell>
                    {isSimulated && (
                      <TableCell className="font-bold text-green-600">
                        FCFA {member.partCassation.toLocaleString()}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isSimulated && (
        <Card>
          <CardHeader>
            <CardTitle>Résumé de la Cassation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">
                  Méthode de Calcul
                </h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Contribution nette = Épargnes - Crédits en cours</li>
                  <li>
                    • Pourcentage = Contribution nette / Total contributions
                    nettes
                  </li>
                  <li>• Part = Pourcentage × Fonds disponibles</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">
                  Total à Distribuer
                </h3>
                <div className="text-2xl font-bold text-green-600">
                  FCFA{" "}
                  {members
                    .reduce((sum, member) => sum + member.partCassation, 0)
                    .toLocaleString()}
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Répartition basée sur les contributions nettes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
