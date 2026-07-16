import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import ImageUpload from "../components/ImageUpload";
import { api, formatINR, formatDate, monthLabel, todayISO, currentMonth } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { ArrowLeft, Plus, Trash2, Phone, Mail, Calendar, Home, Receipt, Wallet, Pencil, StickyNote, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const METHODS = ["cash", "upi", "bank", "cheque", "card", "other"];
const PAYMENT_TYPES = [
  { value: "monthly", label: "Monthly Rent" },
  { value: "custom", label: "Custom Amount" },
  { value: "deposit", label: "Advance / Deposit" },
];

export default function TenantDetail() {
  const { id } = useParams();
  const [t, setT] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [duesNote, setDuesNote] = useState("");
  const [savingDues, setSavingDues] = useState(false);
  const [form, setForm] = useState({
    amount: "", month: currentMonth(), payment_date: todayISO(),
    method: "cash", payment_type: "monthly", sent_to: "",
    notes: "", receipt_image: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [tR, pR] = await Promise.all([api.get(`/tenants/${id}`), api.get(`/tenants/${id}/payments`)]);
      setT(tR.data);
      setPayments(pR.data);
      setDuesNote(tR.data.dues_notes || "");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const openEdit = () => {
    setEditForm({
      name: t.name,
      phone: t.phone || "",
      email: t.email || "",
      building_id: t.building_id,
      unit_number: t.unit_number || "",
      join_date: t.join_date,
      monthly_rent: t.monthly_rent,
      deposit: t.deposit || 0,
      rent_due_day: t.rent_due_day || 5,
      status: t.status || "active",
      notes: t.notes || "",
      dues_notes: t.dues_notes || "",
    });
    setEditOpen(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name || !editForm.monthly_rent) {
      toast.error("Name and rent are required"); return;
    }
    setSaving(true);
    try {
      await api.put(`/tenants/${id}`, {
        ...editForm,
        monthly_rent: Number(editForm.monthly_rent),
        deposit: Number(editForm.deposit || 0),
        rent_due_day: Number(editForm.rent_due_day || 5),
      });
      toast.success("Tenant updated");
      setEditOpen(false); load();
    } catch { toast.error("Failed to update"); } finally { setSaving(false); }
  };

  const saveDuesNote = async () => {
    setSavingDues(true);
    try {
      await api.patch(`/tenants/${id}/dues-note`, { dues_notes: duesNote });
      toast.success("Dues note saved");
      load();
    } catch { toast.error("Failed"); } finally { setSavingDues(false); }
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!form.amount) { toast.error("Enter amount"); return; }
    if (!form.payment_date) { toast.error("Payment date is required"); return; }
    setSaving(true);
    try {
      await api.post("/payments", {
        tenant_id: id,
        amount: Number(form.amount),
        month: form.month,
        payment_date: form.payment_date,
        method: form.method,
        payment_type: form.payment_type,
        sent_to: form.sent_to,
        notes: form.notes,
        receipt_image: form.receipt_image,
        is_deposit: form.payment_type === "deposit",
      });
      toast.success("Payment recorded");
      setOpen(false);
      setForm({ ...form, amount: "", notes: "", receipt_image: "", sent_to: "", payment_type: "monthly" });
      load();
    } catch { toast.error("Failed to record"); } finally { setSaving(false); }
  };

  const deletePayment = async (pid) => {
    if (!window.confirm("Delete this payment record?")) return;
    try {
      await api.delete(`/payments/${pid}`);
      toast.success("Deleted"); load();
    } catch { toast.error("Failed"); }
  };

  if (loading) return <Skeleton className="h-96" />;
  if (!t) return <div>Tenant not found</div>;

  const totalPaid = payments.filter(p => !p.is_deposit).reduce((s, p) => s + p.amount, 0);
  const depositPaid = payments.filter(p => p.is_deposit).reduce((s, p) => s + p.amount, 0);
  const firstPayment = [...payments].sort((a, b) => a.payment_date.localeCompare(b.payment_date))[0];

  return (
    <div data-testid="tenant-detail-page">
      <Link to="/tenants" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4"><ArrowLeft className="w-4 h-4" /> Back to tenants</Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2 border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 text-white relative">
            <button
              onClick={openEdit}
              className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 backdrop-blur-md text-xs transition-colors"
              data-testid="edit-tenant-btn"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit tenant
            </button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md flex items-center justify-center text-2xl font-display">
                {t.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-[11px] tracking-[0.24em] uppercase text-indigo-200">Tenant</div>
                <h1 className="font-display text-3xl font-semibold mt-1" data-testid="tenant-name">{t.name}</h1>
                <div className="text-sm text-indigo-100 mt-1">{t.building?.name}{t.unit_number && ` • Unit ${t.unit_number}`}</div>
              </div>
            </div>
          </div>
          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-700"><Phone className="w-4 h-4 text-slate-400" /> {t.phone || "—"}</div>
            <div className="flex items-center gap-2 text-slate-700"><Mail className="w-4 h-4 text-slate-400" /> {t.email || "—"}</div>
            <div className="flex items-center gap-2 text-slate-700"><Calendar className="w-4 h-4 text-slate-400" /> Joined {formatDate(t.join_date)}</div>
            <div className="flex items-center gap-2 text-slate-700"><Home className="w-4 h-4 text-slate-400" /> Rent due day: {t.rent_due_day}th of every month</div>
            {t.notes && <div className="sm:col-span-2 text-slate-600 border-t border-slate-100 pt-3">{t.notes}</div>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200"><CardContent className="p-5">
            <div className="text-[11px] tracking-[0.2em] uppercase text-slate-500 font-semibold">Monthly Rent</div>
            <div className="font-display text-3xl font-semibold text-slate-900 mt-1">{formatINR(t.monthly_rent)}</div>
          </CardContent></Card>
          <Card className="border-slate-200"><CardContent className="p-5">
            <div className="text-[11px] tracking-[0.2em] uppercase text-slate-500 font-semibold">Advance / Deposit</div>
            <div className="font-display text-3xl font-semibold text-slate-900 mt-1">{formatINR(t.deposit)}</div>
            <div className="text-xs text-slate-500 mt-1">Paid: {formatINR(depositPaid)}</div>
          </CardContent></Card>
          <Card className="border-slate-200"><CardContent className="p-5">
            <div className="text-[11px] tracking-[0.2em] uppercase text-slate-500 font-semibold">Total collected</div>
            <div className="font-display text-3xl font-semibold text-slate-900 mt-1">{formatINR(totalPaid)}</div>
            {firstPayment && <div className="text-xs text-slate-500 mt-1">First payment: {formatDate(firstPayment.payment_date)}</div>}
          </CardContent></Card>
        </div>
      </div>

      {/* Rent history + Dues notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card className="border-slate-200" data-testid="rent-history-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <div>
                <div className="text-[11px] tracking-[0.2em] uppercase text-slate-500 font-semibold">Rent changes</div>
                <div className="font-display text-base text-slate-900">Rent revision history</div>
              </div>
            </div>
            {(!t.rent_history || t.rent_history.length === 0) ? (
              <div className="text-sm text-slate-500 py-4">
                No rent revisions yet. Rent is <span className="font-semibold text-slate-800">{formatINR(t.monthly_rent)}</span> since {formatDate(t.join_date)}.
              </div>
            ) : (
              <ol className="relative border-l border-slate-200 ml-2 space-y-4">
                {[...t.rent_history].reverse().map((h, idx) => (
                  <li key={idx} className="ml-4" data-testid={`rent-history-${idx}`}>
                    <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
                    <div className="text-xs text-slate-500">{formatDate(h.updated_at)}</div>
                    <div className="text-sm text-slate-900 mt-1">
                      <span className="text-slate-400 line-through">{formatINR(h.previous_rent)}</span>
                      <span className="mx-2 text-slate-400">→</span>
                      <span className="font-semibold">{formatINR(h.new_rent)}</span>
                      <Badge variant="outline" className={`ml-2 text-[10px] ${h.new_rent > h.previous_rent ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                        {h.new_rent > h.previous_rent ? "↑ Increased" : "↓ Reduced"} by {formatINR(Math.abs(h.new_rent - h.previous_rent))}
                      </Badge>
                    </div>
                  </li>
                ))}
                <li className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-slate-300 border-2 border-white" />
                  <div className="text-xs text-slate-500">{formatDate(t.join_date)}</div>
                  <div className="text-sm text-slate-900 mt-1">Initial rent set at <span className="font-semibold">{formatINR(t.rent_history[0]?.previous_rent ?? t.monthly_rent)}</span></div>
                </li>
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200" data-testid="dues-notes-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <StickyNote className="w-4 h-4 text-amber-600" />
              <div>
                <div className="text-[11px] tracking-[0.2em] uppercase text-slate-500 font-semibold">Dues & follow-ups</div>
                <div className="font-display text-base text-slate-900">Notes on pending rents</div>
              </div>
            </div>
            <Textarea
              rows={5}
              value={duesNote}
              onChange={(e) => setDuesNote(e.target.value)}
              placeholder="e.g. Nov 2025 rent still pending ₹5000. Promised to pay by 15th Feb. Called 3 times."
              data-testid="dues-notes-input"
              className="text-sm"
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={saveDuesNote}
                disabled={savingDues || duesNote === (t.dues_notes || "")}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-full"
                data-testid="save-dues-notes-btn"
              >
                {savingDues ? "Saving..." : "Save note"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <PageHeader
        eyebrow="History"
        title="Rent payment history"
        description="Every recorded rent and deposit, with attached receipts if available."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full" data-testid="record-payment-tenant-btn">
                <Plus className="w-4 h-4 mr-1" /> Record payment
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="payment-dialog">
              <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
              <form onSubmit={submitPayment} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Amount (₹)</Label>
                    <Input type="number" data-testid="payment-amount-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                  <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Payment date</Label>
                    <Input type="date" data-testid="payment-date-input" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Payment type</Label>
                    <Select value={form.payment_type} onValueChange={(v) => setForm({ ...form, payment_type: v })}>
                      <SelectTrigger data-testid="payment-type-select"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white">
                        {PAYMENT_TYPES.map(pt => <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Method</Label>
                    <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                      <SelectTrigger data-testid="payment-method-select"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white">
                        {METHODS.map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Rent for month</Label>
                  <Input type="month" data-testid="payment-month-input" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} disabled={form.payment_type === "deposit"} /></div>
                <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Sent to / Received in</Label>
                  <Input data-testid="payment-sentto-input" value={form.sent_to} onChange={(e) => setForm({ ...form, sent_to: e.target.value })} placeholder="e.g. HDFC UPI, Cash to owner, SBI A/C" /></div>
                <div><Label className="text-[11px] uppercase tracking-widest text-slate-500">Notes</Label>
                  <Textarea rows={2} data-testid="payment-notes-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <div><Label className="text-[11px] uppercase tracking-widest text-slate-500 mb-2 block">Receipt</Label>
                  <ImageUpload value={form.receipt_image} onChange={(v) => setForm({ ...form, receipt_image: v })} testid="payment-receipt" /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="payment-cancel-btn">Cancel</Button>
                  <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="payment-save-btn">{saving ? "Saving..." : "Save"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {payments.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-white/60"><CardContent className="p-10 text-center text-slate-500">No payments recorded yet.</CardContent></Card>
      ) : (
        <div className="space-y-3" data-testid="payment-history-list">
          {payments.map(p => (
            <Card key={p.id} className="border-slate-200">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                {p.receipt_image ? (
                  <img src={p.receipt_image} alt="receipt" className="w-full sm:w-20 h-20 object-cover rounded-lg border border-slate-200" />
                ) : (
                  <div className="w-full sm:w-20 h-20 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    {p.is_deposit ? <Wallet className="w-6 h-6 text-indigo-500" /> : <Receipt className="w-6 h-6 text-indigo-500" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-900">
                      {p.payment_type === "deposit" || p.is_deposit
                        ? "Advance / Deposit"
                        : p.payment_type === "custom"
                        ? `Custom — ${monthLabel(p.month)}`
                        : `Rent — ${monthLabel(p.month)}`}
                    </span>
                    <Badge variant="outline" className="uppercase text-[10px] border-slate-200 bg-slate-50 text-slate-700">{p.method}</Badge>
                    {(p.payment_type === "deposit" || p.is_deposit) && <Badge className="bg-purple-100 text-purple-700 border-purple-200" variant="outline">Deposit</Badge>}
                    {p.payment_type === "custom" && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Custom</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Paid on {formatDate(p.payment_date)}</div>
                  {p.sent_to && <div className="text-xs text-slate-600 mt-1"><span className="text-slate-400">Sent to:</span> {p.sent_to}</div>}
                  {p.notes && <div className="text-xs text-slate-500 mt-1">{p.notes}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right"><div className="font-display text-xl font-semibold text-slate-900">{formatINR(p.amount)}</div></div>
                  <button onClick={() => deletePayment(p.id)} className="p-2 rounded-lg hover:bg-red-50" data-testid={`delete-payment-${p.id}`}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit tenant dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-white sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="edit-tenant-dialog">
          <DialogHeader><DialogTitle>Edit tenant</DialogTitle></DialogHeader>
          {editForm && (
            <form onSubmit={submitEdit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-[11px] uppercase tracking-widest text-slate-500">Name</Label>
                <Input data-testid="edit-name-input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-500">Phone</Label>
                <Input data-testid="edit-phone-input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-500">Email</Label>
                <Input data-testid="edit-email-input" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-500">Unit / Flat #</Label>
                <Input data-testid="edit-unit-input" value={editForm.unit_number} onChange={(e) => setEditForm({ ...editForm, unit_number: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-500">Join date</Label>
                <Input type="date" value={editForm.join_date} onChange={(e) => setEditForm({ ...editForm, join_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-500">Monthly rent (₹) — changes logged</Label>
                <Input type="number" data-testid="edit-rent-input" value={editForm.monthly_rent} onChange={(e) => setEditForm({ ...editForm, monthly_rent: e.target.value })} />
                {Number(editForm.monthly_rent) !== Number(t.monthly_rent) && (
                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mt-1">
                    Rent will change from {formatINR(t.monthly_rent)} → {formatINR(editForm.monthly_rent || 0)}. This will be logged in rent history.
                  </div>
                )}
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-500">Advance / Deposit (₹)</Label>
                <Input type="number" value={editForm.deposit} onChange={(e) => setEditForm({ ...editForm, deposit: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-500">Rent due day</Label>
                <Input type="number" min="1" max="28" value={editForm.rent_due_day} onChange={(e) => setEditForm({ ...editForm, rent_due_day: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-slate-500">Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger data-testid="edit-status-select"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="vacated">Vacated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-[11px] uppercase tracking-widest text-slate-500">Notes</Label>
                <Textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>
              <DialogFooter className="md:col-span-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="edit-save-btn">{saving ? "Saving..." : "Save changes"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
