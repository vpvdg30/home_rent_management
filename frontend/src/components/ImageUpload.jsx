import React from "react";
import { Upload, X } from "lucide-react";
import { fileToBase64 } from "../lib/api";
import { toast } from "sonner";

export default function ImageUpload({ value, onChange, label = "Attach receipt / photo", testid = "image-upload" }) {
  const inputRef = React.useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image is too large (max 2MB)");
      return;
    }
    try {
      const b64 = await fileToBase64(file);
      onChange(b64);
    } catch {
      toast.error("Failed to read image");
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        data-testid={`${testid}-input`}
      />
      {value ? (
        <div className="relative w-full max-w-xs">
          <img
            src={value}
            alt="attached"
            className="w-full rounded-xl border border-slate-200 object-cover max-h-48"
            data-testid={`${testid}-preview`}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 bg-white/95 rounded-full p-1.5 border border-slate-200 hover:bg-red-50 hover:border-red-200"
            data-testid={`${testid}-remove`}
          >
            <X className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40 rounded-xl px-4 py-6 text-center transition-colors"
          data-testid={`${testid}-trigger`}
        >
          <Upload className="w-5 h-5 text-slate-500 mx-auto mb-2" />
          <div className="text-sm text-slate-700 font-medium">{label}</div>
          <div className="text-xs text-slate-500 mt-1">PNG, JPG up to 2MB</div>
        </button>
      )}
    </div>
  );
}
