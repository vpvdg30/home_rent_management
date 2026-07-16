import React, { useEffect, useState, useMemo } from "react";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { api, formatINR, formatDate, todayISO } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Link } from "react-router-dom";
import { Plus, Users, Search, User } from "lucide-react";
import { toast } from "sonner";

const defaultForm = {
  name: "", phone: "", email: "", building_id: "", unit_number: "",
  join_date: todayISO(), monthly_rent: "", deposit: "", rent_due_day: 5,
  status: "active", notes: "",
};

export default function Tenants() {
  const [items, setItems] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [tR, bR] = await Promise.all([api.get("/tenants"), api.get("/buildings")]);
      setItems(tR.data); setBuildings(bR.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter(t => {
      if (buildingFilter !== "all" && t.building_id !== buildingFilter) return false;
      if (q && !t.name.toLowerCase().includes(q.toLowerCase()) && !(t.phone || "").includes(q)) return false;
      return true;
    });
  }, [items, q, buildingFilter]);

  const startCreate = () => {
    if (buildings.length === 0) { toast.error("Please add a building first"); return; }
    setForm({ ...defaultForm, building_id: buildings[0].id });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.building_id || !form.monthly_rent) {
      toast.error("Name, building and rent are required"); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        monthly_rent: Number(form.monthly_rent),
        deposit: Number(form.deposit || 0),
        rent_due_day: Number(form.rent_due_day || 5),
      };
      await api.post("/tenants", payload);
      // if deposit > 0, auto-create a deposit payment
      const res = items; // no-op; we reload below
      toast.success("Tenant added");
      setOpen(false); load();
    } catch { toast.error("Failed to save"); } finally { setSaving(false); }
  };

  return (
    <div data-testid="tenants-page">
      <PageHeader
        eyebrow="People"
        title="Tenants"
        description="See everyone renting from you, their building, rent, and this month's status."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={startCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full" data-testid="add-tenant-btn">
                <Plus className="w-4 h-4 mr-1" /> New tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="tenant-dialog">
              <DialogHeader><DialogTitle>New tenant</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Full name</Label>
                  <Input data-testid="tenant-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Phone</Label>
                  <Input data-testid="tenant-phone-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Email</Label>
                  <Input data-testid="tenant-email-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Building</Label>
                  <Select value={form.building_id} onValueChange={(v) => setForm({ ...form, building_id: v })}>
                    <SelectTrigger data-testid="tenant-building-select"><SelectValue placeholder="Choose" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Unit / Flat #</Label>
                  <Input data-testid="tenant-unit-input" value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} placeholder="A-101" />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Join date</Label>
                  <Input type="date" data-testid="tenant-joindate-input" value={form.join_date} onChange={(e) => setForm({ ...form, join_date: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Rent due day</Label>
                  <Input type="number" min="1" max="28" data-testid="tenant-duedate-input" value={form.rent_due_day} onChange={(e) => setForm({ ...form, rent_due_day: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Monthly rent (₹)</Label>
                  <Input type="number" data-testid="tenant-rent-input" value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })} placeholder="15000" />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Advance / Deposit (₹)</Label>
                  <Input type="number" data-testid="tenant-deposit-input" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} placeholder="30000" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[11px] uppercase tracking-widest text-slate-500">Notes</Label>
                  <Textarea data-testid="tenant-notes-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <DialogFooter className="md:col-span-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="tenant-cancel-btn">Cancel</Button>
                  <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="tenant-save-btn">{saving ? "Saving..." : "Save tenant"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone" className="pl-9" data-testid="tenant-search" />
        </div>
        <Select value={buildingFilter} onValueChange={setBuildingFilter}>
          <SelectTrigger className="sm:w-64" data-testid="tenant-filter-building"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All buildings</SelectItem>
            {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No tenants found" description={items.length === 0 ? "Add your first tenant to get started." : "Try adjusting search or filters."} />
      ) : (
        <Card className="border-slate-200 overflow-hidden">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50/50">
                  <th className="py-3 px-4">Tenant</th>
                  <th className="hidden md:table-cell">Building</th>
                  <th className="hidden sm:table-cell">Joined</th>
                  <th className="text-right">Rent</th>
                  <th className="text-right px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors" data-testid={`tenant-row-${t.id}`}>
                    <td className="py-3 px-4">
                      <Link to={`/tenants/${t.id}`} className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-medium">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 group-hover:text-indigo-600">{t.name}</div>
                          <div className="text-xs text-slate-500">{t.unit_number || "—"} {t.phone && `• ${t.phone}`}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="hidden md:table-cell text-slate-600">{t.building_name}</td>
                    <td className="hidden sm:table-cell text-slate-600">{formatDate(t.join_date)}</td>
                    <td className="text-right font-semibold text-slate-900">{formatINR(t.monthly_rent)}</td>
                    <td className="text-right px-4">
                      <Badge variant="outline" className={t.current_month_paid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                        {t.current_month_paid ? "Paid" : "Due"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
