import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

// Suppress benign ResizeObserver loop warning that appears as CRA red overlay in dev preview
if (typeof window !== "undefined") {
  const RO_MSG = "ResizeObserver loop";
  window.addEventListener("error", (e) => {
    if (e.message && e.message.includes(RO_MSG)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });
  window.addEventListener("unhandledrejection", (e) => {
    if (e.reason?.message?.includes?.(RO_MSG)) e.preventDefault();
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
