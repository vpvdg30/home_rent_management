import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Buildings from "@/pages/Buildings";
import BuildingDetail from "@/pages/BuildingDetail";
import Tenants from "@/pages/Tenants";
import TenantDetail from "@/pages/TenantDetail";
import Payments from "@/pages/Payments";
import Expenses from "@/pages/Expenses";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="buildings" element={<Buildings />} />
            <Route path="buildings/:id" element={<BuildingDetail />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="tenants/:id" element={<TenantDetail />} />
            <Route path="payments" element={<Payments />} />
            <Route path="expenses" element={<Expenses />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
