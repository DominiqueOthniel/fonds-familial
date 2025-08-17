"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Gift, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "../../hooks/useRole";

export function Dons() {
  const { role } = useRole();
  const [dons, setDons] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    membreId: "",
    institution: "",
    montant: "",
    categorie: "aide_scolaire",
  });
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const loadDons = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const donsData = await window.electronAPI.getDons();
        setDons(donsData);
        const membersData = await window.electronAPI.getMembres();
        setMembers(membersData);
      }
    } catch (e) {
      toast.error("Erreur lors du chargement des dons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDons();
  }, []);

  const handleAddDon = async () => {
    if (!form.membreId || !form.institution || !form.montant) {
      toast.error("Tous les champs sont obligatoires");
      return;
    }
    try {
      setLoading(true);
      const res = await window.electronAPI.ajouterDon({
        membreId: Number(form.membreId),
        institution: form.institution,
        montant: Number(form.montant),
        categorie: form.categorie,
      });
      if (res.success) {
        toast.success("Don ajouté avec succès");
        setOpen(false);
        setForm({ membreId: "", institution: "", montant: "", categorie: "aide_scolaire" });
        loadDons();
      } else {
        toast.error("Erreur lors de l'ajout du don");
      }
    } catch (e) {
      toast.error("Erreur lors de l'ajout du don");
    } finally {
      setLoading(false);
    }
  };

  const filteredDons = dons.filter((d) => categoryFilter === 'all' || (d.categorie || '') === categoryFilter);

  const handleDeleteDon = async (id: number) => {
    if (!window.confirm("Supprimer ce don ?")) return;
    try {
      setLoading(true);
      const res = await window.electronAPI.supprimerDon(id);
      if (res.success) {
        toast.success("Don supprimé");
        setDons((prev) => prev.filter((d) => d.id !== id));
      } else {
        toast.error(res.message || "Erreur lors de la suppression");
      }
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Gift className="h-7 w-7 text-blue-600" /> Dons
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" /> Nouveau don
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter un don</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select
                value={form.membreId}
                onValueChange={(v) => setForm((f) => ({ ...f, membreId: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un membre" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Institution"
                value={form.institution}
                onChange={(e) =>
                  setForm((f) => ({ ...f, institution: e.target.value }))
                }
              />
              <Input
                placeholder="Montant"
                type="number"
                value={form.montant}
                onChange={(e) =>
                  setForm((f) => ({ ...f, montant: e.target.value }))
                }
              />
              <Select
                value={form.categorie}
                onValueChange={(v) => setForm((f) => ({ ...f, categorie: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aide_scolaire">Aide scolaire</SelectItem>
                  <SelectItem value="fete_recolte">Fête de récolte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                onClick={handleAddDon}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="bg-white rounded-lg shadow border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-slate-600">Filtrer par catégorie</div>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                <SelectItem value="aide_scolaire">Aide scolaire</SelectItem>
                <SelectItem value="fete_recolte">Fête de récolte</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {filteredDons.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Aucun don enregistré</p>
            <p className="text-sm">Commencez par ajouter votre premier don.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Date</TableHead>
                {role === "admin" && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDons.map((don) => (
                <TableRow key={don.id}>
                  <TableCell>{don.membreNom}</TableCell>
                  <TableCell>{don.institution}</TableCell>
                  <TableCell>{don.categorie === 'aide_scolaire' ? 'Aide scolaire' : don.categorie === 'fete_recolte' ? 'Fête de récolte' : ''}</TableCell>
                  <TableCell className="font-medium text-green-600">
                    {Number(don.montant).toLocaleString('fr-FR', { maximumFractionDigits: 0, minimumFractionDigits: 0 })} FCFA
                  </TableCell>
                  <TableCell>
                    {new Date(don.date).toLocaleDateString("fr-FR")}
                  </TableCell>
                  {role === "admin" && (
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteDon(don.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
