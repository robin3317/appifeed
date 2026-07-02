"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      type="button"
      className="_btn1"
      style={{ padding: "8px 20px" }}
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Log out
    </button>
  );
}
