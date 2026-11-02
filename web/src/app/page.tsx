export default function HomePage() {
  return (
    <main className="home">
      <section className="card">
        <p className="eyebrow">HOPE, INC. ERP</p>

        <h1>Project Scaffold</h1>

        <p>
          The application foundation is ready for development.
          Database-backed modules will be added in future issues.
        </p>

        <div className="status">
          <span className="dot" />
          Application page loaded
        </div>

        <a href="/api/db-check">Test database connection</a>
      </section>
    </main>
  );
}