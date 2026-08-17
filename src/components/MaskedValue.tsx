import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface MaskedValueProps {
  value: string;
  className?: string;
  asLink?: boolean;
}

export default function MaskedValue({
  value,
  className,
  asLink = false,
}: MaskedValueProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span className="masked-value">
      {revealed ? (
        asLink ? (
          <a
            className={className}
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            title={value}
          >
            {value}
          </a>
        ) : (
          <code className={className}>{value}</code>
        )
      ) : (
        <span className={className}>••••••••</span>
      )}

      <button
        type="button"
        className="btn-icon-action masked-value__toggle"
        title={revealed ? "Ocultar" : "Revelar"}
        aria-label={revealed ? "Ocultar valor" : "Revelar valor"}
        aria-pressed={revealed}
        onClick={() => setRevealed((current) => !current)}
      >
        {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </span>
  );
}