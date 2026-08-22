import { useState, type ReactNode, type FormEvent } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function DetailLayout({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <main className={`master-detail ${className}`}>{children}</main>;
}

export function DetailLayoutBody({
  children,
  isForm = false,
  onSubmit,
  className = "",
}: {
  children: ReactNode;
  isForm?: boolean;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  className?: string;
}) {
  if (isForm) {
    return (
      <form className={`master-detail__body ${className}`} onSubmit={onSubmit}>
        {children}
      </form>
    );
  }
  return <div className={`master-detail__body ${className}`}>{children}</div>;
}

export function DetailLayoutMain({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`master-detail__main ${className}`}>{children}</div>;
}

export function DetailSidebar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside className={`master-detail__sidebar ${className}`}>
      <div className="master-detail-sidebar">{children}</div>
    </aside>
  );
}

export function DetailSidebarTitle({ children }: { children: ReactNode }) {
  return <div className="master-detail-sidebar__title">{children}</div>;
}

export function DetailSidebarMeta({ children }: { children: ReactNode }) {
  return <div className="master-detail-sidebar__meta">{children}</div>;
}

export function DetailSidebarActions({ children }: { children: ReactNode }) {
  return <div className="master-detail-sidebar__actions">{children}</div>;
}

export function DetailSectionCard({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
  className = "",
}: {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!collapsible) {
    return (
      <section className={`master-detail-card ${className}`}>
        <h2 className="master-detail-card__title">{title}</h2>
        <div className="master-detail-card__grid">{children}</div>
      </section>
    );
  }

  return (
    <section className={`master-detail-card ${className}`}>
      <button
        type="button"
        className="master-detail-card__heading"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="master-detail-card__heading-text">{title}</span>
        {isOpen ? (
          <ChevronUp size={18} className="master-detail-card__chevron" />
        ) : (
          <ChevronDown size={18} className="master-detail-card__chevron" />
        )}
      </button>
      {isOpen && <div className="master-detail-card__grid">{children}</div>}
    </section>
  );
}
