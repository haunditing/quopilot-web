import type { ComponentType } from "react";
import type { BannerProps, BannerType } from "../types/banner";
import { AlertBanner } from "../components/banners/AlertBanner";
import { InlineNotice } from "../components/banners/InlineNotice";
import { ModalNotice } from "../components/banners/ModalNotice";

interface RegistryEntry {
  component: ComponentType<{ props: BannerProps }>;
}

/** Registro: tipo visual → componente nativo del Design System. */
const REGISTRY: Record<BannerType, RegistryEntry> = {
  AlertBanner: { component: AlertBanner },
  InlineNotice: { component: InlineNotice },
  ModalNotice: { component: ModalNotice },
};

export function getBannerComponent(type: BannerType) {
  return REGISTRY[type]?.component ?? InlineNotice;
}
