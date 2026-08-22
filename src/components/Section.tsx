import type { ReactNode } from "react";

interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function Section({ title, description, children }: SectionProps) {
  return (
    <section className="mt-8 md:mt-6">
      <div className="mb-4 [&>p]:mt-1 [&>p]:text-sm text-ink-muted">
        <h2>{title}</h2>

        {description && <p>{description}</p>}
      </div>

      {children}
    </section>
  );
}
