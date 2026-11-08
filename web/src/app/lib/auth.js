import { loginLocal } from "./localAuth";

const DEMO_EMAILS = ["superadmin@hope.com", "admin@hope.com", "user@hope.com"];

export async function loginUser(email, password, remember) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, remember }),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, ...data } : { ok: false, ...data };
}

export async function registerUser(data) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}