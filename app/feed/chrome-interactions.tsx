"use client";

import { useEffect } from "react";

// Wires the static nav's profile dropdown (the provided custom.js is unguarded
// and single-ID, so we don't load it). Post 3-dot dropdowns are handled in
// React per-card. Null-guarded so a missing element never throws.
export default function ChromeInteractions() {
  useEffect(() => {
    const btn = document.getElementById("_profile_drop_show_btn");
    const drop = document.getElementById("_prfoile_drop");
    if (!btn || !drop) return;

    const toggle = (e: Event) => {
      e.stopPropagation();
      drop.classList.toggle("show");
    };
    const outside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!drop.contains(t) && !btn.contains(t)) drop.classList.remove("show");
    };

    btn.addEventListener("click", toggle);
    document.addEventListener("click", outside);
    return () => {
      btn.removeEventListener("click", toggle);
      document.removeEventListener("click", outside);
    };
  }, []);

  return null;
}
