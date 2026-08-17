import React from "react";

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 80,
};

interface LoadingOverlayProps {
  title: string;
  message?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const Spinner: React.FC<{ size: keyof typeof sizeMap; className?: string }> = ({
  size,
  className,
}) => {
  const s = sizeMap[size];
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 5.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5Zm0 2a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5Z"
      />
      <path
        fill="currentColor"
        d="M12 18.25a5.75 5.75 0 1 1 0-11.5 5.75 5.75 0 0 1 0 11.5Z"
      />
      <path
        fill="currentColor"
        d="M12 9.75v3.5m0 0h3.5m-3.5-3.5V9.75a2.75 2.75 0 1 0-5.5 0 2.75 2.75 0 0 0 5.5 0Z"
      />
    </svg>
  );
};

export default function LoadingOverlay({
  title,
  message,
  size = "md",
  className,
}: LoadingOverlayProps) {
  const spinnerSize = sizeMap[size];
  return (
    <main
      className={`page-state page-state--loading ${className || ""}`}
      style={{
        width: `${spinnerSize}px`,
        height: `${spinnerSize}px`,
      }}
    >
      <Spinner size={size} className="page-state__spinner" />

      <h1>{title}</h1>

      {message && <p>{message}</p>}
    </main>
  );
}