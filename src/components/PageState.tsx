import Icon from "./Icon.js";

interface PageStateProps {
  title: string;
  message?: string;
  kind?: "loading" | "error" | "info";
}

export default function PageState({
  title,
  message,
  kind = "info",
}: PageStateProps) {
  const icon = kind === "error" ? "error" : "empty";
  const className =
    kind === "error" ? "page-state page-state--error" : "page-state";

  return (
    <main className={className}>
      {kind !== "loading" && (
        <Icon name={icon} size={42} className="page-state__icon" />
      )}

      <h1>{title}</h1>

      {message && <p>{message}</p>}
    </main>
  );
}
