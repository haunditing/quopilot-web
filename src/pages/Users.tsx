import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import Button from "../components/Button.js";
import EmptyState from "../components/EmptyState.js";
import EntityCard from "../components/EntityCard.js";
import type { EntityAction } from "../components/EntityCard.js";
import Field from "../components/Field.js";
import FilterPanel from "../components/FilterPanel.js";
import FormMessage from "../components/FormMessage.js";
import Modal from "../components/Modal.js";
import PageHeader from "../components/PageHeader.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
import PageState from "../components/PageState.js";
import PasswordStrength from "../components/PasswordStrength.js";
import { USER_FILTER_FIELDS } from "../config/filters.js";
import { useFilteredList } from "../hooks/useFilteredList.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { can } from "../lib/permissions.js";
import { getUserRole } from "../services/auth-storage.js";
import {
  createAgent,
  deleteUser,
  getUsers,
  updateUser,
  updateUserStatus,
} from "../services/user-service.js";
import type { User, UserStatus } from "../types/user.js";
import { isValidEmail } from "../lib/validation.js";

type UserModal = { mode: "create" } | { mode: "edit"; user: User } | null;

const AGENT_EMAIL_MESSAGE = "No fue posible guardar el agente";

const STATUS_ACTIONS: Record<
  UserStatus,
  { label: string; message: string; danger?: boolean }
> = {
  ACTIVE: {
    label: "Activar",
    message: "El agente podrá iniciar sesión nuevamente.",
  },
  INACTIVE: {
    label: "Desactivar",
    message: "Podrá reactivarlo cuando lo necesite.",
  },
  SUSPENDED: {
    label: "Suspender",
    message: "El agente no podrá iniciar sesión mientras esté suspendido.",
    danger: true,
  },
};

export default function Users() {
  const buildFetcher = useCallback(
    (params: {
      search: string;
      status: string;
      dateFrom: string;
      dateTo: string;
    }) => () =>
      getUsers({
        search: params.search || undefined,
        status: params.status ? (params.status as UserStatus) : undefined,
        dateFrom: params.dateFrom || undefined,
        dateTo: params.dateTo || undefined,
      }),
    [],
  );
  const { data, loading, error, reload, search, setSearch, values, set, clear } =
    useFilteredList(buildFetcher, { status: "", dateFrom: "", dateTo: "" });

  const role = getUserRole();
  const canCreate = can(role, "users", "create");
  const canChangeStatus = can(role, "users", "changeStatus");
  const canEdit = can(role, "users", "update");
  const canDelete = can(role, "users", "delete");

  const toast = useToast();
  const { confirm } = useConfirm();

  const [modal, setModal] = useState<UserModal>(null);
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

  function openCreate() {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setSaveError("");
    setModal({ mode: "create" });
  }

  function openEdit(user: User) {
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setConfirmPassword("");
    setNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setSaveError("");
    setModal({ mode: "edit", user });
  }

  function closeModal() {
    setModal(null);
    setNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setSaveError("");
  }

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
    } else if (modal?.mode !== "edit" && !password) {
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
      if (modal?.mode === "edit") {
        await updateUser(modal.user._id, {
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

      closeModal();
      reload();
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error
          ? requestError.message
          : AGENT_EMAIL_MESSAGE,
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(user: User, status: UserStatus) {
    const statusAction = STATUS_ACTIONS[status];
    const confirmed = await confirm({
      title: `${statusAction.label} agente`,
      message: `¿${statusAction.label} a "${user.name}"? ${statusAction.message}`,
      confirmLabel: statusAction.label,
      danger: statusAction.danger,
    });

    if (!confirmed) {
      return;
    }

    try {
      await updateUserStatus(user._id, status);
      reload();
      toast.success(`Agente ${statusAction.label.toLowerCase()}`);
    } catch (requestError) {
      toast.error(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible cambiar el estado del agente",
      );
    }
  }

  async function handleDelete(user: User) {
    const confirmed = await confirm({
      title: "Eliminar agente",
      message: `¿Eliminar al agente "${user.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteUser(user._id);
      reload();
      toast.success("Agente eliminado");
    } catch (requestError) {
      toast.error(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible eliminar el agente",
      );
    }
  }

  function userActions(user: User): EntityAction[] {
    const actions: EntityAction[] = [];

    if (canChangeStatus) {
      if (user.status === "ACTIVE") {
        actions.push(
          {
            icon: "power",
            ariaLabel: "Desactivar",
            onClick: () => handleStatusChange(user, "INACTIVE"),
            variant: "secondary",
          },
          {
            icon: "block",
            ariaLabel: "Suspender",
            onClick: () => handleStatusChange(user, "SUSPENDED"),
            variant: "danger",
          },
        );
      } else {
        actions.push({
          icon: "power",
          ariaLabel: "Activar",
          onClick: () => handleStatusChange(user, "ACTIVE"),
          variant: "primary",
        });
      }
    }

    if (canEdit) {
      actions.push({
        icon: "edit",
        ariaLabel: "Editar",
        onClick: () => openEdit(user),
        variant: "secondary",
      });
    }

    if (canDelete) {
      actions.push({
        icon: "trash",
        ariaLabel: "Eliminar",
        onClick: () => handleDelete(user),
        variant: "danger",
      });
    }

    return actions;
  }

  return (
    <main>
      <PageHeader
        title="Usuarios"
        description="Gestiona los agentes de tu empresa"
        actions={
          canCreate && (
            <Button icon="plus" iconOnly onClick={openCreate}>
              Nuevo agente
            </Button>
          )
        }
      />

      <FilterPanel
        fields={USER_FILTER_FIELDS}
        values={values}
        onSet={set}
        onClear={clear}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre o email..."
      />

      {loading ? (
        <LoadingOverlay title="Cargando agentes..." message="Esto puede tomar unos segundos" />
      ) : error ? (
        <PageState kind="error" title="No fue posible cargar" message={error} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No hay agentes"
          message="Crea tu primer agente para empezar a operar"
        >
          {canCreate && (
            <Button icon="plus" iconOnly onClick={openCreate}>
              Nuevo agente
            </Button>
          )}
        </EmptyState>
      ) : (
        <section className="entity-grid">
          {data.data.map((user) => (
            <EntityCard
              key={user._id}
              eyebrow="Agente"
              title={user.name}
              status={user.status}
              fields={[
                { label: "Email", value: user.email },
                {
                  label: "Creado",
                  value: new Date(user.createdAt).toLocaleDateString("es-CO"),
                },
              ]}
              actions={userActions(user)}
            />
          ))}
        </section>
      )}

      <Modal
        open={modal !== null}
        title={modal?.mode === "edit" ? "Editar agente" : "Nuevo agente"}
        onClose={closeModal}
      >
        <form className="modal__form" onSubmit={handleSubmit}>
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

          <Field
            id="user-password"
            label={
              modal?.mode === "edit"
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
            required={modal?.mode !== "edit"}
          />

          {(modal?.mode === "create" || password) && (
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

          {saveError && <FormMessage kind="error">{saveError}</FormMessage>}

          <Button
            type="submit"
            variant="primary"
            icon="check"
            iconOnly
            disabled={saving}
          >
            {saving
              ? "Guardando..."
              : modal?.mode === "edit"
                ? "Guardar cambios"
                : "Crear agente"}
          </Button>
        </form>
      </Modal>
    </main>
  );
}
