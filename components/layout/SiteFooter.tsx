import { navigation, legalNavigation } from "@/config/navigation";
import { site } from "@/config/site";
export default async function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <img src={site.logo} width="210" height="48" alt={site.name} />
          <p>Listen closely. Choose your next unsettling game.</p>
        </div>
        <nav aria-label="Explore">
          <h2>Explore</h2>
          {navigation.map((n) => (
            <a href={n.path} key={n.path}>
              {n.label}
            </a>
          ))}
        </nav>
        <nav aria-label="Legal">
          <h2>Legal</h2>
          {legalNavigation.map((n) => (
            <a href={n.path} rel="noopener noreferrer nofollow" key={n.path}>
              {n.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="container copyright">
        Copyright © {new Date().getFullYear()} {new URL(site.origin).hostname}.
        All rights reserved.
        <p>
          Independent fan website. Not affiliated with MOONBIT or the game
          creators.
        </p>
      </div>
    </footer>
  );
}
