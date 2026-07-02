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
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "32px 16px",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>Feed</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ color: "#666" }}>{user.name}</span>
          <LogoutButton />
        </div>
      </header>

      <FeedClient initial={initial} />
    </main>
  );
}
