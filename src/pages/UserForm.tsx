import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Icon from "../components/Icon.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import PasswordStrength from "../components/PasswordStrength.js";
import SettingsTabs from "../components/SettingsTabs.js";
import { useSectionScrollSpy } from "../hooks/useSectionScrollSpy.js";
import { useToast } from "../hooks/useToast.js";
import { isValidEmail } from "../lib/validation.js";
import {
  createAgent,
  getUser,
  updateUser,
} from "../services/user-service.js";

interface UserFormProps {
  userId?: string;
}

interface SectionTab {
  id: string;
  label: string;
}

const SECTION_TABS: SectionTab[] = [
  { id: "user-informacion", label: "Información general" },
  { id: "user-seguridad", label: "Seguridad" },
];

const SAVE_MESSAGE = "No fue posible guardar el agente";

export default function UserForm({ userId }: UserFormProps) {
  const navigate = useNavigate();
  const toast = useToast();

  const isEdit = Boolean(userId);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!userId) {
      return;
    }

    const id = userId;
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError("");

      try {
        const user = await getUser(id);

        if (active) {
          setName(user.name);
          setEmail(user.email);
        }
      } catch (requestError: unknown) {
        if (active) {
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : "No fue posible cargar el usuario",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [userId]);

  const sectionIds = useMemo(() => SECTION_TABS.map((tab) => tab.id), []);

  const { activeSection, scrollToSection } = useSectionScrollSpy({
    sectionIds,
    enabled: !loading && !loadError,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let hasErrors = false;

    if (!name.trim()) {
      setNameError("El nombre es obligatorio");
      hasErrors = true;
    }

    if (!email.trim()) {
      setEmailError("El email es obligatorio");
      hasErrors = true;
    } else if (!isValidEmail(email)) {
      setEmailError("Email inválido");
      hasErrors = true;
    }

    if (password && password.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
      hasErrors = true;
    } else if (!isEdit && !password) {
      setPasswordError("La contraseña es obligatoria");
      hasErrors = true;
    }

    if (password && password !== confirmPassword) {
      setConfirmPasswordError("Las contraseñas no coinciden");
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      if (isEdit && userId) {
        await updateUser(userId, {
          name,
          email,
          ...(password ? { password } : {}),
        });

        toast.success("Cambios guardados");
      } else {
        await createAgent({
          name,
          email,
          password,
        });

        toast.success("Agente creado");
      }

      navigate("/users");
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error ? requestError.message : SAVE_MESSAGE,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="user-form">
        <LoadingOverlay title="Cargando usuario..." />
      </main>
    );
  }

  if (loadError) {
    return (
      <PageState kind="error" title="No fue posible cargar" message={loadError} />
    );
  }

  const showConfirmPassword = !isEdit || Boolean(password);

  return (
    <main className="user-form">
      <PageHeader
        title={isEdit ? "Editar usuario" : "Nuevo usuario"}
        description={
          isEdit
            ? "Actualiza los datos y la contraseña del agente"
            : "Crea un agente para que opere en tu empresa"
        }
      />

      <SettingsTabs />

      {saveError && <FormMessage kind="error">{saveError}</FormMessage>}

      <div className="user-form__body">
        <div className="user-form__main">
          <form
            id="user-form"
            className="user-form__form"
            onSubmit={handleSubmit}
          >
            <section id="user-informacion" className="user-form__card">
              <header className="user-form__card-head">
                <span className="user-form__card-head__icon">
                  <Icon name="customers" size={20} />
                </span>

                <span className="user-form__card-head__text">
                  <strong>Información general</strong>

                  <small>Nombre y correo del agente</small>
                </span>
              </header>

              <div className="user-form__grid">
                <Field
                  id="user-name"
                  label="Nombre"
                  type="text"
                  value={name}
                  error={nameError}
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameError("");
                  }}
                  required
                />

                <Field
                  id="user-email"
                  label="Email"
                  type="email"
                  value={email}
                  error={emailError}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailError("");
                  }}
                  required
                />
              </div>
            </section>

            <section id="user-seguridad" className="user-form__card">
              <header className="user-form__card-head">
                <span className="user-form__card-head__icon">
                  <Icon name="lock" size={20} />
                </span>

                <span className="user-form__card-head__text">
                  <strong>Seguridad</strong>

                  <small>Contraseña de acceso del agente</small>
                </span>
              </header>

              <Field
                id="user-password"
                label={
                  isEdit
                    ? "Contraseña (déjala vacía para no cambiarla)"
                    : "Contraseña"
                }
                type="password"
                value={password}
                error={passwordError}
                helper={<PasswordStrength value={password} />}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setPasswordError("");
                }}
                minLength={8}
                required={!isEdit}
              />

              {showConfirmPassword && (
                <Field
                  id="user-confirm-password"
                  label="Confirmar contraseña"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  error={confirmPasswordError}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setConfirmPasswordError("");
                  }}
                  minLength={8}
                  required
                />
              )}
            </section>
          </form>
        </div>

        <aside className="user-form__panel">
          <nav className="user-form__nav" aria-label="Secciones del usuario">
            {SECTION_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={
                  activeSection === tab.id
                    ? "user-form__tab user-form__tab--active"
                    : "user-form__tab"
                }
                onClick={() => scrollToSection(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <Button
            type="submit"
            form="user-form"
            icon="check"
            disabled={saving}
            className="user-form__panel-save"
          >
            {saving
              ? "Guardando..."
              : isEdit
                ? "Guardar cambios"
                : "Crear agente"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/users")}
          >
            Cancelar
          </Button>
        </aside>
      </div>
    </main>
  );
}