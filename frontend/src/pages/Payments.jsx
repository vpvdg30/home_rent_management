import React, { useEffect, useState, useMemo } from "react";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import ImageUpload from "../components/ImageUpload";
import { api, formatINR, formatDate, monthLabel, todayISO, currentMonth } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Receipt, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const METHODS = ["cash", "upi", "bank", "cheque", "card", "other"];
const PAYMENT_TYPES = [
  { value: "monthly", label: "Monthly Rent" },
  { value: "custom", label: "Custom Amount" },
  { value: "deposit", label: "Advance / Deposit" },
];

export default function Payments() {
  const [items, setItems] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState({ building_id: "all", month: "" });
  const [preview, setPreview] = useState(null);

  const [form, setForm] = useState({
    tenant_id: "", amount: "", month: currentMonth(), payment_date: todayISO(),
    method: "cash", payment_type: "monthly", sent_to: "",
    notes: "", receipt_image: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [pR, tR, bR] = await Promise.all([
        api.get("/payments"), api.get("/tenants"), api.get("/buildings"),
      ]);
      setItems(pR.data); setTenants(tR.data); setBuildings(bR.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter(p => {
      if (filter.building_id !== "all" && p.building_id !== filter.building_id) return false;
      if (filter.month && p.month !== filter.month) return false;
      return true;
    });
  }, [items, filter]);

  const totalFiltered = filtered.filter(p => !p.is_deposit).reduce((s, p) => s + p.amount, 0);

  const startCreate = () => {
    if (tenants.length === 0) { toast.error("Add a tenant first"); return; }
    setForm({ ...form, tenant_id: tenants[0].id });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.tenant_id || !form.amount) { toast.error("Tenant and amount are required"); return; }
    if (!form.payment_date) { toast.error("Payment date is required"); return; }
    setSaving(true);
    try {
      await api.post("/payments", {
        ...form,
        amount: Number(form.amount),
        is_deposit: form.payment_type === "deposit",
      });
      toast.success("Payment recorded");
      setOpen(false); load();
    } catch { toast.error("Failed to record"); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this payment?")) return;
    try { await api.delete(`/payments/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Failed"); }
  };

  return (
    <div data-testid="payments-page">
      <PageHeader
        eyebrow="Cash flow"
        title="Rent payments"
        description="Log rent and deposit collections. Attach receipts as photos."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={startCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full" data-testid="add-payment-btn">
                <Plus className="w-4 h-4 mr-1" /> Record payment
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Tenant</Label>
                  <Select value={form.tenant_id} onValueChange={(v) => setForm({ ...form, tenant_id: v })}>
                    <SelectTrigger data-testid="global-payment-tenant"><SelectValue placeholder="Choose tenant" /></SelectTrigger>
                    <SelectContent className="bg-white max-h-64">
                      {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name} — {t.building_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Amount (₹)</Label>
                    <Input type="number" data-testid="global-payment-amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                  <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Payment date</Label>
                    <Input type="date" data-testid="global-payment-date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Payment type</Label>
                    <Select value={form.payment_type} onValueChange={(v) => setForm({ ...form, payment_type: v })}>
                      <SelectTrigger data-testid="global-payment-type"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white">
                        {PAYMENT_TYPES.map(pt => <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Method</Label>
                    <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white">
                        {METHODS.map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Rent for month</Label>
                  <Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} disabled={form.payment_type === "deposit"} /></div>
                <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Sent to / Received in</Label>
                  <Input data-testid="global-payment-sentto" value={form.sent_to} onChange={(e) => setForm({ ...form, sent_to: e.target.value })} placeholder="e.g. HDFC UPI, Cash to owner" /></div>
                <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Notes</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <div><Label className="text-[11px] uppercase tracking-widest text-slate-500 mb-2 block">Receipt</Label>
                  <ImageUpload value={form.receipt_image} onChange={(v) => setForm({ ...form, receipt_image: v })} testid="global-payment-receipt" /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="global-payment-save">{saving ? "Saving..." : "Save"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select value={filter.building_id} onValueChange={(v) => setFilter({ ...filter, building_id: v })}>
          <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All buildings</SelectItem>
            {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="month" value={filter.month} onChange={(e) => setFilter({ ...filter, month: e.target.value })} className="sm:w-56" placeholder="Any month" />
        <div className="flex-1" />
        <Card className="border-slate-200"><CardContent className="px-4 py-2 flex items-center gap-3">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">Filtered total</div>
          <div className="font-display text-lg font-semibold text-slate-900" data-testid="filtered-total">{formatINR(totalFiltered)}</div>
        </CardContent></Card>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No payments" description="Record your first rent collection." />
      ) : (
        <Card className="border-slate-200 overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50/50">
                  <th className="py-3 px-4">Date</th><th>Tenant</th><th className="hidden md:table-cell">Month</th><th>Method</th><th className="hidden sm:table-cell">Receipt</th><th className="text-right">Amount</th><th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50" data-testid={`payment-row-${p.id}`}>
                    <td className="py-3 px-4 text-slate-600">{formatDate(p.payment_date)}</td>
                    <td><div className="text-slate-900 font-medium">{p.tenant_name}</div>{p.unit_number && <div className="text-xs text-slate-500">Unit {p.unit_number}</div>}</td>
                    <td className="hidden md:table-cell text-slate-600">
                      {(p.payment_type === "deposit" || p.is_deposit)
                        ? <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Deposit</Badge>
                        : p.payment_type === "custom"
                          ? <span><Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 mr-1">Custom</Badge>{monthLabel(p.month)}</span>
                          : monthLabel(p.month)}
                    </td>
                    <td><span className="uppercase text-[11px] tracking-wider text-slate-600">{p.method}</span>{p.sent_to && <div className="text-[11px] text-slate-400">→ {p.sent_to}</div>}</td>
                    <td className="hidden sm:table-cell">
                      {p.receipt_image ? (
                        <button onClick={() => setPreview(p.receipt_image)} className="p-1.5 rounded-lg hover:bg-slate-100" data-testid={`view-receipt-${p.id}`}><ImageIcon className="w-4 h-4 text-indigo-600" /></button>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="text-right font-semibold text-slate-900">{formatINR(p.amount)}</td>
                    <td><button onClick={() => remove(p.id)} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-500" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
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
