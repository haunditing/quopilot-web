import type { ReactNode } from "react";

interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function Section({ title, description, children }: SectionProps) {
  return (
    <section className="detail-section">
      <div className="section-heading">
        <h2>{title}</h2>

        {description && <p>{description}</p>}
      </div>

      {children}
    </section>
  );
}
