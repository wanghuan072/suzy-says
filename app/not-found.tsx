export default function NotFound() {
  return (
    <main id="main-content" className="container page-space">
      <h1>Page not found</h1>
      <p>This page is not available. Choose a game or return to the guides.</p>
      <p className="next-links">
        <a href="/">Home</a>
        <a href="/games">More Games</a>
        <a href="/guides">Guides</a>
      </p>
    </main>
  );
}
