"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
const links = [
  ["/", "Home"],
  ["/are-you-sorp-ready/", "Are You SORP Ready?"],
  ["/ask-sorp/", "Ask SORP"],
  ["/contact/", "Contact"],
];
export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <header className="header gateway-header">
      <div className="gateway-width gateway-header-inner">
        <Link
          className="gateway-wordmark"
          href="/"
          aria-label="SORP 2026 home"
          onClick={() => setOpen(false)}
        >
          SORP<span>2026</span>
          <i aria-hidden="true" />
        </Link>
        <button
          ref={toggle}
          className="gateway-menu"
          aria-expanded={open}
          aria-controls="main-nav"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen(!open)}
        >
          {open ? "Close −" : "Menu +"}
        </button>
        <nav
          id="main-nav"
          aria-label="Main navigation"
          className={`gateway-nav${open ? " is-open" : ""}`}
        >
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                pathname === href ||
                (href !== "/" && pathname.startsWith(href.replace(/\/$/, "")))
                  ? "page"
                  : undefined
              }
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
