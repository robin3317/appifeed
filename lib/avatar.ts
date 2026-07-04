// We have no profile-picture feature, so each user gets a STABLE avatar chosen
// deterministically from a curated set by hashing their id. That way the same
// user shows the same face everywhere (posts, comments, replies, composer).
const AVATARS = [
  "/assets/images/people1.png",
  "/assets/images/people2.png",
  "/assets/images/people3.png",
  "/assets/images/card_ppl1.png",
  "/assets/images/card_ppl2.png",
  "/assets/images/card_ppl3.png",
  "/assets/images/card_ppl4.png",
  "/assets/images/man.png",
];

export function avatarFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return AVATARS[Math.abs(hash) % AVATARS.length];
}
