import React from "react";

const sizeMap = {
  xs: 20,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 80,
};

const Spinner: React.FC<{ size?: "xs" | "sm" | "md" | "lg" | "xl"; className?: string }> = ({
  size = "md",
  className,
}) => {
  const w = sizeMap[size];
  return (
    <svg
      width={w}
      height={w}
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

export default Spinner;