async function postJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  // An HTML error page or empty body becomes {} instead of throwing
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function loginUser(email, password, remember) {
  const { res, data } = await postJson("/api/auth/login", { email, password, remember });
  return res.ok
    ? { ...data, ok: true }
    : { ...data, ok: false, message: data.message || "Something went wrong. Please try again." };
}

export async function registerUser(payload) {
  const { res, data } = await postJson("/api/auth/register", payload);
  return {
    ok: res.ok,
    message: data.message || (res.ok ? "" : "Registration failed. Please try again."),
  };
}