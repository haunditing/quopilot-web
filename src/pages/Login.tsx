import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Icon from "../components/Icon.js";
import SliderVerify from "../components/SliderVerify.js";
import { login } from "../services/auth-service.js";
import {
  clearRememberedCredentials,
  getRememberedCredentials,
  saveAccessToken,
  saveRememberedCredentials,
  saveUser,
} from "../services/auth-storage.js";
import { isValidEmail } from "../lib/validation.js";

export default function Login() {
  const remembered = getRememberedCredentials();

  const [email, setEmail] = useState(remembered?.email ?? "");
  const [password, setPassword] = useState(remembered?.password ?? "");
  const [remember, setRemember] = useState(remembered !== null);
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

    try {
      const result = await login({
        email,
        password,
      });

      saveAccessToken(result.accessToken);

      saveUser(result.user);

      if (result.user.mustChangePassword) {
        clearRememberedCredentials();
        navigate("/change-password", {
          replace: true,
        });

        return;
      }

      if (remember) {
        saveRememberedCredentials({
          email,
          password,
        });
      } else {
        clearRememberedCredentials();
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
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card__brand">
          <Icon name="brand" size={28} />

          <span>QuoPilot</span>
        </div>

        <header className="auth-card__header">
          <h1>Iniciar sesión</h1>

          <p>Accede al panel comercial de tu empresa</p>
        </header>

        <form className="auth-form" onSubmit={handleFormSubmit}>
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

          <label className="auth-remember">
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
