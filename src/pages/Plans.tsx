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
} from "../services/support-assistant-service.js";
import type { Plan, PlanAppFeature } from "../types/support-assistant.js";
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

interface PlanFormState {
  key: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: string;
  features: PlanAppFeature[];
}

function emptyPlanForm(): PlanFormState {
  return {
    key: "",
    name: "",
    description: "",
    isActive: true,
    isDefault: false,
    sortOrder: "0",
    features: QUILOPILOT_FEATURES.map(f => ({
      key: f.key,
      label: f.label,
      description: f.description,
      enabled: false,
      config: {},
    })),
  };
}

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

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormState>(emptyPlanForm());
  const [planSaving, setPlanSaving] = useState(false);
  const [planError, setPlanError] = useState("");

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError("");

    try {
      setPlans(await listPlans());
    } catch (error) {
      setPlansError(error instanceof Error ? error.message : "No fue posible cargar los planes");
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      await loadPlans();
    }
    void load();
  }, [loadPlans]);

  function openPlanModal(plan?: Plan) {
    setEditingPlan(plan ?? null);
    setPlanError("");
    setPlanForm(
      plan
        ? {
            key: plan.key,
            name: plan.name,
            description: plan.description,
            isActive: plan.isActive,
            isDefault: plan.isDefault,
            sortOrder: String(plan.sortOrder),
            features: plan.features,
          }
        : emptyPlanForm(),
    );
    setPlanModalOpen(true);
  }

  function updatePlanAppFeature(featureKey: string, updates: Partial<PlanAppFeature>) {
    setPlanForm((current) => ({
      ...current,
      features: current.features.map((f) =>
        f.key === featureKey ? { ...f, ...updates } : f
      ),
    }));
  }

  async function handleSavePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlanSaving(true);
    setPlanError("");

    const payload = {
      key: planForm.key.trim().toUpperCase(),
      name: planForm.name.trim(),
      description: planForm.description.trim() || undefined,
      isActive: planForm.isActive,
      isDefault: planForm.isDefault,
      sortOrder: Number(planForm.sortOrder),
      features: planForm.features,
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
      await loadPlans();
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
      await loadPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar");
    }
  }

  async function handleSetDefaultPlan(plan: Plan) {
    try {
      await setDefaultPlan(plan.key);
      toast.success("Plan predeterminado actualizado");
      await loadPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible actualizar");
    }
  }

  return (
    <main className="master-detail">
      <PageHeader
        title="Planes"
        description="Define planes con funcionalidades atómicas de la aplicación QuoPilot"
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
                          {plan.features.filter((f) => f.enabled).length} / {QUILOPILOT_FEATURES.length}
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
                            {plan.isDefault ? "✓ Predeterminado" : "★ Predeterminado"}
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
              {QUILOPILOT_FEATURES.map((feature) => {
                const existing = planForm.features.find(f => f.key === feature.key);
                const enabled = existing?.enabled ?? false;
                return (
                  <div key={feature.key} className="feature-config-item">
                    <label className="feature-config-label">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(event) => updatePlanAppFeature(feature.key, { enabled: event.target.checked })}
                      />
                      <span>
                        <strong>{feature.label}</strong>
                        {feature.description && <span className="feature-config-desc">{feature.description}</span>}
                      </span>
                    </label>
                  </div>
                );
              })}
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