import React from "react";

export default function EmptyState({ icon: Icon, title, description, action, testid }) {
  return (
    <div
      data-testid={testid || "empty-state"}
      className="border border-dashed border-slate-300 rounded-2xl bg-white/60 p-10 text-center flex flex-col items-center gap-4"
    >
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
          <Icon className="w-6 h-6 text-indigo-600" strokeWidth={1.75} />
        </div>
      )}
      <div>
        <div className="font-display text-lg font-medium text-slate-900">{title}</div>
        {description && <div className="text-sm text-slate-500 mt-1 max-w-md">{description}</div>}
      </div>
      {action}
    </div>
  );
}
