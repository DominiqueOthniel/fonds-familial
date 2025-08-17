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
  Calendar,
  TrendingUp,
  Wallet,
  Users,
  Play,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calculator,
  RefreshCw,
  BarChart3,
  Trash2,
  Edit,
  History,
  FileDown,
} from "lucide-react";

interface Session {
  id: number;
  numero: number;
  nom?: string; // Nom personnalisé de la session
  dateDebut: string;
  dateFin: string;
  totalEpargne: number;
  totalInterets: number;
  statut: 'active' | 'terminee' | 'cassation';
  membres: SessionMembre[];
}

interface SessionMembre {
  membreId: number;
  nom: string;
  epargneSession: number;
  interetsSession: number;
  partSession: number;
}

export function Sessions() {
  const { role } = useRole();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionActive, setSessionActive] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isEditNameDialogOpen, setIsEditNameDialogOpen] = useState(false);
  const [editingSessionName, setEditingSessionName] = useState("");
  const [isMovementsDialogOpen, setIsMovementsDialogOpen] = useState(false);
  const [movementsSession, setMovementsSession] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [selectedSessionForMovements, setSelectedSessionForMovements] = useState<Session | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && (window.electronAPI as any).getSessions) {
        const result = await (window.electronAPI as any).getSessions();
        setSessions(result.sessions || []);
        setSessionActive(result.sessionActive || null);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des sessions:", error);
      toast.error("Erreur lors du chargement des sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && (window.electronAPI as any).creerSession) {
        const result = await (window.electronAPI as any).creerSession();
        if (result.success) {
          // Afficher le message principal
          toast.success(result.message || "Nouvelle session créée avec succès");
          
          // Afficher une notification spéciale si des pénalités ont été appliquées
          if (result.penalitesAppliquees && result.penalitesAppliquees > 0) {
            toast.info(`💡 ${result.penalitesAppliquees} pénalités ont été appliquées automatiquement sur les crédits non remboursés.`, {
              duration: 5000,
            });
          }
          
          setIsCreateDialogOpen(false);
          loadSessions();
        } else {
          toast.error(result.message || "Erreur lors de la création de la session");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la création de la session:", error);
      toast.error("Erreur lors de la création de la session");
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async () => {
    if (!selectedSession) return;
    
    setLoading(true);
    try {
      if (window.electronAPI && (window.electronAPI as any).terminerSession) {
        const result = await (window.electronAPI as any).terminerSession(selectedSession.id);
        if (result.success) {
          toast.success(result.message || "Session terminée avec succès");
          setIsTerminateDialogOpen(false);
          setSelectedSession(null);
          loadSessions();
        } else {
          toast.error(result.message || "Erreur lors de la terminaison de la session");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la terminaison de la session:", error);
      toast.error("Erreur lors de la terminaison de la session");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) return;
    setLoading(true);
    try {
      if (window.electronAPI && (window.electronAPI as any).supprimerSession) {
        const result = await (window.electronAPI as any).supprimerSession(
          selectedSession.id
        );
        if (result.success) {
          toast.success(result.message || "Session supprimée avec succès");
          setIsDeleteDialogOpen(false);
          setSelectedSession(null);
          loadSessions();
        } else {
          toast.error(result.message || "Erreur lors de la suppression");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la session:", error);
      toast.error("Erreur lors de la suppression de la session");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSessionName = async () => {
    if (!selectedSession || !editingSessionName.trim()) {
      toast.error("Veuillez entrer un nom pour la session");
      return;
    }
    
    setLoading(true);
    try {
      if (window.electronAPI && (window.electronAPI as any).modifierNomSession) {
        const result = await (window.electronAPI as any).modifierNomSession(
          selectedSession.id,
          editingSessionName.trim()
        );
        if (result.success) {
          toast.success("Nom de session modifié avec succès");
          setIsEditNameDialogOpen(false);
          setSelectedSession(null);
          setEditingSessionName("");
          loadSessions();
        } else {
          toast.error(result.message || "Erreur lors de la modification du nom");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la modification du nom:", error);
      toast.error("Erreur lors de la modification du nom");
    } finally {
      setLoading(false);
    }
  };

  const openEditNameDialog = (session: Session) => {
    setSelectedSession(session);
    setEditingSessionName(session.nom || `Session ${session.numero}`);
    setIsEditNameDialogOpen(true);
  };

  const openMovementsDialog = async (session: Session) => {
    try {
      setLoadingMovements(true);
      setSelectedSessionForMovements(session);
      setIsMovementsDialogOpen(true);
      if (window.electronAPI && (window.electronAPI as any).getMouvements) {
        const list = await (window.electronAPI as any).getMouvements({ sessionId: session.id });
        setMovementsSession(list || []);
      }
    } catch (e) {
      console.error("Erreur chargement mouvements session:", e);
      toast.error("Impossible de charger les mouvements de la session");
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleExportMovements = async (sessionId: number) => {
    try {
      setLoading(true);
      const res = await window.electronAPI.exportMouvementsPdf(sessionId);
      if (res.success) {
        toast.success("PDF des mouvements exporté (ouvert automatiquement)");
      } else {
        toast.error(res.message || "Erreur lors de l'export PDF");
      }
    } catch (e) {
      toast.error("Erreur lors de l'export PDF");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getSessionStatusBadge = (statut: string) => {
    switch (statut) {
      case 'active':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
      case 'terminee':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Terminée</span>;
      case 'cassation':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Cassation</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inconnu</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Gestion des Sessions
        </h1>
        <p className="text-muted-foreground mt-2">
          Système de séances de réunion annuelles en chaîne pour le fonds familial
        </p>
      </div>

      <Alert>
        <BarChart3 className="h-4 w-4" />
        <AlertDescription>
          <strong>Système de Sessions en Chaîne :</strong> Chaque session accumule les épargnes et intérêts. 
          Les intérêts restent dans le fonds disponible, tandis que les épargnes s'accumulent d'une session à l'autre.
          La cassation finale redistribue tous les intérêts selon les mises des membres.
        </AlertDescription>
      </Alert>

      <Alert className="border-border bg-muted">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription>
          <strong>🔄 Système de Pénalités Automatique :</strong> À chaque ouverture de nouvelle session, 
          <strong>toutes les pénalités sur les crédits non remboursés sont appliquées automatiquement</strong> 
          (20% du montant à rembourser). Plus besoin de calendrier ou de vérification manuelle !
        </AlertDescription>
      </Alert>

      {/* Session Active */}
      {sessionActive && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Session Active - {sessionActive.nom || `Session ${sessionActive.numero}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {sessionActive.totalEpargne.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-muted-foreground">Total Épargnes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {sessionActive.totalInterets.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-muted-foreground">Intérêts Session</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {sessionActive.membres.length}
                </div>
                <div className="text-sm text-muted-foreground">Membres Actifs</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>Période :</strong> {formatDate(sessionActive.dateDebut)} - {formatDate(sessionActive.dateFin)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          {role === "admin" && (
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Créer Nouvelle Session
              </Button>
            </DialogTrigger>
          )}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une Nouvelle Session</DialogTitle>
              <DialogDescription>
                Créer une nouvelle session de réunion annuelle. Cela va :
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Terminer la session active actuelle</li>
                  <li>Accumuler les épargnes dans le fonds</li>
                  <li>Ajouter les intérêts au fonds disponible</li>
                  <li><strong>Appliquer automatiquement les pénalités (20%) sur tous les crédits non remboursés</strong></li>
                  <li>Démarrer une nouvelle session</li>
                </ul>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Système de pénalités automatique :</strong> À chaque ouverture de session, 
                    tous les crédits non remboursés reçoivent automatiquement une pénalité de 20% 
                    sur le montant total à rembourser. Plus besoin de calendrier !
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateSession} disabled={loading || role !== "admin"}>
                {loading ? "Création..." : "Créer la Session"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button onClick={loadSessions} variant="outline" disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Historique des Sessions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Historique des Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucune session enregistrée</p>
              <p className="text-sm">
                Créez votre première session pour commencer.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Total Épargnes</TableHead>
                  <TableHead>Intérêts Session</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.nom || `Session ${session.numero}`}
                    </TableCell>
                    <TableCell>
                      {formatDate(session.dateDebut)} - {formatDate(session.dateFin)}
                    </TableCell>
                    <TableCell>
                      {session.totalEpargne.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                    </TableCell>
                    <TableCell>
                      {session.totalInterets.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                    </TableCell>
                    <TableCell>
                      {getSessionStatusBadge(session.statut)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {/* Bouton Modifier le nom - disponible pour toutes les sessions */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditNameDialog(session)}
                        >
                          <Edit className="h-4 w-4 mr-1" /> Modifier le nom
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMovementsDialog(session)}
                        >
                          <History className="h-4 w-4 mr-1" /> Mouvements
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportMovements(session.id)}
                        >
                          <FileDown className="h-4 w-4 mr-1" /> Exporter PDF
                        </Button>
                        
                        {session.statut === 'active' && role === "admin" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSession(session);
                                setIsTerminateDialogOpen(true);
                              }}
                            >
                              Terminer
                            </Button>
                          </>
                        )}
                        {session.statut === 'terminee' && null}
                        {session.statut !== 'active' && role === "admin" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedSession(session);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Détails d'une Session */}
      {selectedSession && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Détails - Session {selectedSession.numero}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {selectedSession.totalEpargne.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Épargnes</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {selectedSession.totalInterets.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Intérêts de Session</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {selectedSession.membres.length}
                </div>
                <div className="text-sm text-muted-foreground">Membres Actifs</div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Épargne Session</TableHead>
                  <TableHead>Intérêts Session</TableHead>
                  <TableHead>Part Session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedSession.membres.map((membre) => (
                  <TableRow key={membre.membreId}>
                    <TableCell className="font-medium">{membre.nom}</TableCell>
                    <TableCell>
                      {membre.epargneSession.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                    </TableCell>
                    <TableCell>
                      {membre.interetsSession.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                    </TableCell>
                    <TableCell>
                      {membre.partSession.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog Terminer Session */}
      <Dialog open={isTerminateDialogOpen} onOpenChange={setIsTerminateDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Terminer la Session {selectedSession?.numero}</DialogTitle>
            <DialogDescription>
              Terminer cette session va :
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Ajouter les épargnes de la session au fonds total</li>
                <li>Ajouter les intérêts au fonds disponible</li>
                <li>Préparer la session pour la cassation</li>
                <li>Permettre la création d'une nouvelle session</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTerminateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleTerminateSession} disabled={loading}>
              {loading ? "Terminaison..." : "Terminer la Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Suppression Session */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-4 w-4" /> Supprimer la Session {selectedSession?.numero}
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. La session sera retirée de la liste.
              Vous ne pouvez pas supprimer une session active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleDeleteSession} disabled={loading} className="bg-red-600 hover:bg-red-700">
              {loading ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifier le Nom de Session */}
      <Dialog open={isEditNameDialogOpen} onOpenChange={setIsEditNameDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Modifier le Nom de la Session</DialogTitle>
            <DialogDescription>
              Modifiez le nom de la session {selectedSession?.numero} pour une meilleure identification.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="editSessionName" className="block text-sm font-medium text-muted-foreground mb-2">
                Nouveau Nom de la Session
              </label>
              <input
                id="editSessionName"
                type="text"
                value={editingSessionName}
                onChange={(e) => setEditingSessionName(e.target.value)}
                placeholder="Ex: Session 2024 - Réunion Annuelle"
                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Donnez un nom descriptif à votre session (ex: "Session 2024", "Réunion de Printemps", etc.)
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditNameDialogOpen(false);
              setSelectedSession(null);
              setEditingSessionName("");
            }}>
              Annuler
            </Button>
            <Button onClick={handleEditSessionName} disabled={loading}>
              {loading ? "Modification..." : "Modifier le Nom"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Mouvements d'une session */}
      <Dialog open={isMovementsDialogOpen} onOpenChange={setIsMovementsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Mouvements – {selectedSessionForMovements?.nom || (selectedSessionForMovements ? `Session ${selectedSessionForMovements.numero}` : "")}
            </DialogTitle>
            <DialogDescription>
              Historique des mouvements enregistrés pendant cette session
            </DialogDescription>
          </DialogHeader>
          {loadingMovements ? (
            <div className="py-8 text-center text-muted-foreground">Chargement…</div>
          ) : movementsSession.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Aucun mouvement</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Membre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Motif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsSession.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {selectedSessionForMovements?.nom || (selectedSessionForMovements ? `Session ${selectedSessionForMovements.numero}` : "")}
                    </TableCell>
                    <TableCell className="font-medium">{m.membreNom}</TableCell>
                    <TableCell>{m.type}</TableCell>
                    <TableCell className={m.montant >= 0 ? "text-green-600" : "text-red-600"}>
                      {m.montant.toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                    </TableCell>
                    <TableCell>{m.motif || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}