import Link from "next/link";

/** Branded 404, ported from frontend/404.html. Next renders this for any
 *  unmatched route, replacing the Python app's HTTPException handler that
 *  sniffed the Accept header to decide between HTML and JSON. */
export default function NotFound() {
  return (
    <div id="app" className="error-app">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="brand-logo"
          src="/assets/sssct-logo.png"
          alt="Sri Sathya Sai Central Trust logo"
        />
        <div className="brand-text">
          <span className="sub">Sri Sathya Sai Central Trust</span>
          <h1>PRANAMS Pathfinder</h1>
          <span className="full-form">Prasanthi Nilayam Ashram Management System</span>
        </div>
      </div>

      <div className="error-body">
        <span className="error-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
            <path d="M8.5 8.5l5 5M13.5 8.5l-5 5" />
          </svg>
        </span>
        <h2>Page not found</h2>
        <p>This page doesn&apos;t exist, or the link may be out of date.</p>
        <Link className="cta" href="/">
          Back to PRANAMS Pathfinder
        </Link>
      </div>
    </div>
  );
}
