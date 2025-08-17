"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "./ui/app-sidebar";
import { Epargnes } from "./pages/epargnes";
import { CommonExpenses } from "./pages/common-expenses";
import { Credits } from "./pages/credits";
import { Members } from "./pages/members";
import { Cassation } from "./pages/cassation";
import { Sessions } from "./pages/sessions";
import { Mouvements } from "./pages/mouvements";
import { Historique } from "./pages/historique";
import { Dons } from "./pages/dons";
import SettingsPage from "./pages/settings";
import { SidebarProvider } from "./ui/sidebar";

import { Toaster } from "./ui/sonner";

interface DashboardProps {
  userRole: string;
  onLogout: () => void;
}

export function Dashboard({ userRole, onLogout }: DashboardProps) {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardHome onPageChange={setCurrentPage} />;
      case "members":
        return <Members />;
      case "epargnes":
        return <Epargnes />;
      case "common-expenses":
        return <CommonExpenses />;

      case "credits":
        return <Credits />;
      case "mouvements":
        return <Mouvements />;
      case "historique":
        return <Historique />;
      case "cassation":
        return <Cassation />;
      case "sessions":
        return <Sessions />;
      case "dons":
        return <Dons />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardHome onPageChange={setCurrentPage} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background text-foreground w-full">
        <AppSidebar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          userRole={userRole}
          onLogout={onLogout}
        />
        <div className="flex-1 overflow-auto pl-4">
          <div className="py-6 pr-4">{renderPage()}</div>
        </div>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}

// Composant Dashboard Home
function DashboardHome({
  onPageChange,
}: {
  onPageChange: (page: string) => void;
}) {
  const [soldeData, setSoldeData] = useState<{
    solde: number;
    soldeFictif: number;
    totalEpargne: number;
    totalRemboursements: number;
    totalInterets: number;
    totalDepensesCommunes: number;
    totalCredit: number;
    totalCreditsRestants: number;
  } | null>(null);
  const [membersCount, setMembersCount] = useState(0);
  const [recentMouvements, setRecentMouvements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (window.electronAPI) {
          const [members, fonds] = await Promise.all([
            window.electronAPI.getMembres(),
            window.electronAPI.getSoldeFonds(),
          ]);

          setSoldeData({
            solde: fonds.solde,
            soldeFictif: fonds.soldeFictif || 0,
            totalEpargne: fonds.totalEpargnesNettes,
            totalRemboursements: fonds.totalRemboursements,
            totalInterets: fonds.totalInterets,
            totalDepensesCommunes: fonds.totalDepensesCommunes,
            totalCredit: fonds.totalCreditsAccordes,
            totalCreditsRestants: fonds.totalCreditsRestants || 0,
          });
          setMembersCount(members.length);
          // Prendre les 5 derniers mouvements
          const mouvements = await window.electronAPI.getMouvements();
          setRecentMouvements(mouvements.slice(0, 5));
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Écouter les événements de mise à jour du fonds
    if (window.electronAPI) {
      const handleFondsUpdated = (data: { montant: number; type: string }) => {
        console.log(
          `Dashboard: Fonds mis à jour - ${data.type} - ${data.montant} FCFA`
        );
        loadData(); // Recharger les données
      };

      window.electronAPI.onFondsUpdated(handleFondsUpdated);

      return () => {
        // Cleanup function
      };
    }
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "epargne":
        return (
          <svg
            className="h-4 w-4 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        );
      case "credit":
        return (
          <svg
            className="h-4 w-4 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
        );
      case "remboursement":
        return (
          <svg
            className="h-4 w-4 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="h-4 w-4 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
            />
          </svg>
        );
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "epargne":
        return "bg-muted";
      case "credit":
        return "bg-muted";
      case "remboursement":
        return "bg-muted";
      default:
        return "bg-muted";
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
      case "depense_commune_fonds":
        return "Dépense Commune";
      case "depense_commune_epargne":
        return "Dépense Épargne";
      default:
        return type;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "À l'instant";
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `Il y a ${diffInDays}j`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tableau de Bord</h1>
        <p className="text-muted-foreground mt-2">
          Bienvenue dans votre système de gestion de fonds familial
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Membres
              </p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? (
                  <span className="text-muted-foreground">Chargement...</span>
                ) : soldeData ? (
                  membersCount
                ) : (
                  "0"
                )}
              </p>
            </div>
            <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Épargnes
              </p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? (
                  <span className="text-muted-foreground">Chargement...</span>
                ) : (
                  `${soldeData?.totalEpargne.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 }) || 0} FCFA`
                )}
              </p>
            </div>
            <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Remboursements
              </p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? (
                  <span className="text-muted-foreground">Chargement...</span>
                ) : (
                  `${
                    soldeData?.totalRemboursements?.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 }) || 0
                  } FCFA`
                )}
              </p>
            </div>
            <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Intérêts + Pénalités
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {loading ? (
                  <span className="text-muted-foreground">Chargement...</span>
                ) : (
                  `${
                    soldeData?.totalInterets?.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 }) || 0
                  } FCFA`
                )}
              </p>
            </div>
            <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Dépenses Communes
              </p>
              <p className="text-2xl font-bold text-red-600">
                {loading ? (
                  <span className="text-muted-foreground">Chargement...</span>
                ) : (
                  `${
                    (soldeData as any)?.totalDepensesCommunes?.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 }) || 0
                  } FCFA`
                )}
              </p>
            </div>
            <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Crédits Actifs
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {loading ? (
                  <span className="text-muted-foreground">Chargement...</span>
                ) : (
                  `${soldeData?.totalCredit.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 }) || 0} FCFA`
                )}
              </p>
            </div>
            <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Solde du Fonds
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {loading ? (
                  <span className="text-muted-foreground">Chargement...</span>
                ) : (
                  `${soldeData?.solde.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 }) || 0} FCFA`
                )}
              </p>
            </div>
            <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Solde Fictif (Si Tous En Règle)
              </p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? (
                  <span className="text-muted-foreground">Chargement...</span>
                ) : (
                  `${soldeData?.soldeFictif.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 }) || 0} FCFA`
                )}
              </p>
              {/* Indication des crédits restants retirée sur demande */}
            </div>
            <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Mouvements Récents
          </h3>
          <div className="space-y-3">
            {recentMouvements.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">Aucun mouvement récent</p>
              </div>
            ) : (
              recentMouvements.map((mouvement, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${getTypeColor(
                        mouvement.type
                      )}`}
                    >
                      {getTypeIcon(mouvement.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {getTypeLabel(mouvement.type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {mouvement.membreNom} -{" "}
                        {mouvement.montant.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(mouvement.date)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Actions Rapides
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onPageChange("members")}
              className="p-4 bg-muted hover:bg-accent rounded-lg text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Nouveau Membre
                  </p>
                  <p className="text-xs text-muted-foreground">Ajouter un membre</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => onPageChange("epargnes")}
              className="p-4 bg-muted hover:bg-accent rounded-lg text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Nouvelle Épargne
                  </p>
                  <p className="text-xs text-muted-foreground">Enregistrer épargne</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => onPageChange("credits")}
              className="p-4 bg-muted hover:bg-accent rounded-lg text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Nouveau Crédit
                  </p>
                  <p className="text-xs text-muted-foreground">Accorder crédit</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => onPageChange("mouvements")}
              className="p-4 bg-muted hover:bg-accent rounded-lg text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Dépense Commune
                  </p>
                  <p className="text-xs text-muted-foreground">Enregistrer dépense</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => onPageChange("sessions")}
              className="p-4 bg-muted hover:bg-accent rounded-lg text-left transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Sessions</p>
                  <p className="text-xs text-muted-foreground">Gérer les sessions</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
