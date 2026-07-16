import React, { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import ImageUpload from "../components/ImageUpload";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { Plus, Building2, MapPin, Trash2, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const defaultForm = { name: "", address: "", description: "", image: "" };

export default function Buildings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/buildings");
      setItems(r.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const startCreate = () => { setEditing(null); setForm(defaultForm); setOpen(true); };
  const startEdit = (b) => { setEditing(b); setForm({ name: b.name, address: b.address || "", description: b.description || "", image: b.image || "" }); setOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/buildings/${editing.id}`, form);
        toast.success("Building updated");
      } else {
        await api.post("/buildings", form);
        toast.success("Building added");
      }
      setOpen(false); load();
    } catch { toast.error("Failed to save"); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/buildings/${id}`);
      toast.success("Building deleted");
      load();
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <div data-testid="buildings-page">
      <PageHeader
        eyebrow="Portfolio"
        title="Your buildings"
        description="Group tenants and expenses by property. Add all the buildings you manage."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={startCreate} data-testid="add-building-btn" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full">
                <Plus className="w-4 h-4 mr-1" /> New building
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-lg" data-testid="building-dialog">
              <DialogHeader><DialogTitle>{editing ? "Edit building" : "New building"}</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Name</Label>
                  <Input data-testid="building-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sai Residency" />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Address</Label>
                  <Input data-testid="building-address-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, city" />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Description / Notes</Label>
                  <Textarea data-testid="building-description-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Number of floors, units, etc." />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Photo</Label>
                  <ImageUpload value={form.image} onChange={(v) => setForm({ ...form, image: v })} label="Add building photo" testid="building-image" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="building-cancel-btn">Cancel</Button>
                  <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="building-save-btn">{saving ? "Saving..." : "Save"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No buildings yet"
          description="Add your first building to start tracking tenants and rent."
          action={<Button onClick={startCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full" data-testid="empty-add-building"><Plus className="w-4 h-4 mr-1" /> Add building</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(b => (
            <Card key={b.id} className="card-lift border-slate-200 overflow-hidden" data-testid={`building-card-${b.id}`}>
              <div className="relative h-40 bg-gradient-to-br from-indigo-100 to-slate-100 overflow-hidden">
                {b.image ? (
                  <img src={b.image} alt={b.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-indigo-300" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to={`/buildings/${b.id}`} className="font-display text-lg font-medium text-slate-900 hover:text-indigo-600" data-testid={`building-name-${b.id}`}>{b.name}</Link>
                    {b.address && <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1"><MapPin className="w-3.5 h-3.5" /> {b.address}</div>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(b)} className="p-2 rounded-lg hover:bg-slate-100" data-testid={`edit-building-${b.id}`}><Pencil className="w-4 h-4 text-slate-500" /></button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-2 rounded-lg hover:bg-red-50" data-testid={`delete-building-${b.id}`}><Trash2 className="w-4 h-4 text-red-500" /></button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete &ldquo;{b.name}&rdquo;?</AlertDialogTitle>
                          <AlertDialogDescription>All tenants, payments and expenses linked to this building will also be deleted.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid={`cancel-delete-${b.id}`}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(b.id)} className="bg-red-600 hover:bg-red-700" data-testid={`confirm-delete-${b.id}`}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {b.description && <p className="text-sm text-slate-500 mt-3 line-clamp-2">{b.description}</p>}
                <Link to={`/buildings/${b.id}`}>
                  <Button variant="outline" className="w-full mt-4 rounded-full" data-testid={`view-building-${b.id}`}>View details</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
