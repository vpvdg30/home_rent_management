import React, { useEffect, useState, useMemo } from "react";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import ImageUpload from "../components/ImageUpload";
import { api, formatINR, formatDate, todayISO } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Wrench, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [preview, setPreview] = useState(null);

  const [form, setForm] = useState({
    building_id: "", title: "", description: "", amount: "",
    expense_date: todayISO(), paid_by: "owner", tenant_id: "", receipt_image: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [eR, bR, tR] = await Promise.all([
        api.get("/expenses"), api.get("/buildings"), api.get("/tenants"),
      ]);
      setItems(eR.data); setBuildings(bR.data); setTenants(tR.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const buildingTenants = useMemo(
    () => tenants.filter(t => t.building_id === form.building_id),
    [tenants, form.building_id]
  );

  const filtered = useMemo(() => filter === "all" ? items : items.filter(e => e.building_id === filter), [items, filter]);

  const totalOwner = filtered.filter(e => e.paid_by === "owner").reduce((s, e) => s + e.amount, 0);
  const totalTenant = filtered.filter(e => e.paid_by === "tenant").reduce((s, e) => s + e.amount, 0);

  const startCreate = () => {
    if (buildings.length === 0) { toast.error("Add a building first"); return; }
    setForm({ ...form, building_id: buildings[0].id, tenant_id: "" });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.building_id || !form.title || !form.amount) { toast.error("Building, title and amount are required"); return; }
    setSaving(true);
    try {
      await api.post("/expenses", { ...form, amount: Number(form.amount) });
      toast.success("Expense saved");
      setOpen(false); load();
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try { await api.delete(`/expenses/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Failed"); }
  };

  return (
    <div data-testid="expenses-page">
      <PageHeader
        eyebrow="Maintenance"
        title="Repairs & expenses"
        description="Track building repairs, plumbing, electrical, and more. Mark whether it was paid by owner or tenant."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={startCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full" data-testid="add-expense-btn">
                <Plus className="w-4 h-4 mr-1" /> New expense
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New expense</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Building</Label>
                  <Select value={form.building_id} onValueChange={(v) => setForm({ ...form, building_id: v, tenant_id: "" })}>
                    <SelectTrigger data-testid="expense-building-select"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Title</Label>
                  <Input data-testid="expense-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Plumbing repair in A-101" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Amount (₹)</Label>
                    <Input type="number" data-testid="expense-amount-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                  <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Date</Label>
                    <Input type="date" data-testid="expense-date-input" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Paid by</Label>
                  <Select value={form.paid_by} onValueChange={(v) => setForm({ ...form, paid_by: v })}>
                    <SelectTrigger data-testid="expense-paidby-select"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="tenant">Tenant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.paid_by === "tenant" && (
                  <div>
                    <Label className="text-[11px] uppercase tracking-widest text-slate-500">Which tenant (optional)</Label>
                    <Select value={form.tenant_id || "none"} onValueChange={(v) => setForm({ ...form, tenant_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Choose tenant" /></SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="none">— Not specified —</SelectItem>
                        {buildingTenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Description</Label>
                  <Textarea rows={2} data-testid="expense-desc-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500 mb-2 block">Receipt</Label>
                  <ImageUpload value={form.receipt_image} onChange={(v) => setForm({ ...form, receipt_image: v })} testid="expense-receipt" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="expense-save-btn">{saving ? "Saving..." : "Save"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All buildings</SelectItem>
            {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Card className="border-slate-200"><CardContent className="px-4 py-2 flex items-center gap-4">
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Owner paid</div><div className="font-display text-base font-semibold text-slate-900" data-testid="owner-total">{formatINR(totalOwner)}</div></div>
          <div className="h-8 w-px bg-slate-200" />
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Tenant paid</div><div className="font-display text-base font-semibold text-slate-900" data-testid="tenant-total">{formatINR(totalTenant)}</div></div>
        </CardContent></Card>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Wrench} title="No expenses yet" description="Record repairs and maintenance costs to see the full picture." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="expenses-grid">
          {filtered.map(e => (
            <Card key={e.id} className="card-lift border-slate-200" data-testid={`expense-card-${e.id}`}>
              <CardContent className="p-4 flex gap-4">
                {e.receipt_image ? (
                  <button onClick={() => setPreview(e.receipt_image)} className="shrink-0" data-testid={`view-expense-receipt-${e.id}`}>
                    <img src={e.receipt_image} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                  </button>
                ) : (
                  <div className="w-20 h-20 shrink-0 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-amber-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-900 truncate">{e.title}</div>
                      <div className="text-xs text-slate-500">{e.building_name} • {formatDate(e.expense_date)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg font-semibold text-slate-900">{formatINR(e.amount)}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={e.paid_by === "owner" ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                      Paid by {e.paid_by}
                    </Badge>
                    {e.tenant_name && <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">{e.tenant_name}</Badge>}
                    <button onClick={() => remove(e.id)} className="ml-auto p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </div>
                  {e.description && <div className="text-xs text-slate-500 mt-2 line-clamp-2">{e.description}</div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="bg-white sm:max-w-2xl">
          <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
          {preview && <img src={preview} alt="receipt" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
