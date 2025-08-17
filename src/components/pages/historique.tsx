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
  Search,
  TrendingUp,
  TrendingDown,
  Calculator,
  Loader2,
  Download,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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

export function Historique() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionFilter, setSessionFilter] = useState<string>("all");

  // Charger les données depuis la base de données
  const loadData = async () => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        const [transactionsData, membersData, sessionsData] = await Promise.all([
          window.electronAPI.getMouvements(
            sessionFilter !== "all"
              ? { sessionId: Number(sessionFilter) }
              : undefined
          ),
          window.electronAPI.getMembres(),
          window.electronAPI.getSessions(),
        ]);
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

  // Écouter les événements de suppression de crédit pour recharger les données
  useEffect(() => {
    if (window.electronAPI) {
      const handleCreditDeleted = (creditId: number) => {
        console.log(
          `Crédit ${creditId} supprimé, rechargement de l'historique...`
        );
        loadData();
      };

      window.electronAPI.onCreditDeleted(handleCreditDeleted);

      // Cleanup function
      return () => {
        // Note: Dans une vraie application, on devrait avoir une méthode pour retirer les listeners
        // Mais pour l'instant, on laisse le listener actif
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
    const matchesSession =
      sessionFilter === "all" || Number(sessionFilter) === Number(transaction.sessionId);
    return matchesSearch && matchesType && matchesMember && matchesSession;
  });

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
          <span>Chargement de l'historique...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[95vw] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Historique Financier
          </h1>
          <p className="text-slate-600 mt-2">
            Consultez l'historique complet de tous les mouvements financiers
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
              {(totalIn - totalOut).toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>
              Journal des Mouvements ({filteredTransactions.length})
            </CardTitle>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher par membre ou motif..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-72"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-56">
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
              <Select value={sessionFilter} onValueChange={setSessionFilter}>
                <SelectTrigger className="w-56">
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 &&
          (searchTerm || typeFilter !== "all" || memberFilter !== "all") ? (
            <div className="text-center py-8 text-slate-500">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun mouvement trouvé</p>
              <p className="text-sm">
                Aucun mouvement ne correspond à vos critères de recherche
              </p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun mouvement enregistré</p>
              <p className="text-sm">
                L'historique sera affiché ici une fois que des mouvements auront
                été créés.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap">Membre</TableHead>
                    <TableHead className="whitespace-nowrap">Type</TableHead>
                    <TableHead className="whitespace-nowrap">Montant</TableHead>
                    <TableHead className="min-w-[320px]">Motif</TableHead>
                    <TableHead className="whitespace-nowrap">Session</TableHead>
                    <TableHead className="whitespace-nowrap">Modifié le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
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
                          {transaction.montant.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {transaction.motif}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {(() => {
                          const s = sessions.find((ss) => Number(ss.id) === Number(transaction.sessionId));
                          return s ? (s.nom || `Session ${s.numero}`) : "—";
                        })()}
                      </TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
