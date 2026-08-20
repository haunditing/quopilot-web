import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Button from "../components/Button.js";
import EmptyState from "../components/EmptyState.js";
import Icon from "../components/Icon.js";
import LoadingOverlay from "../components/LoadingOverlay.js";
import PageHeader from "../components/PageHeader.js";
import PageState from "../components/PageState.js";
import Switch from "../components/Switch.js";
import { getUserRole } from "../services/auth-storage.js";
import {
  getPlanCapabilities,
  listPlans,
  updatePlanCapabilities,
} from "../services/support-assistant-service.js";
import type {
  CapabilityMatrixEntry,
  Plan,
  PlanCapabilityMatrix,
} from "../types/support-assistant.js";
import { useToast } from "../hooks/useToast.js";

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  customers: "Clientes",
  products: "Productos",
  quotes: "Cotizaciones",
  sales: "Ventas",
  channels: "Canales",
  conversations: "Conversaciones",
  agent: "Agente IA",
  settings: "Configuración",
  auth: "Autenticación",
  tenants: "Empresas (Super Admin)",
  users: "Usuarios",
  plans: "Planes",
  catalog: "Catálogo",
  assistantCapabilities: "Capacidades del asistente",
  webhooks: "Webhooks",
  internalAssistant: "Asistente interno",
  supportAssistant: "Asistente de soporte",
};

const KIND_LABELS: Record<string, string> = {
  VISUALIZACION: "Visualización",
  BUSQUEDA: "Búsqueda",
  CONSULTA: "Consulta",
  CREACION: "Creación",
  EDICION: "Edición",
  ELIMINACION: "Eliminación",
  CAMBIO_ESTADO: "Cambio de estado",
  OPERACION_COMERCIAL: "Operación comercial",
  DOCUMENTO: "Documento",
  COMUNICACION: "Comunicación",
  CONFIGURACION: "Configuración",
  ANALISIS: "Análisis",
  IA: "IA",
  TECNICA: "Técnica",
  ADMINISTRACION: "Administración",
  SEGURIDAD: "Seguridad",
  AUTENTICACION: "Autenticación",
};

export default function CapabilitiesDashboard() {
  const role = getUserRole();

  if (role !== "SUPER_ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <CapabilitiesPanel />;
}

function CapabilitiesPanel() {
  const toast = useToast();

  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState("");

  const [selectedPlanKey, setSelectedPlanKey] = useState("");

  const [matrix, setMatrix] = useState<PlanCapabilityMatrix | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixError, setMatrixError] = useState("");

  const [enabledCaps, setEnabledCaps] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError("");

    try {
      const loaded = await listPlans();
      setPlans(loaded);
      if (loaded.length > 0 && !loaded.some((p) => p.key === selectedPlanKey)) {
        setSelectedPlanKey(loaded[0].key);
      }
    } catch (error) {
      setPlansError(error instanceof Error ? error.message : "No fue posible cargar los planes");
    } finally {
      setPlansLoading(false);
    }
  }, [selectedPlanKey]);

  useEffect(() => {
    async function load() {
      await loadPlans();
    }
    void load();
  }, [loadPlans]);

  const loadMatrix = useCallback(async (planKey: string) => {
    setMatrixLoading(true);
    setMatrixError("");

    try {
      const result = await getPlanCapabilities(planKey);
      setMatrix(result);
      setEnabledCaps(result.capabilityCodes);
    } catch (error) {
      setMatrixError(error instanceof Error ? error.message : "No fue posible cargar la matriz");
    } finally {
      setMatrixLoading(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      await loadMatrix(selectedPlanKey);
    }
    if (!selectedPlanKey) {
      return;
    }
    void load();
  }, [selectedPlanKey, loadMatrix]);

  // Capacidades configurables de módulos habilitados en el plan.
  const allAllowed = useMemo(() => {
    if (!matrix) {
      return new Set<string>();
    }
    return new Set(
      matrix.entries
        .filter((e) => e.configurableByPlan && e.reason !== "feature_disabled")
        .map((e) => e.code),
    );
  }, [matrix]);

  function baseSet(): Set<string> {
    return enabledCaps.length === 0 ? new Set(allAllowed) : new Set(enabledCaps);
  }

  function isEffective(entry: CapabilityMatrixEntry): boolean {
    if (!entry.configurableByPlan) {
      return true;
    }
    if (entry.reason === "feature_disabled") {
      return false;
    }
    return baseSet().has(entry.code);
  }

  function handleToggle(entry: CapabilityMatrixEntry, checked: boolean) {
    const base = baseSet();
    if (checked) {
      base.add(entry.code);
    } else {
      base.delete(entry.code);
    }

    const list = [...base].sort();
    const allList = [...allAllowed].sort();
    setEnabledCaps(list.join("|") === allList.join("|") ? [] : list);
  }

  async function handleSave() {
    if (!matrix) {
      return;
    }
    setSaving(true);

    try {
      await updatePlanCapabilities(matrix.planKey, enabledCaps);
      toast.success("Capacidades actualizadas");
      await loadMatrix(matrix.planKey);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible guardar");
    } finally {
      setSaving(false);
    }
  }

  const modules = useMemo(() => {
    if (!matrix) {
      return [];
    }
    const grouped = new Map<string, CapabilityMatrixEntry[]>();
    for (const entry of matrix.entries) {
      const list = grouped.get(entry.module) ?? [];
      list.push(entry);
      grouped.set(entry.module, list);
    }
    return [...grouped.entries()];
  }, [matrix]);

  const stats = useMemo(() => {
    if (!matrix) {
      return { total: 0, effective: 0, disabled: 0, nonConfigurable: 0, configurable: 0 };
    }
    const entries = matrix.entries;
    const effective = entries.filter((e) => isEffective(e)).length;
    const nonConfigurable = entries.filter((e) => !e.configurableByPlan).length;
    return {
      total: entries.length,
      effective,
      disabled: entries.length - effective,
      nonConfigurable,
      configurable: entries.length - nonConfigurable,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrix, enabledCaps]);

  const changed = matrix
    ? enabledCaps.join("|") !== matrix.capabilityCodes.join("|")
    : false;

  return (
    <main className="master-detail">
      <PageHeader
        title="Cuadro de mando de capacidades"
        description="Autorización efectiva por plan: feature del módulo habilitada + capacidad habilitada. Gate fino opcional."
      />

      {plansLoading ? (
        <LoadingOverlay title="Cargando planes..." message="Esto puede tomar unos segundos" />
      ) : plansError ? (
        <PageState kind="error" title="Error" message={plansError} />
      ) : plans && plans.length > 0 ? (
        <div className="master-detail__body">
          <div className="master-detail__main">
            <div className="capabilities-toolbar">
              <div className="form-field capabilities-toolbar__select">
                <label htmlFor="capability-plan">Plan</label>
                <select
                  id="capability-plan"
                  value={selectedPlanKey}
                  onChange={(event) => setSelectedPlanKey(event.target.value)}
                >
                  {plans.map((plan) => (
                    <option key={plan.key} value={plan.key}>
                      {plan.name} ({plan.key})
                    </option>
                  ))}
                </select>
              </div>

              <div className="capabilities-toolbar__actions">
                <span className="capabilities-toolbar__hint">
                  {changed ? "Hay cambios sin guardar" : "Todo guardado"}
                </span>
                <Button
                  icon="check"
                  onClick={() => void handleSave()}
                  disabled={saving || !changed}
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </div>

            {matrixLoading ? (
              <LoadingOverlay title="Cargando matriz..." message="Consultando capacidades del plan" />
            ) : matrixError ? (
              <PageState kind="error" title="Error" message={matrixError} />
            ) : matrix ? (
              <>
                <section className="capabilities-summary">
                  <div className="capabilities-summary__stat">
                    <span className="capabilities-summary__value">{stats.effective}</span>
                    <span className="capabilities-summary__label">Efectivas</span>
                  </div>
                  <div className="capabilities-summary__stat">
                    <span className="capabilities-summary__value">{stats.disabled}</span>
                    <span className="capabilities-summary__label">Deshabilitadas</span>
                  </div>
                  <div className="capabilities-summary__stat">
                    <span className="capabilities-summary__value">{stats.configurable}</span>
                    <span className="capabilities-summary__label">Configurables por plan</span>
                  </div>
                  <div className="capabilities-summary__stat">
                    <span className="capabilities-summary__value">{stats.nonConfigurable}</span>
                    <span className="capabilities-summary__label">No configurables</span>
                  </div>
                  <div className="capabilities-summary__stat">
                    <span className="capabilities-summary__value">{stats.total}</span>
                    <span className="capabilities-summary__label">Total catálogo</span>
                  </div>
                </section>

                <div className="capabilities-modules">
                  {modules.map(([module, entries]) => (
                    <section key={module} className="settings-card capabilities-module">
                      <header className="settings-card__header">
                        <div>
                          <h2>{MODULE_LABELS[module] ?? module}</h2>
                          <p>
                            {entries.filter((e) => isEffective(e)).length} de {entries.length}{" "}
                            capacidades efectivas
                          </p>
                        </div>
                      </header>

                      <div className="capabilities-table">
                        {entries.map((entry) => {
                          const effective = isEffective(entry);
                          const canToggle =
                            entry.configurableByPlan && entry.reason !== "feature_disabled";

                          return (
                            <div
                              key={entry.code}
                              className={
                                effective
                                  ? "capability-row capability-row--on"
                                  : "capability-row"
                              }
                            >
                              <div className="capability-row__main">
                                <div className="capability-row__title">
                                  <code>{entry.code}</code>
                                  {!entry.configurableByPlan && (
                                    <span className="badge badge-neutral" title={entry.nonConfigurableReason}>
                                      No configurable
                                    </span>
                                  )}
                                  {entry.status === "POR_CONFIRMAR" && (
                                    <span className="badge badge-warning">Por confirmar</span>
                                  )}
                                </div>
                                <div className="capability-row__name">{entry.name}</div>
                                <div className="capability-row__meta">
                                  <span className="capability-row__kind">
                                    {KIND_LABELS[entry.kind] ?? entry.kind}
                                  </span>
                                  {entry.dependencies.length > 0 && (
                                    <span className="capability-row__deps">
                                      Requiere:{" "}
                                      {entry.dependencies.map((d) => d.code).join(", ")}
                                    </span>
                                  )}
                                  {entry.evidence && (
                                    <span className="capability-row__evidence">{entry.evidence}</span>
                                  )}
                                </div>
                              </div>

                              <div className="capability-row__state">
                                {!effective && entry.reason === "feature_disabled" && (
                                  <span className="capability-row__reason">
                                    Módulo no habilitado en el plan
                                  </span>
                                )}
                                {!effective && entry.reason === "capability_disabled" && (
                                  <span className="capability-row__reason">Capacidad deshabilitada</span>
                                )}
                                {!entry.configurableByPlan && entry.nonConfigurableReason && (
                                  <span className="capability-row__reason" title={entry.nonConfigurableReason}>
                                    <Icon name="lock" size={14} /> {entry.nonConfigurableReason}
                                  </span>
                                )}
                                <Switch
                                  checked={effective}
                                  onChange={(checked) => handleToggle(entry, checked)}
                                  disabled={!canToggle}
                                  label={`${entry.name}: ${effective ? "activar" : "desactivar"}`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <aside className="master-detail__sidebar">
            <div className="settings-preview">
              <div className="settings-preview__title">Regla de efectividad</div>
              <p className="settings-preview__text">
                Una capacidad es efectiva cuando el módulo está habilitado en el plan y la
                capacidad está activa. Si el plan no define capacidades explícitas, todas las
                capacidades de los módulos habilitados quedan efectivas.
              </p>
              <div className="settings-preview__title">Gate fino</div>
              <p className="settings-preview__text">
                Las capacidades "No configurables" (autenticación, administración, seguridad y
                técnicas) siempre están efectivas y dependen del rol del usuario.
              </p>
              <div className="settings-preview__title">Dependencias</div>
              <p className="settings-preview__text">
                Se listan las dependencias por capacidad (obligatoria, funcional, técnica o de
                configuración). Son informativas para el diseño de planes.
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <EmptyState
          title="Sin planes"
          message="Crea planes para poder configurar sus capacidades."
        />
      )}
    </main>
  );
}