
"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

useEffect(() => {
  let savedTheme = "dark";

  try {
    const saved = localStorage.getItem("theme");

    if (saved === "light" || saved === "dark") {
      savedTheme = saved;
    }
  } catch {}

  setTheme(savedTheme);
  document.documentElement.dataset.theme = savedTheme;
}, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;

    try {
      localStorage.setItem("theme", nextTheme);
    } catch {
      // Theme still changes for the current page.
    }
  }

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className={`${styles.btn} ${styles.secondary} ${styles.small}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      <span className={styles.toggleText}>
        {theme === "dark" ? "Light" : "Dark"}
      </span>
    </button>
  );
}
