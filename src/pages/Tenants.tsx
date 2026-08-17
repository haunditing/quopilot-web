import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { Ban, Eye, Power } from "lucide-react";
import Button from "../components/Button.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import Modal from "../components/Modal.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import PasswordStrength from "../components/PasswordStrength.js";
import StatusBadge from "../components/StatusBadge.js";
import Tabs from "../components/Tabs.js";
import DataListView from "../components/DataListView/DataListView.js";
import type { ColumnSpec } from "../components/DataListView/types.js";
import { USER_STATUS_OPTIONS } from "../config/filters.js";
import { CURRENCY_OPTIONS, TIMEZONE_OPTIONS } from "../config/options.js";
import { useFilteredList } from "../hooks/useFilteredList.js";
import { useConfirm } from "../hooks/useConfirm.js";
import { useToast } from "../hooks/useToast.js";
import { can } from "../lib/permissions.js";
import { formatDate } from "../lib/format.js";
import { getUserRole } from "../services/auth-storage.js";
import {
  createTenant,
  getTenants,
  getTenantUsers,
  updateTenant,
  updateTenantStatus,
} from "../services/tenant-service.js";
import type { Tenant, TenantStatus } from "../types/tenant.js";
import type { User } from "../types/user.js";
import { isValidEmail } from "../lib/validation.js";

const DEFAULT_CURRENCY = "COP";
const DEFAULT_TIMEZONE = "America/Bogota";

interface TenantViewForm {
  name: string;
  legalName: string;
  taxId: string;
  phone: string;
  country: string;
  currency: string;
  timezone: string;
}

function viewFormFrom(tenant: Tenant): TenantViewForm {
  return {
    name: tenant.name,
    legalName: tenant.legalName ?? "",
    taxId: tenant.taxId ?? "",
    phone: tenant.phone ?? "",
    country: tenant.country ?? "",
    currency: tenant.currency,
    timezone: tenant.timezone,
  };
}

const STATUS_ACTIONS: Record<
  TenantStatus,
  { label: string; message: string; danger?: boolean }
> = {
  ACTIVE: {
    label: "Activar",
    message: "El tenant podrá operar nuevamente.",
  },
  INACTIVE: {
    label: "Desactivar",
    message: "Podrá reactivarlo cuando lo necesite.",
  },
  SUSPENDED: {
    label: "Suspender",
    message: "El tenant quedará suspendido de inmediato.",
    danger: true,
  },
};

const STATUS_BADGE_CLASS: Record<TenantStatus, string> = {
  ACTIVE: "badge badge-success",
  INACTIVE: "badge badge-danger",
  SUSPENDED: "badge badge-warning",
};

const STATUS_LABEL = Object.fromEntries(
  USER_STATUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<TenantStatus, string>;

export default function Tenants() {
  const buildFetcher = useCallback(
    (params: { search: string; status: string }) => () =>
      getTenants({
        search: params.search || undefined,
        status: params.status ? (params.status as TenantStatus) : undefined,
      }),
    [],
  );
  const { data, loading, error, reload, set } = useFilteredList(buildFetcher, {
    status: "",
  });

  const role = getUserRole();
  const canCreate = can(role, "tenants", "create");
  const canChangeStatus = can(role, "tenants", "changeStatus");

  const toast = useToast();
  const { confirm } = useConfirm();

  const [createOpen, setCreateOpen] = useState(false);

  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [adminName, setAdminName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [adminNameError, setAdminNameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const closeCreate = useCallback(() => setCreateOpen(false), []);

  const [viewTenant, setViewTenant] = useState<Tenant | null>(null);
  const [viewTab, setViewTab] = useState<"general" | "users">("general");
  const [tenantUsers, setTenantUsers] = useState<User[] | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [viewForm, setViewForm] = useState<TenantViewForm>({
    name: "",
    legalName: "",
    taxId: "",
    phone: "",
    country: "",
    currency: DEFAULT_CURRENCY,
    timezone: DEFAULT_TIMEZONE,
  });
  const [viewSaving, setViewSaving] = useState(false);
  const [viewFormError, setViewFormError] = useState("");
  const [viewNameError, setViewNameError] = useState("");

  const closeView = useCallback(() => setViewTenant(null), []);

  function openView(tenant: Tenant) {
    setViewTenant(tenant);
    setViewTab("general");
    setViewForm(viewFormFrom(tenant));
    setTenantUsers(null);
    setUsersLoading(false);
    setUsersError("");
    setViewFormError("");
    setViewNameError("");
  }

  function setViewField(field: keyof TenantViewForm, value: string) {
    setViewForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSaveView(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!viewTenant) {
      return;
    }

    if (!viewForm.name.trim()) {
      setViewNameError("El nombre es obligatorio");

      return;
    }

    setViewSaving(true);
    setViewFormError("");

    try {
      const updated = await updateTenant(viewTenant._id, {
        name: viewForm.name,
        ...(viewForm.legalName ? { legalName: viewForm.legalName } : {}),
        ...(viewForm.taxId ? { taxId: viewForm.taxId } : {}),
        ...(viewForm.phone ? { phone: viewForm.phone } : {}),
        ...(viewForm.country ? { country: viewForm.country } : {}),
        currency: viewForm.currency,
        timezone: viewForm.timezone,
      });

      setViewTenant(updated);
      setViewForm(viewFormFrom(updated));
      reload();
      toast.success("Tenant actualizado");
    } catch (requestError) {
      setViewFormError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible actualizar el tenant",
      );
    } finally {
      setViewSaving(false);
    }
  }

  async function loadTenantUsers(tenantId: string) {
    if (tenantUsers !== null || usersLoading) {
      return;
    }

    setUsersLoading(true);
    setUsersError("");

    try {
      const result = await getTenantUsers(tenantId);

      setTenantUsers(result.data);
    } catch (requestError) {
      setUsersError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible cargar los usuarios",
      );
    } finally {
      setUsersLoading(false);
    }
  }

  function handleViewTabChange(id: string) {
    setViewTab(id as "general" | "users");

    if (id === "users" && viewTenant) {
      loadTenantUsers(viewTenant._id);
    }
  }

  function resetForm() {
    setName("");
    setLegalName("");
    setTaxId("");
    setEmail("");
    setPhone("");
    setCountry("");
    setCurrency(DEFAULT_CURRENCY);
    setTimezone(DEFAULT_TIMEZONE);
    setAdminName("");
    setPassword("");
    setConfirmPassword("");
    setNameError("");
    setEmailError("");
    setAdminNameError("");
    setPasswordError("");
    setConfirmPasswordError("");
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
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

    if (!adminName.trim()) {
      setAdminNameError("El nombre del administrador es obligatorio");
      hasErrors = true;
    }

    if (password.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
      hasErrors = true;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Las contraseñas no coinciden");
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      await createTenant({
        name,
        ...(legalName ? { legalName } : {}),
        ...(taxId ? { taxId } : {}),
        email,
        ...(phone ? { phone } : {}),
        ...(country ? { country } : {}),
        currency,
        timezone,
        adminName,
        password,
        confirmPassword,
      });

      resetForm();
      closeCreate();
      reload();
      toast.success("Tenant creado");
    } catch (requestError) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible crear el tenant",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const handleStatusChange = useCallback(
    async (tenant: Tenant, nextStatus: TenantStatus) => {
      const statusAction = STATUS_ACTIONS[nextStatus];
      const confirmed = await confirm({
        title: `${statusAction.label} tenant`,
        message: `¿${statusAction.label} a "${tenant.name}"? ${statusAction.message}`,
        confirmLabel: statusAction.label,
        danger: statusAction.danger,
      });

      if (!confirmed) {
        return;
      }

      try {
        await updateTenantStatus(tenant._id, nextStatus);

        reload();
        toast.success(`Tenant ${statusAction.label.toLowerCase()}`);
      } catch (requestError) {
        toast.error(
          requestError instanceof Error
            ? requestError.message
            : "No fue posible cambiar el estado",
        );
      }
    },
    [confirm, reload, toast],
  );

  if (error) {
    return <PageState kind="error" title="Error en tenants" message={error} />;
  }

  const tenants = data?.data ?? [];

  const columns: ColumnSpec<Tenant>[] = [
    {
      key: "name",
      label: "Tenant",
      render: (tenant) => (
        <div className="cell-main">
          <strong>{tenant.name}</strong>
          {tenant.legalName && (
            <span className="cell-sub">{tenant.legalName}</span>
          )}
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (tenant) => tenant.email || "—",
    },
    {
      key: "country",
      label: "País",
      render: (tenant) => tenant.country || "—",
    },
    {
      key: "currency",
      label: "Moneda",
      render: (tenant) => tenant.currency,
    },
    {
      key: "status",
      label: "Estado",
      render: (tenant) => (
        <span className={STATUS_BADGE_CLASS[tenant.status]}>
          {STATUS_LABEL[tenant.status]}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Registro",
      render: (tenant) => formatDate(tenant.createdAt),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (tenant) => (
        <div className="row-actions">
          <button
            type="button"
            className="btn-icon-action"
            title="Ver"
            aria-label="Ver"
            onClick={() => openView(tenant)}
          >
            <Eye size={16} />
          </button>
          {canChangeStatus && tenant.status === "ACTIVE" && (
            <>
              <button
                type="button"
                className="btn-icon-action"
                title="Desactivar"
                aria-label="Desactivar"
                onClick={() => handleStatusChange(tenant, "INACTIVE")}
              >
                <Power size={16} />
              </button>
              <button
                type="button"
                className="btn-icon-action btn-danger"
                title="Suspender"
                aria-label="Suspender"
                onClick={() => handleStatusChange(tenant, "SUSPENDED")}
              >
                <Ban size={16} />
              </button>
            </>
          )}
          {canChangeStatus && tenant.status !== "ACTIVE" && (
            <button
              type="button"
              className="btn-icon-action"
              title="Activar"
              aria-label="Activar"
              onClick={() => handleStatusChange(tenant, "ACTIVE")}
            >
              <Power size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <main>
      <PageHeader
        title="Tenants"
        description={`${tenants.length} tenants`}
        actions={
          canCreate && (
            <Button icon="plus" iconOnly onClick={() => setCreateOpen(true)}>
              Nuevo tenant
            </Button>
          )
        }
      />

      <DataListView<Tenant>
        items={tenants}
        columns={columns}
        rowKey={(tenant) => tenant._id}
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
        emptyState="Todavía no existen tenants para mostrar con los filtros actuales"
        onFilterChange={(filters) => {
          set("status", filters.status ?? "");
        }}
      />

      <Modal open={createOpen} title="Nuevo tenant" onClose={closeCreate}>
        <form className="modal__form" onSubmit={handleCreate}>
          <div className="form-card__grid">
            <Field
              id="tenant-name"
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
              id="tenant-email"
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
              id="tenant-admin-name"
              label="Nombre del administrador"
              type="text"
              value={adminName}
              error={adminNameError}
              onChange={(event) => {
                setAdminName(event.target.value);
                setAdminNameError("");
              }}
              required
            />

            <Field
              id="tenant-password"
              label="Contraseña temporal"
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
              id="tenant-confirm-password"
              label="Confirmar contraseña"
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

            <Field
              id="tenant-legal-name"
              label="Razón social"
              type="text"
              value={legalName}
              onChange={(event) => setLegalName(event.target.value)}
            />

            <Field
              id="tenant-tax-id"
              label="NIT"
              type="text"
              value={taxId}
              onChange={(event) => setTaxId(event.target.value)}
            />

            <Field
              id="tenant-phone"
              label="Teléfono"
              type="text"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />

            <Field
              id="tenant-country"
              label="País"
              type="text"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            />

            <div className="form-field">
              <label htmlFor="tenant-currency">Moneda</label>

              <select
                id="tenant-currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                required
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="tenant-timezone">Zona horaria</label>

              <select
                id="tenant-timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                required
              >
                {TIMEZONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError && <FormMessage kind="error">{formError}</FormMessage>}

          <Button type="submit" icon="check" iconOnly disabled={submitting}>
            {submitting ? "Creando..." : "Crear tenant"}
          </Button>
        </form>
      </Modal>

      <Modal
        open={viewTenant !== null}
        title={viewTenant?.name ?? "Ver tenant"}
        onClose={closeView}
        panelClassName="modal__panel--wide"
      >
        {viewTenant && (
          <div className="tenant-view">
            <Tabs
              tabs={[
                { id: "general", label: "Información general" },
                {
                  id: "users",
                  label: "Usuarios",
                  count: tenantUsers?.length,
                },
              ]}
              active={viewTab}
              onChange={handleViewTabChange}
            />

            <div className="tenant-view__tab-content">
              {viewTab === "general" && (
                <form className="modal__form" onSubmit={handleSaveView}>
                  <div className="form-card__grid">
                    <Field
                      id="tenant-view-email"
                      label="Email"
                      type="email"
                      value={viewTenant.email ?? ""}
                      disabled
                    />

                    <Field
                      id="tenant-view-name"
                      label="Nombre"
                      type="text"
                      value={viewForm.name}
                      error={viewNameError}
                      onChange={(event) => {
                        setViewField("name", event.target.value);
                        setViewNameError("");
                      }}
                      required
                    />

                    <Field
                      id="tenant-view-legal-name"
                      label="Razón social"
                      type="text"
                      value={viewForm.legalName}
                      onChange={(event) =>
                        setViewField("legalName", event.target.value)
                      }
                    />

                    <Field
                      id="tenant-view-tax-id"
                      label="NIT"
                      type="text"
                      value={viewForm.taxId}
                      onChange={(event) =>
                        setViewField("taxId", event.target.value)
                      }
                    />

                    <Field
                      id="tenant-view-phone"
                      label="Teléfono"
                      type="text"
                      value={viewForm.phone}
                      onChange={(event) =>
                        setViewField("phone", event.target.value)
                      }
                    />

                    <Field
                      id="tenant-view-country"
                      label="País"
                      type="text"
                      value={viewForm.country}
                      onChange={(event) =>
                        setViewField("country", event.target.value)
                      }
                    />

                    <div className="form-field">
                      <label htmlFor="tenant-view-currency">Moneda</label>

                      <select
                        id="tenant-view-currency"
                        value={viewForm.currency}
                        onChange={(event) =>
                          setViewField("currency", event.target.value)
                        }
                        required
                      >
                        {CURRENCY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="tenant-view-timezone">Zona horaria</label>

                      <select
                        id="tenant-view-timezone"
                        value={viewForm.timezone}
                        onChange={(event) =>
                          setViewField("timezone", event.target.value)
                        }
                        required
                      >
                        {TIMEZONE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {viewFormError && (
                    <FormMessage kind="error">{viewFormError}</FormMessage>
                  )}

                  <Button
                    type="submit"
                    icon="check"
                    iconOnly
                    disabled={viewSaving}
                  >
                    {viewSaving ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </form>
              )}

              {viewTab === "users" &&
                (usersLoading ? (
                  <p className="tenant-view__status">Cargando usuarios...</p>
                ) : usersError ? (
                  <FormMessage kind="error">{usersError}</FormMessage>
                ) : tenantUsers && tenantUsers.length > 0 ? (
                  <ul className="tenant-view__users">
                    {tenantUsers.map((user) => (
                      <li key={user._id}>
                        <div className="tenant-view__user-info">
                          <strong>{user.name}</strong>

                          <span>{user.email}</span>
                        </div>

                        <div className="tenant-view__user-meta">
                          <span>{formatDate(user.createdAt)}</span>

                          <StatusBadge status={user.status} />
                        </div>
                      </li>
                     ))}
                   </ul>
                ) : (
                  <FormMessage kind="info">
                    Este tenant todavía no tiene usuarios registrados.
                  </FormMessage>
                ))}
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
