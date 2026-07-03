import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getFeedPage } from "@/lib/feed";
import FeedClient from "./feed-client";
import LogoutButton from "./logout-button";
import ChromeInteractions from "./chrome-interactions";
import {
  NAV_HTML,
  LEFT_SIDEBAR_HTML,
  STORIES_HTML,
  RIGHT_SIDEBAR_HTML,
} from "./shell-html";

// Per-user feed — always rendered on demand, never statically cached.
export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login"); // defense in depth beyond middleware

  const initial = await getFeedPage(user.id);

  // Show the logged-in user's name in the (static) Buddy Script nav profile.
  const navHtml = NAV_HTML.replaceAll("Dylan Field", user.name ?? "User");

  return (
    <div className="_layout _layout_main_wrapper">
      <ChromeInteractions />
      {/* Functional logout — the static nav dropdown has no JS to open it. */}
      <div style={{ position: "fixed", top: 22, right: 20, zIndex: 3000 }}>
        <LogoutButton />
      </div>

      {/* Static chrome ported verbatim from the provided design. */}
      <div dangerouslySetInnerHTML={{ __html: navHtml }} />

      <div className="container _custom_container">
        <div className="_layout_inner_wrap">
          <div className="row">
            <div
              className="col-xl-3 col-lg-3 col-md-12 col-sm-12"
              dangerouslySetInnerHTML={{ __html: LEFT_SIDEBAR_HTML }}
            />

            <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
              <div className="_layout_middle_wrap">
                <div className="_layout_middle_inner">
                  <div dangerouslySetInnerHTML={{ __html: STORIES_HTML }} />
                  {/* Functional feed (create post, posts, likes, comments). */}
                  <FeedClient initial={initial} />
                </div>
              </div>
            </div>

            <div
              className="col-xl-3 col-lg-3 col-md-12 col-sm-12"
              dangerouslySetInnerHTML={{ __html: RIGHT_SIDEBAR_HTML }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
