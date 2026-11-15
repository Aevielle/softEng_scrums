"use client";

import { useCallback, useEffect, useState } from "react";

// Drop <PendingUsersPanel /> into app/users/UsersClient.jsx, shown only when the viewer is a Superadmin.
// Style with your existing users.module.css classes; inline styles here are minimal placeholders.
export default function PendingUsersPanel() {
  const [pending, setPending] = useState([]);
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/users?status=pending");
    const json = await res.json();
    if (!res.ok) return setMessage({ type: "error", text: json.error || "Could not load pending users." });
    setPending(json.users);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id, body, okText) {
    setBusyId(id);
    setMessage(null);
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setBusyId(null);
    if (!res.ok) return setMessage({ type: "error", text: json.error }); // shows the "last Superadmin" reason
    setMessage({ type: "ok", text: okText });
    load();
  }

  return (
    <section aria-labelledby="pending-title">
      <h2 id="pending-title">Pending approvals ({pending.length})</h2>
      {message && (
        <p role={message.type === "error" ? "alert" : "status"} style={{ color: message.type === "error" ? "#b00020" : "#1b6e2d" }}>
          {message.text}
        </p>
      )}
      {pending.length === 0 ? (
        <p>No users are waiting for approval.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Registered</th><th /></tr>
          </thead>
          <tbody>
            {pending.map((u) => (
              <tr key={u.user_id}>
                <td>{u.first_name} {u.last_name}</td>
                <td>{u.email}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <button disabled={busyId === u.user_id} onClick={() => act(u.user_id, { action: "approve" }, `${u.email} approved.`)}>
                    Approve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// For the existing user table's row actions, "Make Admin" is:
//   act(u.user_id, { action: "set_role", role_id: 2 }, `${u.email} is now an Admin.`)
// and Demote / Block / Delete go through the same endpoints, so the last-Superadmin
// error message appears automatically.
