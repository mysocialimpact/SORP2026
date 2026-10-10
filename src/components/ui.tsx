import Link from "next/link";
import type { ReactNode } from "react";
export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Button({
  href,
  children,
  light = false,
}: {
  href: string;
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <Link className={`button ${light ? "button-light" : ""}`} href={href}>
      {children}
      <Arrow />
    </Link>
  );
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="eyebrow">
      <span aria-hidden="true" />
      {children}
    </p>
  );
}
export function Botanical({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={`botanical ${small ? "botanical-small" : ""}`}
      viewBox="0 0 420 470"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="210" cy="235" r="177" stroke="currentColor" opacity=".14" />
      <circle cx="210" cy="235" r="145" stroke="currentColor" opacity=".1" />
      <path
        d="M211 422V81M211 339l-89-91M211 284l100-97M211 220l-68-71"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M211 164C130 125 165 48 211 30c46 18 82 95 0 134Z"
        fill="currentColor"
        opacity=".86"
      />
      <path
        d="M209 253C118 255 86 191 99 128c67-6 128 42 110 125Z"
        fill="currentColor"
        opacity=".55"
      />
      <path
        d="M213 306c-10-88 52-151 123-148 13 69-32 143-123 148Z"
        fill="currentColor"
        opacity=".86"
      />
      <path
        d="M209 365c-82 11-143-41-145-108 67-21 142 21 145 108Z"
        fill="currentColor"
        opacity=".8"
      />
      <path
        d="M213 408c-2-73 55-120 117-111 4 61-46 118-117 111Z"
        fill="currentColor"
        opacity=".45"
      />
      <path
        d="M210 164V65m-1 188-82-96m86 149 94-112M209 365 94 282m119 126 91-89"
        stroke="var(--green)"
        strokeWidth="1"
        opacity=".55"
      />
      <path
        d="M357 83v22m-11-11h22M65 186v12m-6-6h12M357 366v16m-8-8h16"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
