/* eslint-disable @next/next/no-img-element */
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getFeedPage } from "@/lib/feed";
import LogoutButton from "./logout-button";
import FeedClient from "./feed-client";

// Per-user feed — always rendered on demand, never statically cached.
export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login"); // defense in depth beyond middleware

  const initial = await getFeedPage(user.id);

  return (
    <div
      className="_layout _layout_main_wrapper"
      style={{ minHeight: "100vh", background: "#f4f5f7" }}
    >
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #ececec",
          padding: "12px 32px",
          marginBottom: 24,
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <img src="/assets/images/logo.svg" alt="Buddy Script" style={{ height: 32 }} />
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ color: "#555", fontWeight: 500 }}>{user.name}</span>
          <LogoutButton />
        </div>
      </header>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px 48px" }}>
        <FeedClient initial={initial} />
      </div>
    </div>
  );
}
