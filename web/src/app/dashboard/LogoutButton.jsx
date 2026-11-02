'use client';
export default function LogoutButton() {
  async function logout() {
    const r = await (await fetch('/api/auth/logout', { method: 'POST' })).json();
    window.location.href = r.redirect; // full reload clears cached state
  }
  return <button onClick={logout}>Log out</button>;
}