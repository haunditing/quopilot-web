import { useState } from "react";
import type { HTMLAttributes, FormHTMLAttributes } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function DetailLayout({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <main
      className={`min-h-full bg-surface-light [&>.page-header]:mb-6 ${className}`}
      {...props}
    >
      {children}
    </main>
  );
}

export type DetailLayoutBodyProps =
  | (HTMLAttributes<HTMLDivElement> & {
      isForm?: false;
      sidebarPosition?: "left" | "right";
    })
  | (FormHTMLAttributes<HTMLFormElement> & {
      isForm: true;
      sidebarPosition?: "left" | "right";
    });

export function DetailLayoutBody({
  isForm,
  sidebarPosition = "right",
  children,
  className = "",
  ...props
}: DetailLayoutBodyProps) {
  const gridCols =
    sidebarPosition === "left"
      ? "md:grid-cols-[260px_minmax(0,1fr)]"
      : "md:grid-cols-[minmax(0,1fr)_300px]";
  const bodyClasses = `grid grid-cols-1 ${gridCols} gap-6 items-start ${className}`;

  if (isForm) {
    return (
      <form
        className={bodyClasses}
        {...(props as FormHTMLAttributes<HTMLFormElement>)}
      >
        {children}
      </form>
    );
  }
  return (
    <div className={bodyClasses} {...(props as HTMLAttributes<HTMLDivElement>)}>
      {children}
    </div>
  );
}

export function DetailLayoutMain({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex flex-col gap-4 min-w-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function DetailSidebar({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <aside className={`md:sticky md:top-5 ${className}`} {...props}>
      <div className="flex flex-col gap-5 p-6 bg-white border border-slate-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {children}
      </div>
    </aside>
  );
}

export function DetailSidebarTitle({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`text-slate-900 text-lg font-bold leading-snug ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function DetailSidebarMeta({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col gap-3 [&>div]:flex [&>div]:flex-col [&>div]:gap-0.5 [&_span]:text-slate-500 [&_span]:text-xs [&_strong]:text-slate-900 [&_strong]:text-base [&_strong]:font-bold ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function DetailSidebarActions({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col gap-2.5 [&>button]:w-full [&>button]:justify-center ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function DetailSectionCard({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const cardClasses = `flex flex-col gap-4 p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`;
  const contentClasses =
    "flex flex-col gap-4 [&_label]:block [&_label]:text-[11px] [&_label]:font-bold [&_label]:uppercase [&_label]:tracking-wider [&_label]:text-ink-muted [&_label]:mb-1 [&_span.value]:block [&_span.value]:text-ink-strong [&_span.value]:text-sm";

  if (!collapsible) {
    return (
      <section className={cardClasses} {...props}>
        <h2 className="m-0 text-slate-900 text-base font-bold">{title}</h2>
        <div className={contentClasses}>{children}</div>
      </section>
    );
  }

  return (
    <section className={cardClasses} {...props}>
      <button
        type="button"
        className="flex items-center justify-between w-full p-0 bg-transparent border-none text-inherit font-inherit cursor-pointer text-left"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="flex flex-col gap-0.5">
          <strong className="text-slate-900 text-base font-bold">
            {title}
          </strong>
        </span>
        {isOpen ? (
          <ChevronUp size={18} className="text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && <div className={contentClasses}>{children}</div>}
    </section>
  );
}
