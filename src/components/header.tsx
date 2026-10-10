"use client";
import Link from "next/link";
import { useState } from "react";
import { Arrow } from "./ui";
export function Header({ readinessHref }: { readinessHref: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="header">
      <div className="shell header-inner">
        <Link
          className="wordmark"
          href="/"
          aria-label="SORP 2026 home"
          onClick={() => setOpen(false)}
        >
          SORP
          <span className="wordmark-year">
            2026
            <span className="brand-star" aria-hidden="true">
              ✳
            </span>
          </span>
        </Link>
        <button
          className="menu-toggle"
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
          className={open ? "nav nav-open" : "nav"}
        >
          <Link href="/understanding-sorp" onClick={() => setOpen(false)}>
            Understanding SORP
          </Link>
          <Link href="/#tools" onClick={() => setOpen(false)}>
            Our tools
          </Link>
          <Link href="/#beyond-compliance" onClick={() => setOpen(false)}>
            Beyond compliance
          </Link>
          <Link href="/about" onClick={() => setOpen(false)}>
            About us
          </Link>
          <Link
            className="nav-cta"
            href={readinessHref}
            onClick={() => setOpen(false)}
          >
            Check your readiness <Arrow />
          </Link>
        </nav>
      </div>
    </header>
  );
}
