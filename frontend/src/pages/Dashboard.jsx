import React, { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { api, formatINR, monthLabel, formatDate } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { Link } from "react-router-dom";
import { Building2, Users, TrendingUp, AlertCircle, Wallet, ArrowUpRight } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const StatCard = ({ icon: Icon, label, value, hint, tone = "indigo", testid }) => {
  const toneMap = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <Card className="card-lift border-slate-200" data-testid={testid}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${toneMap[tone]}`}>
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </div>
        <div className="mt-4 text-[11px] tracking-[0.2em] uppercase text-slate-500 font-semibold">{label}</div>
        <div className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-slate-900" data-testid={`${testid}-value`}>{value}</div>
        {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/dashboard/summary");
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const trend = data?.trend?.map(t => ({ ...t, label: monthLabel(t.month).split(" ")[0] })) || [];

  return (
    <div data-testid="dashboard-page">
      <PageHeader
        eyebrow="Overview"
        title={`Good day — here's your ${monthLabel(data.current_month)} snapshot`}
        description="Rent collection, expenses, pending dues, and portfolio performance at a glance."
        actions={
          <Link to="/payments">
            <Button data-testid="record-payment-btn" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full">
              Record a payment
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Collected this month" value={formatINR(data.month_income)} hint={`Expected ${formatINR(data.expected_rent)}`} tone="emerald" testid="stat-income" />
        <StatCard icon={AlertCircle} label="Pending dues" value={data.pending_count} hint={data.pending_count === 0 ? "All caught up" : "Tenants yet to pay"} tone={data.pending_count > 0 ? "amber" : "slate"} testid="stat-pending" />
        <StatCard icon={Building2} label="Buildings" value={data.total_buildings} tone="indigo" testid="stat-buildings" />
        <StatCard icon={Users} label="Active tenants" value={data.total_tenants} tone="slate" testid="stat-tenants" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2 border-slate-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] tracking-[0.2em] uppercase text-slate-500 font-semibold">Trend</div>
                <div className="font-display text-lg text-slate-900 mt-1">Income vs Expenses — last 6 months</div>
              </div>
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="h-72 w-full" data-testid="trend-chart">
              <ResponsiveContainer>
                <BarChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip formatter={(v) => formatINR(v)} cursor={{ fill: "#F1F5F9" }} contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" fill="#4338CA" radius={[6,6,0,0]} name="Income" />
                  <Bar dataKey="expenses" fill="#F59E0B" radius={[6,6,0,0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-5">
            <div className="text-[11px] tracking-[0.2em] uppercase text-slate-500 font-semibold">Rent Due</div>
            <div className="font-display text-lg text-slate-900 mt-1 mb-4">This month&apos;s pending</div>
            {data.pending_tenants.length === 0 ? (
              <div className="text-sm text-slate-500 py-6 text-center">Everyone has paid — nice work.</div>
            ) : (
              <ul className="divide-y divide-slate-100" data-testid="pending-list">
                {data.pending_tenants.slice(0, 6).map(t => (
                  <li key={t.id} className="py-3 flex items-center justify-between">
                    <div>
                      <Link to={`/tenants/${t.id}`} className="text-sm font-medium text-slate-900 hover:text-indigo-600">{t.name}</Link>
                      <div className="text-xs text-slate-500">{t.building_name} {t.unit_number && `• ${t.unit_number}`}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900">{formatINR(t.monthly_rent)}</div>
                      <Badge variant="outline" className="text-[10px] mt-1 border-amber-200 text-amber-700 bg-amber-50">Due {t.rent_due_day}th</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 mt-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] tracking-[0.2em] uppercase text-slate-500 font-semibold">Recent</div>
              <div className="font-display text-lg text-slate-900 mt-1">Latest rent payments</div>
            </div>
            <Link to="/payments" className="text-sm text-indigo-600 hover:text-indigo-700" data-testid="view-all-payments">View all →</Link>
          </div>
          {data.recent_payments.length === 0 ? (
            <div className="text-sm text-slate-500 py-6 text-center">No payments recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-2">Tenant</th>
                    <th className="py-2">For</th>
                    <th className="py-2">Method</th>
                    <th className="py-2">Paid on</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_payments.map(p => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 text-slate-900 font-medium">{p.tenant_name}</td>
                      <td className="py-3 text-slate-600">{p.is_deposit ? "Advance/Deposit" : monthLabel(p.month)}</td>
                      <td className="py-3"><span className="uppercase text-[11px] tracking-wider text-slate-600">{p.method}</span></td>
                      <td className="py-3 text-slate-600">{formatDate(p.payment_date)}</td>
                      <td className="py-3 text-right font-semibold text-slate-900">{formatINR(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
