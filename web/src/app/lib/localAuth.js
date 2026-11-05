const USERS_KEY = "hope_users";
const EXPIRY_SECONDS = 180;

const DEMO_USERS = [
  { email: "superadmin@hope.com", firstName: "Super", lastName: "Admin", role: "super_admin" },
  { email: "admin@hope.com", firstName: "Admin", lastName: "User", role: "admin" },
  { email: "user@hope.com", firstName: "User", lastName: "Demo", role: "user" },
];

function readUsers() {
  try {
    const list = JSON.parse(localStorage.getItem(USERS_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeUsers(list) {
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
}

const norm = (email) => String(email || "").trim().toLowerCase();

function findDemo(email) {
  return DEMO_USERS.find((u) => u.email === norm(email));
}

function findRegistered(email) {
  return readUsers().find((u) => u.email === norm(email));
}

/* Sign in: demo accounts accept any password. Registered accounts need the right password. */
export function loginLocal(email, password) {
  const demo = findDemo(email);
  if (demo) return { ok: true, user: { ...demo } };

  const user = findRegistered(email);
  if (!user) {
    return { ok: false, code: "NOT_FOUND", message: "No account found with that email." };
  }
  if (user.password !== password) {
    return { ok: false, code: "INVALID", message: "Incorrect email or password." };
  }
  if (user.status === "pending") {
    return { ok: false, code: "PENDING", message: "Your account is still waiting for approval." };
  }
  if (user.status === "blocked") {
    return { ok: false, code: "BLOCKED", message: "Your account has been blocked." };
  }
  return {
    ok: true,
    user: { email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
  };
}

/* Register: new accounts start as User and wait for approval. */
export function registerLocal({ firstName, lastName, email, password }) {
  if (findDemo(email) || findRegistered(email)) {
    return { ok: false, message: "That email is already registered." };
  }
  const list = readUsers();
  list.push({
    firstName,
    lastName,
    email: norm(email),
    password, // classroom prototype only: never store plain passwords in a real system
    role: "user",
    status: "pending",
  });
  writeUsers(list);
  return {
    ok: true,
    message: "Registration successful! Your account is waiting for approval.",
  };
}

/* Forgot password: succeeds only for an email that exists. */
export function forgotLocal(email) {
  if (findDemo(email) || findRegistered(email)) {
    return { ok: true, expiresIn: EXPIRY_SECONDS };
  }
  return {
    ok: false,
    code: "NOT_FOUND",
    message: "We couldn't find an account with that email.",
  };
}