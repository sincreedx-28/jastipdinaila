"use client";

import { useEffect } from "react";

/**
 * Dialogs, dropdowns and toasts render outside the admin layout (at the end
 * of <body>), so they'd miss the admin colours and fonts. Putting the theme
 * class on <body> while an admin page is open fixes that.
 */
export function AdminBodyTheme() {
  useEffect(() => {
    document.body.classList.add("theme-admin");
    return () => document.body.classList.remove("theme-admin");
  }, []);
  return null;
}
