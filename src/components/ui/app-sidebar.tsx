"use client";

import {
  LayoutDashboard,
  Users,
  CreditCard,
  Banknote,
  HistoryIcon,
  Calculator,
  Wallet,
  Receipt,
  LogOut,
  User,
  Gift,
  Calendar,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const menuItems = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "members",
    title: "Membres",
    icon: Users,
  },
  {
    id: "epargnes",
    title: "Épargnes",
    icon: CreditCard,
  },
  {
    id: "mouvements",
    title: "Mouvements",
    icon: HistoryIcon,
  },
  {
    id: "common-expenses",
    title: "Dépenses Communes",
    icon: Receipt,
  },
  {
    id: "credits",
    title: "Crédits",
    icon: Banknote,
  },
  {
    id: "cassation",
    title: "Cassation",
    icon: Calculator,
  },
  {
    id: "sessions",
    title: "Sessions",
    icon: Calendar,
  },
  {
    id: "dons",
    title: "Dons",
    icon: Gift,
  },
  {
    id: "settings",
    title: "Paramètres",
    icon: Settings,
  },
];

interface AppSidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  userRole: string;
  onLogout: () => void;
}

export function AppSidebar({
  currentPage,
  onPageChange,
  userRole,
  onLogout,
}: AppSidebarProps) {
  const handleLogout = () => {
    toast.success("Déconnexion réussie !");
    onLogout();
  };

  const getUserDisplayName = () => {
    return userRole === "admin" ? "Administrateur" : "Adjoint";
  };

  return (
    <Sidebar className="border-r border-blue-100" collapsible="none" style={{ ["--sidebar-width"]: "11rem" } as React.CSSProperties}>
      <SidebarHeader className="border-b border-blue-100 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white overflow-hidden">
            <img 
              src="./assets/meeting.png" 
              alt="Famille Tiwa Joseph" 
              className="h-6 w-6 object-cover rounded-sm"
            />
          </div>
          <div>
            <h1 className="text-[0.95rem] font-semibold text-slate-900 font-brand leading-tight">
              Famille Tiwa Joseph
            </h1>
            <p className="text-[0.7rem] text-slate-500">Management System</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onPageChange(item.id)}
                    isActive={currentPage === item.id}
                    className="w-full justify-start gap-3 px-3 py-2.5 text-left hover:bg-blue-50 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-900"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-blue-100 p-4">
        <div className="space-y-3">
          {/* Informations utilisateur */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {getUserDisplayName()}
              </p>
              <p className="text-xs text-slate-500">
                {userRole === "admin" ? "Super administrateur" : "Utilisateur"}
              </p>
            </div>
          </div>

          {/* Bouton de déconnexion */}
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Se déconnecter</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
