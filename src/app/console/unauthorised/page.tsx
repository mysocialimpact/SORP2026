import Link from "next/link";
export default function Unauthorised() {
  return (
    <main id="main" className="rc-login">
      <p className="rc-eyebrow">Private research console</p>
      <h1>
        This space is
        <br />
        <em>Marcus’s.</em>
      </h1>
      <p>
        Your account is signed in, but does not have access to this private
        research console.
      </p>
      <Link className="rc-button" href="/console/login/">
        Back to sign in
      </Link>
      <Link href="/">Return to SORP2026</Link>
    </main>
  );
}
