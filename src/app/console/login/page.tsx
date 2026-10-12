import Link from "next/link";
export default function Login() {
  const configured = Boolean(
    process.env.ADMIN_EMAIL && process.env.SORP_BACKEND_ORIGIN,
  );
  return (
    <main id="main" className="rc-login">
      <Link href="/" className="rc-brand">
        SORP<span>2026</span>
        <i />
      </Link>
      <p className="rc-eyebrow">A private space for a public good</p>
      <h1>
        A little research.
        <br />
        <em>A clearer picture.</em>
      </h1>
      <p>
        Your private headquarters for discovering the UK’s charity-accounting
        expertise.
      </p>
      <div className="rc-panel">
        <span className="rc-tag">Private · Marcus only</span>
        <h2>Welcome to the research console.</h2>
        <p>
          Use your existing SORP2026 email and password. Only the authorised
          account can open research and reports.
        </p>
        {configured ? (
          <Link className="rc-button" href="/login/?return=/console/">
            Log in to SORP2026 <span>↗</span>
          </Link>
        ) : (
          <p role="status">
            Private access needs configuration. The owner’s email and sign-in
            service must be connected before the console can open.
          </p>
        )}
        <small>ChatGPT sign-in is not configured for this website.</small>
      </div>
    </main>
  );
}
