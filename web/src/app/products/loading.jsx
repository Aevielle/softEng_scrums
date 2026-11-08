// Shown while the dashboard checks the session and rights on the server.
// Next wraps page.jsx in a Suspense boundary using this file.
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#fbf6dc',
        color: '#1b2a41',
        fontFamily: 'inherit',
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Loading dashboard...</p>
    </div>
  );
}