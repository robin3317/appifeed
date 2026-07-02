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
          padding: "12px 0",
          marginBottom: 24,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          className="container _custom_container"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <img src="/assets/images/logo.svg" alt="Buddy Script" style={{ height: 32 }} />
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ color: "#555", fontWeight: 500 }}>{user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="container _custom_container">
        <div className="_layout_inner_wrap">
          <div className="row justify-content-center">
            <div className="col-xl-7 col-lg-9 col-md-12 col-sm-12">
              <FeedClient initial={initial} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
