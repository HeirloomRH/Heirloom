import { Link } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
export default function NotFound() {
  const t = useT();
  return (
    <main id="main" className="shell empty-state">
      <p className="eyebrow">{t.common.notFound.eyebrow}</p>
      <h1 className="product-title">{t.common.notFound.title}</h1>
      <p>{t.common.notFound.body}</p>
      <Link className="button primary" to="/">
        {t.common.notFound.cta}
      </Link>
    </main>
  );
}
