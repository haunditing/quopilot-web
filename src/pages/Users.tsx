import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { Ban, Edit2, Power, Trash2 } from "lucide-react";
import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Modal from "../components/Modal.js";
import PageHeader from "../components/PageHeader.js";
import PasswordStrength from "../components/PasswordStrength.js";
import DataListView from "../components/DataListView/DataListView.js";
import type { ColumnSpec } from "../components/DataListView/types.js";
import { USER_STATUS_OPTIONS } from "../config/filters.js";
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

const STATUS_BADGE_CLASS: Record<UserStatus, string> = {
  ACTIVE: "badge badge-success",
  INACTIVE: "badge badge-danger",
  SUSPENDED: "badge badge-warning",
};

const STATUS_LABEL = Object.fromEntries(
  USER_STATUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<UserStatus, string>;

export default function Users() {
  const buildFetcher = useCallback(
    (params: { search: string; status: string }) => () =>
      getUsers({
        search: params.search || undefined,
        status: params.status ? (params.status as UserStatus) : undefined,
      }),
    [],
  );
  const { data, loading, reload, set } = useFilteredList(buildFetcher, {
    status: "",
  });

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

  const handleStatusChange = useCallback(
    async (user: User, status: UserStatus) => {
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
    },
    [confirm, reload, toast],
  );

  const handleDelete = useCallback(
    async (user: User) => {
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
    },
    [confirm, reload, toast],
  );

  const columns: ColumnSpec<User>[] = [
    {
      key: "name",
      label: "Agente",
      render: (user) => <strong>{user.name}</strong>,
    },
    {
      key: "email",
      label: "Email",
      render: (user) => user.email,
    },
    {
      key: "status",
      label: "Estado",
      render: (user) => (
        <span className={STATUS_BADGE_CLASS[user.status]}>
          {STATUS_LABEL[user.status]}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Creado",
      render: (user) => new Date(user.createdAt).toLocaleDateString("es-CO"),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (user) => (
        <div className="row-actions">
          {canChangeStatus && user.status === "ACTIVE" && (
            <>
              <button
                type="button"
                className="btn-icon-action"
                title="Desactivar"
                aria-label="Desactivar"
                onClick={() => handleStatusChange(user, "INACTIVE")}
              >
                <Power size={16} />
              </button>
              <button
                type="button"
                className="btn-icon-action btn-danger"
                title="Suspender"
                aria-label="Suspender"
                onClick={() => handleStatusChange(user, "SUSPENDED")}
              >
                <Ban size={16} />
              </button>
            </>
          )}
          {canChangeStatus && user.status !== "ACTIVE" && (
            <button
              type="button"
              className="btn-icon-action"
              title="Activar"
              aria-label="Activar"
              onClick={() => handleStatusChange(user, "ACTIVE")}
            >
              <Power size={16} />
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              className="btn-icon-action"
              title="Editar"
              aria-label="Editar"
              onClick={() => openEdit(user)}
            >
              <Edit2 size={16} />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="btn-icon-action btn-danger"
              title="Eliminar"
              aria-label="Eliminar"
              onClick={() => handleDelete(user)}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <main>
      <PageHeader
        title="Usuarios"
        description="Gestiona los usuarios de tu empresa"
        actions={
          canCreate && (
            <Button icon="plus" iconOnly onClick={openCreate}>
              Nuevo usuario
            </Button>
          )
        }
      />

      <DataListView<User>
        items={data?.data ?? []}
        columns={columns}
        rowKey={(user) => user._id}
        filters={[
          {
            key: "status",
            label: "Estado",
            type: "select",
            options: USER_STATUS_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            })),
          },
        ]}
        loading={loading}
        emptyState="Crea tu primer agente para empezar a operar"
        onFilterChange={(filters) => {
          set("status", filters.status ?? "");
        }}
      />

      <Modal
        open={modal !== null}
        title={modal?.mode === "edit" ? "Editar usuario" : "Nuevo usuario"}
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
