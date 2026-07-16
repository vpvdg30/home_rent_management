import React, { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, Building2, Users, Receipt, Wrench, Menu, X, KeyRound } from "lucide-react";
import { Toaster } from "sonner";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/buildings", label: "Buildings", icon: Building2, testid: "nav-buildings" },
  { to: "/tenants", label: "Tenants", icon: Users, testid: "nav-tenants" },
  { to: "/payments", label: "Rent Payments", icon: Receipt, testid: "nav-payments" },
  { to: "/expenses", label: "Repairs & Expenses", icon: Wrench, testid: "nav-expenses" },
];

export default function Layout() {
  const [open, setOpen] = useState(false);

  const SidebarInner = (
    <div className="flex flex-col h-full">
      <Link to="/" className="flex items-center gap-3 px-6 py-6 border-b border-slate-800" data-testid="brand-link">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-indigo-300" strokeWidth={2.25} />
        </div>
        <div>
          <div className="font-display text-white text-lg leading-none">RentDesk</div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-slate-400 mt-1">Property OS</div>
        </div>
      </Link>
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, testid }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={() => setOpen(false)}
            data-testid={testid}
            className={({ isActive }) =>
              `sidebar-item flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm ${
                isActive
                  ? "bg-indigo-500/15 text-white border border-indigo-400/20"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent"
              }`
            }
          >
            <Icon className="w-4 h-4" strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-5 border-t border-slate-800">
        <div className="text-[10px] tracking-[0.24em] uppercase text-slate-500">Currency</div>
        <div className="text-sm text-slate-200 mt-1">₹ INR • Indian Rupee</div>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-slate-900 text-slate-300 flex-col sticky top-0 h-screen" data-testid="sidebar-desktop">
        {SidebarInner}
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" data-testid="sidebar-mobile-overlay">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-slate-900 text-slate-300 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              data-testid="close-mobile-nav"
            >
              <X className="w-5 h-5" />
            </button>
            {SidebarInner}
          </aside>
        </div>
      )}

      <main className="app-main">
        {/* Top bar (mobile) */}
        <div className="lg:hidden sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200 flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100"
            data-testid="open-mobile-nav"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <KeyRound className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display text-slate-900 font-medium">RentDesk</span>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1400px] w-full">
          <Outlet />
        </div>
      </main>

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
