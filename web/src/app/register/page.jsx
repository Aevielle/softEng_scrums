"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./register.module.css";
import { registerUser } from "../lib/auth";

function EyeIcon({ off }) {
  return off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

export default function RegisterPage({
  modal = false,
  onClose,
  onSwitchToLogin,
}) {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdEmail, setCreatedEmail] = useState(null);
  const [emailSent, setEmailSent] = useState(null); // true | false | null (unknown)

  // Toast: { type: "error" | "success", title, message }
  const [notice, setNotice] = useState(null);

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const hasMinimumLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9\s]/.test(password);
  const hasStrongMix = hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const passwordsMatch =
    password.length > 0 && password === confirmPassword;

  // Highlight fields only after the first submit attempt.
  const badFirst = submitted && !firstName.trim();
  const badLast = submitted && !lastName.trim();
  const badEmail = submitted && (!email.trim() || !validEmail);
  const badPassword =
    submitted && (!password || !hasMinimumLength || !hasStrongMix);
  const badConfirm = submitted && (!confirmPassword || !passwordsMatch);

  // The standalone /register route IS the popup on the landing page:
  // send the visitor there so the popup opens.
  useEffect(() => {
    if (modal) return;
    const params = new URLSearchParams(window.location.search);
    params.set("auth", "register");
    router.replace(`/?${params.toString()}`);
  }, [modal, router]);

  // Toast closes itself after a few seconds.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(
      () => setNotice(null),
      notice.type === "success" ? 8000 : 6000
    );
    return () => clearTimeout(timer);
  }, [notice]);

  function showError(title, message) {
    setNotice({ type: "error", title, message });
  }

  // Typing clears an error toast.
  function change(setter) {
    return (event) => {
      setter(event.target.value);
      if (notice?.type === "error") setNotice(null);
    };
  }

  async function handleRegister(event) {
    event.preventDefault();

    setSubmitted(true);
    setNotice(null);

    // Required fields
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      showError("Empty Field", "Please fill out the forms.");
      return;
    }

    // Email validation
    if (!validEmail) {
      showError("Wrong Email", "Enter valid email address.");
      return;
    }

    // Password validation
    if (!hasMinimumLength || !hasStrongMix) {
      showError(
        "Password too weak",
        "Use 8+ characters with uppercase, lowercase, numbers, and special characters."
      );
      return;
    }

    // Confirm password validation
    if (!passwordsMatch) {
      showError("Passwords do not match", "Re-enter the same password.");
      return;
    }

    setLoading(true);

    try {
      const result = await registerUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (!result.ok) {
        showError(
          "Registration Failed",
          result.message || "Registration failed."
        );
        return;
      }

      setCreatedEmail(email.trim().toLowerCase());
      setEmailSent(typeof result.emailSent === "boolean" ? result.emailSent : null);

      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setSubmitted(false);
    } catch (err) {
      showError(
        "Connection Error",
        "Unable to connect. Please check your internet connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Standalone /register: nothing to draw while the redirect above runs
  if (!modal) return null;

  return (
    <main className={`${styles.page} ${modal ? styles.modalPage : ""}`}>

      {/* Error / success notification */}
      {notice && (
        <div
          className={`${styles.toast} ${
            notice.type === "success" ? styles.toastSuccess : ""
          }`}
          role={notice.type === "success" ? "status" : "alert"}
        >
          <span className={styles.toastIcon} aria-hidden="true">
            {notice.type === "success" ? "✓" : "!"}
          </span>

          <div>
            <strong>{notice.title}</strong>
            <p>{notice.message}</p>
          </div>

          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setNotice(null)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}

      <section className={styles.card}>
        {createdEmail ? (
          <div className={styles.successView} role="status">
            {modal ? (
              <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">×</button>
            ) : (
              <Link href="/" className={styles.closeButton} aria-label="Close">×</Link>
            )}

            <span className={styles.successAvatar}><UserIcon /></span>
            <span className={styles.successBadge}>Account Created</span>

            <h1 className={styles.successTitle}>Sign up successful</h1>
            <p className={styles.successText}>
              {emailSent === true
                ? "We sent a confirmation email to your inbox (check spam too). Your account is waiting for approval from an Admin."
                : emailSent === false
                  ? "Your account was created and is waiting for approval from an Admin. We couldn't send the confirmation email right now."
                  : "Your account was created and is waiting for approval from an Admin."}
            </p>

            <dl className={styles.successDetails}>
              <div className={styles.detailRow}>
                <dt>Email</dt>
                <dd>{createdEmail}</dd>
              </div>
              <div className={styles.detailRow}>
                <dt>Role</dt>
                <dd>User</dd>
              </div>
              <div className={styles.detailRow}>
                <dt>Status</dt>
                <dd>Pending approval</dd>
              </div>
            </dl>

            {modal ? (
              <button type="button" className={styles.successButton} onClick={onSwitchToLogin}>
                Go to sign in
              </button>
            ) : (
              <Link href="/login" className={styles.successButton}>Go to sign in</Link>
            )}
          </div>
        ) : (
          <>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1>Create your account</h1>
            <p>New accounts start as User.</p>
          </div>

          {modal ? (
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close registration"
            >
              ×
            </button>
          ) : (
            <Link
              href="/"
              className={styles.closeButton}
              aria-label="Close registration"
            >
              ×
            </Link>
          )}
        </header>

        <form onSubmit={handleRegister} noValidate>

          {/* First Name */}
          <div className={styles.field}>
            <label htmlFor="firstName">First name</label>
            <input
              id="firstName"
              type="text"
              className={badFirst ? styles.bad : ""}
              placeholder={
                badFirst ? "Please fill out this form" : "Enter your first name"
              }
              value={firstName}
              onChange={change(setFirstName)}
              autoComplete="given-name"
              aria-invalid={badFirst}
            />
          </div>

          {/* Last Name */}
          <div className={styles.field}>
            <label htmlFor="lastName">Last name</label>
            <input
              id="lastName"
              type="text"
              className={badLast ? styles.bad : ""}
              placeholder={
                badLast ? "Please fill out this form" : "Enter your last name"
              }
              value={lastName}
              onChange={change(setLastName)}
              autoComplete="family-name"
              aria-invalid={badLast}
            />
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={badEmail ? styles.bad : ""}
              placeholder={
                submitted && !email.trim()
                  ? "Please fill out this form"
                  : "Enter your email"
              }
              value={email}
              onChange={change(setEmail)}
              autoComplete="email"
              aria-invalid={badEmail}
            />
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label htmlFor="password">Password</label>

            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className={badPassword ? styles.bad : ""}
                placeholder={
                  submitted && !password
                    ? "Please fill out this form"
                    : "Create a password"
                }
                value={password}
                onChange={change(setPassword)}
                autoComplete="new-password"
                aria-invalid={badPassword}
              />

              <button
                type="button"
                className={styles.showPassword}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className={styles.field}>
            <label htmlFor="confirmPassword">Confirm password</label>

            <div className={styles.passwordWrapper}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className={badConfirm ? styles.bad : ""}
                placeholder={
                  submitted && !confirmPassword
                    ? "Please fill out this form"
                    : "Confirm your password"
                }
                value={confirmPassword}
                onChange={change(setConfirmPassword)}
                autoComplete="new-password"
                aria-invalid={badConfirm}
              />

              <button
                type="button"
                className={styles.showPassword}
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                <EyeIcon off={showConfirmPassword} />
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className={styles.passwordRequirements}>
            <p className={hasMinimumLength ? styles.requirementMet : ""}>
              <span>{hasMinimumLength ? "✓" : "○"}</span>
              At least 8 characters
            </p>

            <p className={hasStrongMix ? styles.requirementMet : ""}>
              <span>{hasStrongMix ? "✓" : "○"}</span>
              Includes letters (both uppercase and lowercase), numbers, and special characters
            </p>

            <p className={passwordsMatch ? styles.requirementMet : ""}>
              <span>{passwordsMatch ? "✓" : "○"}</span>
              Passwords match
            </p>
          </div>

          {/* Register Button */}
          <button
            type="submit"
            className={styles.registerButton}
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {/* Sign In */}
        <p className={styles.signInText}>
          Have an account?{" "}

          {modal ? (
            <button
              type="button"
              className={styles.modalLink}
              onClick={onSwitchToLogin}
            >
              Sign in.
            </button>
          ) : (
            <Link href="/login">Sign in.</Link>
          )}
        </p>
        </>
        )}
      </section>
    </main>
  );
}
