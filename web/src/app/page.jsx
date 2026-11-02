
"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./register.module.css";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password
    ) {
      setError("This field is required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Registration failed.");
        return;
      }

      setSuccess(result.message);

      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");

    } catch (err) {
      setError(
        "No internet connection. Please check your Wi-Fi and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>

        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1>Create your account</h1>
            <p>Join Hope, Inc. ERP</p>
          </div>

          <Link
            href="/"
            className={styles.closeButton}
            aria-label="Close registration"
          >
            ×
          </Link>
        </header>

        {/* Account Information */}
        <div className={styles.notice}>
          New accounts are created as <strong>User</strong>.
          Superadmin and Admin roles can only be assigned by
          existing administrators.
        </div>

        <form onSubmit={handleRegister} noValidate>

          {/* First Name and Last Name */}
          <div className={styles.nameRow}>

            <div className={styles.field}>
              <label htmlFor="firstName">
                First name
              </label>

              <input
                id="firstName"
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="lastName">
                Last name
              </label>

              <input
                id="lastName"
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>

          </div>

          {/* Email */}
          <div className={styles.field}>
            <label htmlFor="email">
              Email address
            </label>

            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label htmlFor="password">
              Password
            </label>

            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />

              <button
                type="button"
                className={styles.showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <small className={styles.passwordHint}>
              At least 8 characters, uppercase and lowercase
              letters, a number, and a special character.
            </small>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className={styles.successMessage} role="status">
              {success}
            </div>
          )}

          {/* Register Button */}
          <button
            type="submit"
            className={styles.registerButton}
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </button>

        </form>

        {/* Divider */}
        <div className={styles.divider}>
          <span></span>
          <p>or</p>
          <span></span>
        </div>

        {/* Google Sign In Placeholder */}
        <button
          type="button"
          className={styles.googleButton}
          disabled
          title="Google sign-in is not configured yet"
        >
          <span className={styles.googleIcon}>G</span>
          Continue with Google
        </button>

        {/* Sign In Link */}
        <p className={styles.signInText}>
          Already have an account?{" "}
          <Link href="/signin">
            Sign in
          </Link>
        </p>

      </section>
    </main>
  );
}
