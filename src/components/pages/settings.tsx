"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useRole } from "../../hooks/useRole";
import { Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<string>("admin");
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showCurrent, setShowCurrent] = useState<boolean>(false);
  const [showNew, setShowNew] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const { role: requesterRole } = useRole();

  useEffect(() => {
    // Charger le thème depuis localStorage
    const stored = localStorage.getItem("ff_theme");
    const isDark = stored === "dark";
    setDarkMode(isDark);
    updateHtmlTheme(isDark);
  }, []);

  const updateHtmlTheme = (isDark: boolean) => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add("dark");
      localStorage.setItem("ff_theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("ff_theme", "light");
    }
  };

  const handleToggleTheme = (checked: boolean) => {
    setDarkMode(checked);
    updateHtmlTheme(checked);
  };

  const handleChangePassword = async () => {
    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        toast.error("Tous les champs sont obligatoires");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("La confirmation ne correspond pas");
        return;
      }
      if (!window.electronAPI || !window.electronAPI.changePassword) {
        toast.error("API indisponible");
        return;
      }
      const res = await window.electronAPI.changePassword({ requesterRole: requesterRole || "admin", targetRole: role, currentPassword, newPassword });
      if (res.success) {
        toast.success("Mot de passe modifié avec succès");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.message || "Erreur lors du changement de mot de passe");
      }
    } catch (e) {
      toast.error("Erreur lors du changement de mot de passe");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Paramètres</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Thème</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-2">
              <Label htmlFor="darkmode">Mode sombre</Label>
              <Switch id="darkmode" checked={darkMode} onCheckedChange={handleToggleTheme} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Changer le mot de passe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="role">Profil</Label>
              <select
                id="role"
                className="w-full border rounded-md px-3 py-2"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {requesterRole === "admin" && (
                  <option value="admin">Administrateur</option>
                )}
                <option value="adjoint">Adjoint</option>
              </select>
            </div>
            <div>
              <Label htmlFor="current">Mot de passe actuel</Label>
              <div className="relative">
                <Input
                  id="current"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-700"
                  aria-label={showCurrent ? "Masquer" : "Afficher"}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="new">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="new"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-700"
                  aria-label={showNew ? "Masquer" : "Afficher"}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirm">Confirmer le nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-700"
                  aria-label={showConfirm ? "Masquer" : "Afficher"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button onClick={handleChangePassword} className="w-full">
              Mettre à jour
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
