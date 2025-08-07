"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "./ui/app-sidebar";
import { Epargnes } from "./pages/epargnes";
import { CommonExpenses } from "./pages/common-expenses";
import { Credits } from "./pages/credits";
import { Members } from "./pages/members";
import { Cassation } from "./pages/cassation";
import { Mouvements } from "./pages/mouvements";
import { Historique } from "./pages/historique";

import { Toaster } from "./ui/sonner";
import { SidebarProvider } from "./ui/sidebar";

interface DashboardProps {
  userRole: string;
  onLogout: () => void;
}

export function Dashboard({ userRole, onLogout }: DashboardProps) {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardHome />;
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
      default:
        return <DashboardHome />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-slate-50 w-full">
        <div className="w-64 flex-shrink-0">
          <AppSidebar
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            userRole={userRole}
            onLogout={onLogout}
          />
        </div>
        <div className="flex-1 overflow-auto">
          <div className="py-6 pl-0 pr-4">{renderPage()}</div>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}

// Composant Dashboard Home
function DashboardHome() {
  const [soldeData, setSoldeData] = useState<{
    solde: number;
    totalEpargne: number;
    totalCotisations: number;
    totalDepensesCommunes: number;
    totalCredit: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSolde = async () => {
      try {
        if (window.electronAPI) {
          const data = await window.electronAPI.getSoldeFonds();
          setSoldeData(data);
        }
      } catch (error) {
        console.error("Erreur lors du chargement du solde:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSolde();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Tableau de Bord</h1>
        <p className="text-slate-600 mt-2">
          Bienvenue dans votre système de gestion de fonds familial
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Total Membres
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {loading ? (
                  <span className="text-slate-400">Chargement...</span>
                ) : soldeData ? (
                  "6"
                ) : (
                  "0"
                )}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-blue-600"
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

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Total Épargnes
              </p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? (
                  <span className="text-slate-400">Chargement...</span>
                ) : (
                  `${soldeData?.totalEpargne.toLocaleString() || 0} FCFA`
                )}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-green-600"
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

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Total Cotisations
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {loading ? (
                  <span className="text-slate-400">Chargement...</span>
                ) : (
                  `${
                    (soldeData as any)?.totalCotisations?.toLocaleString() || 0
                  } FCFA`
                )}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Dépenses Communes
              </p>
              <p className="text-2xl font-bold text-red-600">
                {loading ? (
                  <span className="text-slate-400">Chargement...</span>
                ) : (
                  `${
                    (
                      soldeData as any
                    )?.totalDepensesCommunes?.toLocaleString() || 0
                  } FCFA`
                )}
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-red-600"
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

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Crédits Actifs
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {loading ? (
                  <span className="text-slate-400">Chargement...</span>
                ) : (
                  `${soldeData?.totalCredit.toLocaleString() || 0} FCFA`
                )}
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-orange-600"
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

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Solde du Fonds
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {loading ? (
                  <span className="text-slate-400">Chargement...</span>
                ) : (
                  `${soldeData?.solde.toLocaleString() || 0} FCFA`
                )}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="h-6 w-6 text-purple-600"
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Activité Récente
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
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
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Nouvelle épargne
                  </p>
                  <p className="text-xs text-slate-500">
                    Marie Dubois - 500,000 FCFA
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400">Il y a 2h</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
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
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Nouveau crédit
                  </p>
                  <p className="text-xs text-slate-500">
                    Jean Martin - 2,000,000 FCFA
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400">Il y a 4h</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-orange-600"
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
                  <p className="text-sm font-medium text-slate-900">
                    Remboursement
                  </p>
                  <p className="text-xs text-slate-500">
                    Sophie Laurent - 300,000 FCFA
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400">Il y a 6h</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Actions Rapides
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
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
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Nouveau Membre
                  </p>
                  <p className="text-xs text-slate-500">Ajouter un membre</p>
                </div>
              </div>
            </button>

            <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
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
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Nouvelle Épargne
                  </p>
                  <p className="text-xs text-slate-500">Enregistrer épargne</p>
                </div>
              </div>
            </button>

            <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-left transition-colors">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-orange-600"
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
                  <p className="text-sm font-medium text-slate-900">
                    Nouveau Crédit
                  </p>
                  <p className="text-xs text-slate-500">Accorder crédit</p>
                </div>
              </div>
            </button>

            <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="h-4 w-4 text-purple-600"
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
                  <p className="text-sm font-medium text-slate-900">
                    Dépense Commune
                  </p>
                  <p className="text-xs text-slate-500">Enregistrer dépense</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
