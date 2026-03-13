"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="border-2 border-black bg-white px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_0_#000]"
    >
      Sign Out
    </button>
  );
}
