import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatINR, formatDate } from "../lib/api";
import PageHeader from "../components/PageHeader";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { ArrowLeft, MapPin, Users, Wrench, Wallet } from "lucide-react";

export default function BuildingDetail() {
  const { id } = useParams();
  const [b, setB] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [bR, tR, eR, pR] = await Promise.all([
          api.get(`/buildings/${id}`),
          api.get(`/tenants?building_id=${id}`),
          api.get(`/expenses?building_id=${id}`),
          api.get(`/payments?building_id=${id}`),
        ]);
        setB(bR.data); setTenants(tR.data); setExpenses(eR.data); setPayments(pR.data);
      } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <Skeleton className="h-96" />;
  if (!b) return <div>Not found</div>;

  const totalIncome = payments.filter(p => !p.is_deposit).reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.filter(e => e.paid_by === "owner").reduce((s, e) => s + e.amount, 0);

  return (
    <div data-testid="building-detail-page">
      <Link to="/buildings" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4"><ArrowLeft className="w-4 h-4" /> Back to buildings</Link>
      <PageHeader
        eyebrow="Building"
        title={b.name}
        description={b.address}
      />

      {b.image && (
        <img src={b.image} alt={b.name} className="w-full max-h-64 object-cover rounded-2xl border border-slate-200 mb-6" />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-slate-200"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider"><Users className="w-3.5 h-3.5" /> Tenants</div><div className="mt-2 font-display text-2xl text-slate-900">{tenants.length}</div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider"><Wallet className="w-3.5 h-3.5" /> Income</div><div className="mt-2 font-display text-2xl text-slate-900">{formatINR(totalIncome)}</div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider"><Wrench className="w-3.5 h-3.5" /> Expenses</div><div className="mt-2 font-display text-2xl text-slate-900">{formatINR(totalExpenses)}</div></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider"><MapPin className="w-3.5 h-3.5" /> Net</div><div className="mt-2 font-display text-2xl text-slate-900">{formatINR(totalIncome - totalExpenses)}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="tenants">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="tenants" data-testid="tab-tenants">Tenants</TabsTrigger>
          <TabsTrigger value="expenses" data-testid="tab-expenses">Expenses</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="mt-4">
          {tenants.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white/60"><CardContent className="p-8 text-center text-slate-500">No tenants in this building yet. <Link to="/tenants" className="text-indigo-600 hover:underline">Add tenant →</Link></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tenants.map(t => (
                <Link key={t.id} to={`/tenants/${t.id}`}>
                  <Card className="card-lift border-slate-200">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{t.name}</div>
                        <div className="text-xs text-slate-500">{t.unit_number && `Unit ${t.unit_number} • `}Joined {formatDate(t.join_date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">{formatINR(t.monthly_rent)}</div>
                        <Badge className={t.current_month_paid ? "bg-emerald-100 text-emerald-700 border-emerald-200 mt-1" : "bg-amber-100 text-amber-700 border-amber-200 mt-1"} variant="outline">
                          {t.current_month_paid ? "Paid" : "Due"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          {expenses.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white/60"><CardContent className="p-8 text-center text-slate-500">No expenses recorded.</CardContent></Card>
          ) : (
            <Card className="border-slate-200"><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Date</th><th>Item</th><th>Paid by</th><th className="text-right px-4">Amount</th>
                </tr></thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id} className="border-b border-slate-100">
                      <td className="py-3 px-4 text-slate-600">{formatDate(e.expense_date)}</td>
                      <td>{e.title}</td>
                      <td><Badge variant="outline" className={e.paid_by === "owner" ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-slate-50 text-slate-700"}>{e.paid_by}</Badge></td>
                      <td className="text-right px-4 font-semibold">{formatINR(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          {payments.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white/60"><CardContent className="p-8 text-center text-slate-500">No payments recorded.</CardContent></Card>
          ) : (
            <Card className="border-slate-200"><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Date</th><th>Tenant</th><th>Method</th><th className="text-right px-4">Amount</th>
                </tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="py-3 px-4 text-slate-600">{formatDate(p.payment_date)}</td>
                      <td className="text-slate-900 font-medium">{p.tenant_name}</td>
                      <td><span className="uppercase text-[11px] tracking-wider">{p.method}</span></td>
                      <td className="text-right px-4 font-semibold">{formatINR(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
