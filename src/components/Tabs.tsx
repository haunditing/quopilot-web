export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

export default function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === active;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={isActive ? "tabs__tab tabs__tab--active" : "tabs__tab"}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}

            {tab.count !== undefined && (
              <span className="tabs__count">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
