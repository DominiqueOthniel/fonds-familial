"use client";

import { useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Lock, Mail, Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Schéma de validation Zod
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Format d'email invalide"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginProps {
  onLoginSuccess: (role: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const result = loginSchema.safeParse(formData);
    if (result.success) {
      setErrors({});
      return true;
    } else {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0] && typeof err.path[0] === "string") {
          fieldErrors[err.path[0]] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
  };

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ quand l'utilisateur commence à taper
    if (errors[field as string]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Veuillez corriger les erreurs dans le formulaire");
      return;
    }

    setIsLoading(true);

    try {
      // Vérifier si on est dans Electron
      if (window.electronAPI) {
        const result = await window.electronAPI.login(formData);

        if (result.success) {
          toast.success("Connexion réussie !");
          onLoginSuccess(result.role || "admin");
        } else {
          toast.error(result.message || "Erreur de connexion");
        }
      } else {
        // Mode développement - simulation
        if (
          formData.email === "admin@tontine.com" &&
          formData.password === "admin1234"
        ) {
          toast.success("Connexion réussie !");
          onLoginSuccess("admin");
        } else if (
          formData.email === "adjoint@tontine.com" &&
          formData.password === "adjoint1234"
        ) {
          toast.success("Connexion réussie !");
          onLoginSuccess("adjoint");
        } else {
          toast.error("Email ou mot de passe incorrect");
        }
      }
    } catch (error) {
      console.error("Erreur de connexion:", error);
      toast.error("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg">
                <Wallet className="h-8 w-8" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Family Fund
            </CardTitle>
            <p className="text-slate-600 mt-2">Connectez-vous à votre compte</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="admin@tontine.com"
                    className={`pl-10 h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500 ${
                      errors.email
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    required
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-slate-700 font-medium"
                >
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    placeholder="••••••••"
                    className={`pl-10 pr-10 h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500 ${
                      errors.password
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-slate-500">Comptes de test :</p>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <p>
                  <strong>Admin:</strong> admin@tontine.com / admin1234
                </p>
                <p>
                  <strong>Adjoint:</strong> adjoint@tontine.com / adjoint1234
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
