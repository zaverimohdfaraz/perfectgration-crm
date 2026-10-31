"use client";

import { useState } from "react";
import { Eye, EyeOff } from "@/components/icons";

export function PasswordField() {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor="password" className="block text-base font-semibold text-ink">Password</label>
      <div className="relative mt-2">
        <input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          required
          className="h-14 w-full rounded-xl border border-line bg-white pl-4 pr-28 text-lg text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/25"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-2 right-2 flex items-center gap-2 rounded-lg px-3 font-semibold text-brand-deep hover:bg-brand-tint"
        >
          {show ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
