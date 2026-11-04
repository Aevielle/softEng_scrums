
"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./register.module.css";

export default function RegisterPage({
  modal = false,
  onClose,
  onSwitchToLogin,
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const hasMinimumLength = password.length >= 8;
  const hasLettersAndNumbers =
    /[A-Za-z]/.test(password) && /\d/.test(password);
  const passwordsMatch =
    password.length > 0 && password === confirmPassword;

  async function handleRegister(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    // Required fields
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError("Please complete all required fields.");
      return;
    }

    // Email validation
    if (!validEmail) {
      setError("Please enter a valid email address.");
      return;
    }

    // Password validation
    if (!hasMinimumLength || !hasLettersAndNumbers) {
      setError(
        "Password must contain at least 8 characters, including letters and numbers."
      );
      return;
    }

    // Confirm password validation
    if (!passwordsMatch) {
      setError("Passwords do not match.");
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
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Registration failed.");
        return;
      }

      setSuccess(
        result.message ||
          "Registration successful! Your account is waiting for approval."
      );

      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        "Unable to connect. Please check your internet connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`${styles.page} ${modal ? styles.modalPage : ""}`}>
      <section className={styles.card}>

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
              placeholder="Enter your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
          </div>

          {/* Last Name */}
          <div className={styles.field}>
            <label htmlFor="lastName">Last name</label>
            <input
              id="lastName"
              type="text"
              placeholder="Enter your last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label htmlFor="password">Password</label>

            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />

              <button
                type="button"
                className={styles.showPassword}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "◉" : "◎"}
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
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
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
                {showConfirmPassword ? "◉" : "◎"}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className={styles.passwordRequirements}>
            <p className={hasMinimumLength ? styles.requirementMet : ""}>
              <span>{hasMinimumLength ? "✓" : "○"}</span>
              At least 8 characters
            </p>

            <p className={hasLettersAndNumbers ? styles.requirementMet : ""}>
              <span>{hasLettersAndNumbers ? "✓" : "○"}</span>
              Includes letters and numbers
            </p>

            <p className={passwordsMatch ? styles.requirementMet : ""}>
              <span>{passwordsMatch ? "✓" : "○"}</span>
              Passwords match
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}

          {/* Success */}
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

      </section>
    </main>
  );
}
