import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import LogoutButton from "./logout-button";

// Protected route. Middleware already gates /feed; this server-side check is
// defense in depth (never trust the edge alone for auth).
export default async function FeedPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "48px 20px",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <h1 style={{ margin: 0 }}>Feed</h1>
        <LogoutButton />
      </div>
      <p style={{ marginTop: 16 }}>
        Signed in as <strong>{user.name}</strong> ({user.email}).
      </p>
      <p style={{ color: "#666" }}>
        Auth works. Posts, likes, and comments come next.
      </p>
    </main>
  );
}
