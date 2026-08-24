import { useEffect, useMemo, useState } from "react";
import AsyncBoundary from "../components/AsyncBoundary.js";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Icon from "../components/Icon.js";
import PageHeader from "../components/PageHeader.js";
import PasswordStrength from "../components/PasswordStrength.js";
import SettingsTabs from "../components/SettingsTabs.js";
import { useSectionScrollSpy } from "../hooks/useSectionScrollSpy.js";
import { useToast } from "../hooks/useToast.js";
import { isValidEmail } from "../lib/validation.js";
import { createAgent, getUser, updateUser } from "../services/user-service.js";

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

  if (loading || loadError) {
    return (
      <main className="min-h-full bg-surface-light">
        <AsyncBoundary loading={loading} error={loadError} loadingLabel="Cargando usuario..." />
      </main>
    );
  }

  const showConfirmPassword = !isEdit || Boolean(password);

  return (
    <main className="min-h-full bg-surface-light">
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

      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-6 max-[860px]:grid-cols-1">
        <div className="flex flex-col gap-4 min-w-0">
          <form
            id="user-form"
            className="flex flex-col gap-6"
            onSubmit={handleSubmit}
          >
            <section id="user-informacion" className="mt-4 scroll-mt-4 rounded-xl border border-slate-200 bg-white p-6">
              <header className="flex flex-row items-start gap-3 w-full mb-5">
                <span className="inline-flex items-center justify-center shrink-0 w-10 h-10 rounded-[10px] bg-accent-soft text-accent">
                  <Icon name="customers" size={20} />
                </span>

                <span className="flex flex-col gap-0.5 [&>strong]:text-base [&>strong]:text-ink-strong [&>small]:text-[13px] text-slate-500">
                  <strong>Información general</strong>

                  <small>Nombre y correo del agente</small>
                </span>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <section id="user-seguridad" className="mt-4 scroll-mt-4 rounded-xl border border-slate-200 bg-white p-6">
              <header className="flex flex-row items-start gap-3 w-full mb-5">
                <span className="inline-flex items-center justify-center shrink-0 w-10 h-10 rounded-[10px] bg-accent-soft text-accent">
                  <Icon name="lock" size={20} />
                </span>

                <span className="flex flex-col gap-0.5 [&>strong]:text-base [&>strong]:text-ink-strong [&>small]:text-[13px] text-slate-500">
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

        <aside className="sticky top-5 flex flex-col gap-4 p-5 rounded-xl border border-line bg-surface-card shadow-card max-[1023px]:static max-[1023px]:order-first">
          <nav className="flex flex-col gap-1" aria-label="Secciones del usuario">
            {SECTION_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={
                  activeSection === tab.id
                    ? "flex items-center w-full px-3.5 py-2.5 rounded-lg text-[13px] font-semibold text-left cursor-pointer transition-colors duration-150 !bg-accent-soft !border-accent-border !text-accent"
                    : "flex items-center w-full px-3.5 py-2.5 rounded-lg border border-transparent text-[13px] font-semibold text-left cursor-pointer transition-colors duration-150 hover:bg-accent-soft hover:text-accent"
                }
                onClick={() => scrollToSection(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <Button
            type="submit"
            form="min-h-full bg-surface-light"
            icon="check"
            disabled={saving}
            className="justify-center w-full"
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
