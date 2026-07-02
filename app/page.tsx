import Link from "next/link";

// Temporary landing page. Replaced once auth + feed routes exist.
// The feed will become the protected home; unauthenticated users go to /login.
export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <h1>Buddy Script</h1>
      <p>Scaffold is running. Auth and feed are next.</p>
      <div style={{ display: "flex", gap: "1rem" }}>
        <Link href="/login">Login</Link>
        <Link href="/register">Register</Link>
      </div>
    </main>
  );
}
