import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Ban, Edit2, Power, Trash2 } from "lucide-react";
import Button from "../components/Button.js";
import PageHeader from "../components/PageHeader.js";
import DataListView from "../components/DataListView/DataListView.js";
import type { ColumnSpec } from "../components/DataListView/types.js";
import { USER_STATUS_OPTIONS } from "../config/filters.js";
import { useFilteredList } from "../hooks/useFilteredList.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { can } from "../lib/permissions.js";
import { getUserRole } from "../services/auth-storage.js";
import {
  deleteUser,
  getUsers,
  updateUserStatus,
} from "../services/user-service.js";
import type { User, UserStatus } from "../types/user.js";

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
  const navigate = useNavigate();

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
              onClick={() => navigate(`/users/${user._id}`)}
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
            <Button
              icon="plus"
              iconOnly
              onClick={() => navigate("/users/new")}
            >
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
    </main>
  );
}
