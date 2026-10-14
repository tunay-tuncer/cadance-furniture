"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FaChevronLeft } from "react-icons/fa";
import { signInWithGoogle, loginWithEmail, registerWithEmail } from "@/lib/firebase/auth";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push("/projects");
    } catch (err: unknown) {
      console.error("Google sign-in error:", err);
      const message = err instanceof Error ? err.message : "Failed to sign in with Google";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
      router.push("/projects");
    } catch (err: unknown) {
      console.error("Email auth error:", err);
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.mainContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>
          Sign in to access your projects and parametric 3D models
        </p>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className={styles.googleBtn}
        >
          <FcGoogle size={20} />
          <span>{loading ? "Connecting..." : "Sign in with Google"}</span>
        </button>

        <div className={styles.divider}>
          <span>or email</span>
        </div>

        <form onSubmit={handleEmailAuth} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading
              ? "Please wait..."
              : isRegistering
              ? "Create Account"
              : "Continue with Email"}
          </button>

          <button
            type="button"
            onClick={() => setIsRegistering((prev) => !prev)}
            style={{
              fontSize: "0.75rem",
              color: "var(--textGrey)",
              textAlign: "center",
              marginTop: "0.25rem",
              textDecoration: "underline",
            }}
          >
            {isRegistering
              ? "Already have an account? Sign in"
              : "Need an account? Register with email"}
          </button>
        </form>

        <Link href="/" className={styles.backButton}>
          <FaChevronLeft size={12} />
          <span>Back to Studio</span>
        </Link>
      </div>
    </section>
  );
}
