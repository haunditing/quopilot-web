import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function PageHeader({
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="page-header flex flex-wrap items-start justify-between gap-4 mb-5 md:flex-nowrap md:mb-6">
      <div>
        <h1>{title}</h1>

        {description && (
          <p className="page-header__description mt-1.5 text-sm md:text-[15px] text-ink-muted">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="page-header__actions flex flex-row items-center shrink-0 gap-2 [&_.button]:w-auto [&_.button--icon]:w-11">
          {actions}
        </div>
      )}
    </header>
  );
}
