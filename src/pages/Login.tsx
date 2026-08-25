import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Icon from "../components/Icon.js";
import SliderVerify from "../components/SliderVerify.js";
import { login } from "../services/auth-service.js";
import {
  clearRememberedEmail,
  getRememberedEmail,
  saveAccessToken,
  saveRememberedEmail,
  saveUser,
} from "../services/auth-storage.js";
import { isValidEmail } from "../lib/validation.js";
import { useBranding } from "../context/BrandingProvider.js";
import { REVIEW_COOKIE, clearReviewCookie } from "../lib/review-fixtures.js";

const REVIEW_EMAIL = "gestorcontenido@quopilot.com";
const REVIEW_PASSWORD = "g3st0rc0nt3n1d0";

export default function Login() {
  const rememberedEmail = getRememberedEmail();
  const { logoUrl, brandName } = useBranding();

  const [email, setEmail] = useState(rememberedEmail ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(rememberedEmail !== null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();

  async function handleSubmit() {
    let hasErrors = false;

    if (!email.trim()) {
      setEmailError("El email es obligatorio");
      hasErrors = true;
    } else if (!isValidEmail(email)) {
      setEmailError("Email inválido");
      hasErrors = true;
    }

    if (!password) {
      setPasswordError("La contraseña es obligatoria");
      hasErrors = true;
    }

    if (hasErrors) {
      setAttempt((previous) => previous + 1);

      return;
    }

    setLoading(true);
    setError("");

    // Sesión de revisión de componentes (front-only, SIN backend).
    if (
      email.trim().toLowerCase() === REVIEW_EMAIL &&
      password === REVIEW_PASSWORD
    ) {
      saveAccessToken("review-session");
      saveUser({
        id: "gestor-contenido",
        name: "Gestor de Contenido",
        email: email.trim().toLowerCase(),
        role: "TENANT_ADMIN",
        mustChangePassword: false,
      });
      document.cookie = `${REVIEW_COOKIE}=1; Path=/; SameSite=Lax`;
      navigate("/dashboard", { replace: true });
      return;
    }

    // Al loguear un usuario real: salimos del modo de revisión
    // para que la capa de datos vuelva al backend real.
    clearReviewCookie();

    try {
      const result = await login({
        email,
        password,
      });

      saveAccessToken(result.accessToken);

      saveUser(result.user);

      if (result.user?.mustChangePassword) {
        clearRememberedEmail();
        navigate("/change-password", {
          replace: true,
        });

        return;
      }

      if (remember) {
        saveRememberedEmail(email);
      } else {
        clearRememberedEmail();
      }

      navigate("/dashboard", {
        replace: true,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to login",
      );
      setAttempt((previous) => previous + 1);
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <main className="grid min-h-svh place-items-center p-4 bg-[radial-gradient(1100px_480px_at_50%_-12%,rgba(170,59,255,0.14),transparent_65%),var(--bg)]">
      <section className="w-full max-w-[420px] rounded-2xl border border-line bg-surface-card p-6 space-y-0 md:p-8 md:rounded-[20px] md:shadow-card">
        <div className="flex items-center gap-2 mb-7 text-accent text-xl font-bold tracking-[-0.4px]">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={brandName}
              className="h-9 max-w-[160px] w-auto object-contain"
            />
          ) : (
            <Icon name="brand" size={28} />
          )}

          <span>{brandName}</span>
        </div>

        <header className="[&>h1]:mb-1.5 [&>p]:mb-6 [&>p]:text-ink-muted">
          <h1>Iniciar sesión</h1>

          <p>Accede al panel comercial de tu empresa</p>
        </header>

        <form className="flex flex-col gap-[18px]" onSubmit={handleFormSubmit}>
          <Field
            id="login-email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            error={emailError}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError("");
            }}
            required
          />

          <Field
            id="login-password"
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            error={passwordError}
            onChange={(event) => {
              setPassword(event.target.value);
              setPasswordError("");
            }}
            required
          />

          <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer select-none [&>input]:w-4 [&>input]:h-4 [&>input]:m-0 [&>input]:shrink-0 [&>input]:accent-accent [&>input]:cursor-pointer [&>input:focus-visible]:outline-2 [&>input:focus-visible]:outline-offset-2 [&>input:focus-visible]:outline-accent">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />

            <span>Recordarme en este equipo</span>
          </label>

          {error && <FormMessage kind="error">{error}</FormMessage>}

          <SliderVerify
            key={attempt}
            label="Desliza para iniciar sesión"
            disabled={loading}
            onComplete={handleSubmit}
          />
        </form>
      </section>
    </main>
  );
}
