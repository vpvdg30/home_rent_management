import React from "react";

export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 animate-in-up">
      <div>
        {eyebrow && (
          <div className="text-[11px] font-semibold tracking-[0.24em] uppercase text-indigo-600 mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-slate-500 text-sm sm:text-base max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
