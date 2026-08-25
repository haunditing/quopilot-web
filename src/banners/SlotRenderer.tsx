import { getUser } from "../services/auth-storage";
import { useCapabilities } from "../hooks/useCapabilities";
import { useBanners } from "./useBanners";
import { evaluateConditions } from "./condition-evaluator";
import { getBannerComponent } from "./component-registry";
import type { BannerContext, BannerSlot } from "../types/banner";

interface SlotRendererProps {
  /** Slot físico donde vive el banner (p. ej. "dashboard_top"). */
  slotId: BannerSlot;
  /** Contexto extra del usuario (p. ej. { paymentStatus: "failed" }). */
  context?: Partial<BannerContext>;
  /** Máximo de banners a renderizar (por defecto: todos los que matcheen). */
  limit?: number;
}

/**
 * <SlotRenderer slotId="dashboard_top" /> — Server-Driven UI.
 *
 * Carga los banners públicos, filtra los del `slotId`, evalúa sus condiciones
 * contra el contexto del usuario actual y renderiza el de mayor prioridad
 * usando el registro de componentes del Design System.
 */
export function SlotRenderer({ slotId, context, limit }: SlotRendererProps) {
  const { banners, loading } = useBanners();
  const { capabilities } = useCapabilities();
  const user = getUser();

  if (loading) return null;

  const ctx: BannerContext = {
    role: user?.role ?? undefined,
    plan: capabilities?.planKey ?? undefined,
    ...context,
  };

  const matches = (banners ?? [])
    .filter((b) => b.slot === slotId && evaluateConditions(b.conditions, ctx))
    .sort((a, b) => b.priority - a.priority);

  const selected = typeof limit === "number" ? matches.slice(0, limit) : matches;
  if (selected.length === 0) return null;

  return (
    <>
      {selected.map((banner) => {
        const Component = getBannerComponent(banner.type);
        return <Component key={banner.id} props={banner.props} />;
      })}
    </>
  );
}
