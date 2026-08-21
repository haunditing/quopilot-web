import Loading from "./Loading.js";

/**
 * @deprecated Envoltorio semántico de compatibilidad.
 *
 * Usa directamente el primitivo `<Loading variant="overlay" … />`.
 * Este wrapper conserva la API histórica (title/message/size/className)
 * para los usos existentes; delega 1:1 en el componente canónico.
 */
export default function LoadingOverlay({
  title,
  message,
  size = "md",
  className,
}: {
  title: string;
  message?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <Loading
      variant="overlay"
      label={title}
      message={message}
      size={size}
      className={className}
    />
  );
}
