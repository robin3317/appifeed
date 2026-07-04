"use client";

import { createContext, useContext } from "react";

// The logged-in user's id, provided at the feed root so nested composers can
// render that user's stable avatar without prop-drilling.
export const CurrentUserContext = createContext<string | null>(null);

export function useCurrentUserId(): string | null {
  return useContext(CurrentUserContext);
}
