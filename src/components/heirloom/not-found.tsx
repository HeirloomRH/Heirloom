import { Link } from "@tanstack/react-router";
export default function NotFound() {
  return (
    <main id="main" className="shell empty-state">
      <p className="eyebrow">404 / A LITTLE OFF THE PATH</p>
      <h1 className="product-title">Let’s find your way back.</h1>
      <p>This page isn’t part of the plan.</p>
      <Link className="button primary" to="/">
        Back to Heirloom
      </Link>
    </main>
  );
}
