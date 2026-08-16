import PageHeader from "../PageHeader.js";
import DashboardCard from "./DashboardCard.js";
import type { DashboardConfig } from "../../types/dashboard-ui.js";

interface DashboardRendererProps {
  config: DashboardConfig;
}

export default function DashboardRenderer({ config }: DashboardRendererProps) {
  return (
    <main className="dashboard-page">
      <PageHeader title={config.title} description={config.description} />

      <div className="dashboard-sections">
        {config.sections.map((section) => (
          <section key={section.id} className="dashboard-section">
            {(section.title || section.description) && (
              <header className="dashboard-section__header">
                {section.title && <h2>{section.title}</h2>}

                {section.description && <p>{section.description}</p>}
              </header>
            )}

            <div className="dashboard-grid">
              {section.cards.map((card) => (
                <DashboardCard key={card.id} card={card} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
