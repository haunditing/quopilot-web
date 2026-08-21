import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Icon from "../components/Icon.js";
import PasswordStrength from "../components/PasswordStrength.js";
import { changePassword } from "../services/auth-service.js";
import {
  clearRememberedEmail,
  getUser,
  saveUser,
} from "../services/auth-storage.js";

export default function ChangePassword() {
  const user = getUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
      setConfirmPasswordError("");

      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("");
      setConfirmPasswordError("Las contraseñas no coinciden");

      return;
    }

    setPasswordError("");
    setConfirmPasswordError("");

    setLoading(true);
    setError("");

    try {
      await changePassword({
        currentPassword,
        password,
        confirmPassword,
      });

      if (user) {
        saveUser({
          ...user,
          mustChangePassword: false,
        });
      }

      clearRememberedEmail();

      navigate("/dashboard", {
        replace: true,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible cambiar la contraseña",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card__brand">
          <Icon name="brand" size={28} />

          <span>QuoPilot</span>
        </div>

        <header className="auth-card__header">
          <h1>Cambiar contraseña</h1>

          <p>
            {user?.name ?? ""}, debes cambiar tu contraseña temporal antes de
            continuar
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <Field
            id="change-current-password"
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />

          <Field
            id="change-password"
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            error={passwordError}
            helper={<PasswordStrength value={password} />}
            onChange={(event) => {
              setPassword(event.target.value);
              setPasswordError("");
            }}
            required
          />

          <Field
            id="change-confirm-password"
            label="Confirmar nueva contraseña"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            error={confirmPasswordError}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setConfirmPasswordError("");
            }}
            required
          />

          {error && <FormMessage kind="error">{error}</FormMessage>}

          <Button type="submit" icon="check" iconOnly disabled={loading}>
            {loading ? "Guardando..." : "Cambiar contraseña"}
          </Button>
        </form>
      </section>
    </main>
  );
}
