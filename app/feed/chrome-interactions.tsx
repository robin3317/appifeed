"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

// Wires the static nav's profile dropdown (the provided custom.js is unguarded
// and single-ID, so we don't load it): toggles the dropdown and hooks the
// "Log Out" item up to next-auth signOut. Null-guarded throughout.
export default function ChromeInteractions() {
  useEffect(() => {
    const btn = document.getElementById("_profile_drop_show_btn");
    const drop = document.getElementById("_prfoile_drop");

    const toggle = (e: Event) => {
      e.stopPropagation();
      drop?.classList.toggle("show");
    };
    const outside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (drop && !drop.contains(t) && !btn?.contains(t)) drop.classList.remove("show");
    };

    btn?.addEventListener("click", toggle);
    document.addEventListener("click", outside);

    // Find the "Log Out" entry in the profile dropdown and wire it.
    const logoutLink = Array.from(
      drop?.querySelectorAll<HTMLElement>("._nav_dropdown_link") ?? [],
    ).find((el) => el.textContent?.trim().toLowerCase().includes("log out"));
    const doLogout = (e: Event) => {
      e.preventDefault();
      signOut({ callbackUrl: "/login" });
    };
    logoutLink?.addEventListener("click", doLogout);

    return () => {
      btn?.removeEventListener("click", toggle);
      document.removeEventListener("click", outside);
      logoutLink?.removeEventListener("click", doLogout);
    };
  }, []);

  return null;
}
