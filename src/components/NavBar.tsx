"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default function NavBar() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold text-neutral-900">
            ZnTube
          </Link>
          <Link
            href="/"
            className="text-sm text-neutral-500 transition hover:text-neutral-900"
          >
            Library
          </Link>
          <Link
            href="/topics"
            className="text-sm text-neutral-500 transition hover:text-neutral-900"
          >
            Topics
          </Link>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
