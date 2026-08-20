import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import Button from "../components/Button.js";
import EmptyState from "../components/EmptyState.js";
import Field from "../components/Field.js";
import FormMessage from "../components/FormMessage.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
import Modal from "../components/Modal.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import { getUserRole } from "../services/auth-storage.js";
import {
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  setDefaultPlan,
  getUsageLimits,
} from "../services/support-assistant-service.js";
import type { Plan, AppUsageLimit } from "../types/support-assistant.js";
import { useToast } from "../hooks/useToast.js";

const QUILOPILOT_FEATURES = [
  { key: "dashboard", label: "Dashboard", description: "Panel principal de métricas" },
  { key: "customers", label: "Clientes", description: "Gestión de clientes y contactos" },
  { key: "products", label: "Productos", description: "Catálogo de productos y servicios" },
  { key: "quotes", label: "Cotizaciones", description: "Creación y gestión de cotizaciones" },
  { key: "sales", label: "Ventas", description: "Pipeline y registro de ventas" },
  { key: "channels", label: "Canales", description: "Canales de comunicación (WhatsApp, Web Chat, etc.)" },
  { key: "agent", label: "Agente IA", description: "Configuración del agente comercial" },
  { key: "reports", label: "Reportes", description: "Reportes y analytics" },
  { key: "integrations", label: "Integraciones", description: "API, webhooks e integraciones externas" },
  { key: "settings", label: "Configuración", description: "Configuración general del tenant" },
];

export default function Plans() {
  const role = getUserRole();

  if (role !== "SUPER_ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <PlansPanel />;
}

function PlansPanel() {
  const toast = useToast();

  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState("");

  const [usageLimitsCatalog, setUsageLimitsCatalog] = useState<AppUsageLimit[]>([]);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState<{
    key: string;
    name: string;
    description: string;
    isActive: boolean;
    isDefault: boolean;
    sortOrder: string;
    enabledFeatures: string[];
    usageLimits: Record<string, number>;
  }>({
    key: "",
    name: "",
    description: "",
    isActive: true,
    isDefault: false,
    sortOrder: "0",
    enabledFeatures: [],
    usageLimits: {},
  });
  const [planSaving, setPlanSaving] = useState(false);
  const [planError, setPlanError] = useState("");

  const loadData = useCallback(async () => {
    setPlansLoading(true);
    setPlansError("");

    try {
      const [loadedPlans, loadedLimits] = await Promise.all([
        listPlans(),
        getUsageLimits(),
      ]);
      setPlans(loadedPlans);
      setUsageLimitsCatalog(loadedLimits);
    } catch (error) {
      setPlansError(error instanceof Error ? error.message : "No fue posible cargar la información");
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      await loadData();
    }
    void load();
  }, [loadData]);

  function openPlanModal(plan?: Plan) {
    setEditingPlan(plan ?? null);
    setPlanError("");

    const limitsMap: Record<string, number> = {};
    for (const ul of usageLimitsCatalog) {
      limitsMap[ul.code] = ul.defaultValue;
    }
    if (plan && Array.isArray(plan.usageLimits)) {
      for (const entry of plan.usageLimits) {
        limitsMap[entry.code] = entry.limit;
      }
    }

    setPlanForm(
      plan
        ? {
            key: plan.key,
            name: plan.name,
            description: plan.description,
            isActive: plan.isActive,
            isDefault: plan.isDefault,
            sortOrder: String(plan.sortOrder),
            enabledFeatures: plan.enabledFeatures ?? [],
            usageLimits: limitsMap,
          }
        : {
            key: "",
            name: "",
            description: "",
            isActive: true,
            isDefault: false,
            sortOrder: "0",
            enabledFeatures: [],
            usageLimits: limitsMap,
          },
    );
    setPlanModalOpen(true);
  }

  function updatePlanFeature(featureKey: string, enabled: boolean) {
    setPlanForm((current) => ({
      ...current,
      enabledFeatures: enabled
        ? [...current.enabledFeatures, featureKey]
        : current.enabledFeatures.filter((k) => k !== featureKey),
    }));
  }

  function updateUsageLimitValue(code: string, val: string) {
    const num = val === "" ? -1 : Number(val);
    setPlanForm((current) => ({
      ...current,
      usageLimits: {
        ...current.usageLimits,
        [code]: isNaN(num) ? -1 : num,
      },
    }));
  }

  async function handleSavePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlanSaving(true);
    setPlanError("");

    const usageLimitsPayload = Object.entries(planForm.usageLimits).map(([code, limit]) => ({
      code,
      limit,
    }));

    const payload = {
      key: planForm.key.trim().toUpperCase(),
      name: planForm.name.trim(),
      description: planForm.description.trim() || undefined,
      isActive: planForm.isActive,
      isDefault: planForm.isDefault,
      sortOrder: Number(planForm.sortOrder),
      enabledFeatures: planForm.enabledFeatures,
      usageLimits: usageLimitsPayload,
    };

    try {
      if (editingPlan) {
        await updatePlan(editingPlan.key, payload);
        toast.success("Plan actualizado");
      } else {
        await createPlan(payload);
        toast.success("Plan creado");
      }

      setPlanModalOpen(false);
      await loadData();
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "No fue posible guardar");
    } finally {
      setPlanSaving(false);
    }
  }

  async function handleDeletePlan(plan: Plan) {
    try {
      await deletePlan(plan.key);
      toast.success("Plan eliminado");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar");
    }
  }

  async function handleSetDefaultPlan(plan: Plan) {
    try {
      await setDefaultPlan(plan.key);
      toast.success("Plan predeterminado actualizado");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible actualizar");
    }
  }

  return (
    <main className="master-detail">
      <PageHeader
        title="Planes"
        description="Define planes, funcionalidades atómicas y límites de uso dinámicos de QuoPilot"
        actions={
          <Button icon="plus" iconOnly onClick={() => openPlanModal()}>
            Nuevo plan
          </Button>
        }
      />

      {plansLoading ? (
        <LoadingOverlay title="Cargando planes..." message="Esto puede tomar unos segundos" />
      ) : plansError ? (
        <PageState kind="error" title="Error" message={plansError} />
      ) : plans && plans.length > 0 ? (
        <div className="master-detail__body">
          <div className="master-detail__main">
            <div className="plans-table">
              <table className="plans-table__table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Key</th>
                    <th>Estado</th>
                    <th>Predeterminado</th>
                    <th>Funcionalidades</th>
                    <th>Límites de uso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan._id} className="plans-table__row">
                      <td>
                        <strong>{plan.name}</strong>
                        {plan.description && <span className="cell-sub">{plan.description}</span>}
                      </td>
                      <td><code>{plan.key}</code></td>
                      <td>
                        {plan.isActive ? (
                          <span className="badge badge-success">Activo</span>
                        ) : (
                          <span className="badge badge-danger">Inactivo</span>
                        )}
                      </td>
                      <td>
                        {plan.isDefault ? (
                          <span className="badge badge-info">Predeterminado</span>
                        ) : (
                          <span className="cell-sub">—</span>
                        )}
                      </td>
                      <td>
                        <span className="cell-sub">
                          {(plan.enabledFeatures ?? []).length} / {QUILOPILOT_FEATURES.length}
                        </span>
                      </td>
                      <td>
                        <span className="cell-sub">
                          {(plan.usageLimits ?? []).length} configurados
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn-icon-action"
                            title={plan.isDefault ? "Es predeterminado" : "Establecer como predeterminado"}
                            aria-label={plan.isDefault ? "Es predeterminado" : "Establecer como predeterminado"}
                            onClick={() => void handleSetDefaultPlan(plan)}
                            disabled={plan.isDefault}
                          >
                            {plan.isDefault ? "✓ Pred." : "★ Pred."}
                          </button>
                          <button
                            type="button"
                            className="btn-icon-action"
                            title="Editar"
                            aria-label="Editar"
                            onClick={() => openPlanModal(plan)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn-icon-action btn-danger"
                            title="Eliminar"
                            aria-label="Eliminar"
                            onClick={() => void handleDeletePlan(plan)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="master-detail__sidebar">
            <div className="settings-preview">
              <div className="settings-preview__title">Resumen</div>
              <div className="settings-preview__stat">
                <span className="settings-preview__stat-value">{plans?.length ?? 0}</span>
                <span className="settings-preview__stat-label">Planes totales</span>
              </div>
              <div className="settings-preview__stat">
                <span className="settings-preview__stat-value">{plans?.filter(p => p.isActive).length ?? 0}</span>
                <span className="settings-preview__stat-label">Activos</span>
              </div>
              <div className="settings-preview__stat">
                <span className="settings-preview__stat-value">
                  {plans?.find(p => p.isDefault)?.name ?? "Ninguno"}
                </span>
                <span className="settings-preview__stat-label">Predeterminado</span>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <EmptyState title="Sin planes" message="Crea planes para definir las funcionalidades disponibles por tenant." />
      )}

      <Modal open={planModalOpen} title={editingPlan ? "Editar plan" : "Nuevo plan"} onClose={() => setPlanModalOpen(false)} panelClassName="modal__panel--wide">
        <form className="modal__form" onSubmit={handleSavePlan}>
          <div className="form-card__grid">
            <Field
              id="plan-key"
              label="Key"
              type="text"
              value={planForm.key}
              onChange={(event) => setPlanForm((current) => ({ ...current, key: event.target.value.toUpperCase() }))}
              required
              disabled={!!editingPlan}
            />

            <Field
              id="plan-name"
              label="Nombre"
              type="text"
              value={planForm.name}
              onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))}
              required
            />

            <Field
              id="plan-sort"
              label="Orden"
              type="number"
              value={planForm.sortOrder}
              onChange={(event) => setPlanForm((current) => ({ ...current, sortOrder: event.target.value }))}
            />

            <div className="form-field">
              <label htmlFor="plan-active">Estado</label>
              <select
                id="plan-active"
                value={planForm.isActive ? "1" : "0"}
                onChange={(event) => setPlanForm((current) => ({ ...current, isActive: event.target.value === "1" }))}
              >
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="plan-default">Predeterminado</label>
              <select
                id="plan-default"
                value={planForm.isDefault ? "1" : "0"}
                onChange={(event) => setPlanForm((current) => ({ ...current, isDefault: event.target.value === "1" }))}
              >
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="plan-desc">Descripción</label>
            <textarea
              id="plan-desc"
              rows={2}
              value={planForm.description}
              onChange={(event) => setPlanForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>

          <section className="settings-card__section">
            <header className="settings-card__header">
              <div>
                <h2>Funcionalidades de QuoPilot</h2>
                <p>Activa/desactiva cada funcionalidad de la aplicación para este plan.</p>
              </div>
            </header>

            <div className="features-config-grid">
              {QUILOPILOT_FEATURES.map((feature) => (
                <div key={feature.key} className="feature-config-item">
                  <label className="feature-config-label">
                    <input
                      type="checkbox"
                      checked={planForm.enabledFeatures.includes(feature.key)}
                      onChange={(event) => updatePlanFeature(feature.key, event.target.checked)}
                    />
                    <span>
                      <strong>{feature.label}</strong>
                      {feature.description && <span className="feature-config-desc">{feature.description}</span>}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section className="settings-card__section">
            <header className="settings-card__header">
              <div>
                <h2>Límites de Uso del Plan</h2>
                <p>Configura las cuotas máximas de recursos. Ingresa -1 para ilimitado.</p>
              </div>
            </header>

            <div className="form-card__grid">
              {usageLimitsCatalog.map((ul) => (
                <Field
                  key={ul.code}
                  id={`limit-${ul.code}`}
                  label={`${ul.name} (${ul.unit})`}
                  type="number"
                  value={String(planForm.usageLimits[ul.code] ?? ul.defaultValue)}
                  helper={ul.description}
                  onChange={(event) => updateUsageLimitValue(ul.code, event.target.value)}
                  required
                />
              ))}
            </div>
          </section>

          {planError && <FormMessage kind="error">{planError}</FormMessage>}
          <Button type="submit" icon="check" iconOnly disabled={planSaving}>
            {planSaving ? "Guardando..." : "Guardar plan"}
          </Button>
        </form>
      </Modal>
    </main>
  );
}
