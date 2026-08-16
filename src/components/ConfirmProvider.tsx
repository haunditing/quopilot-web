import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Button from "./Button.js";
import Modal from "./Modal.js";
import { ConfirmContext } from "../hooks/useConfirm.js";
import type { ConfirmOptions } from "../hooks/useConfirm.js";

export default function ConfirmProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((result: boolean) => void) | null>(null);

  const confirm = useCallback((nextOptions: ConfirmOptions) => {
    resolverRef.current?.(false);
    resolverRef.current = null;

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(nextOptions);
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      {options && (
        <Modal
          open
          title={options.title}
          onClose={() => settle(false)}
          panelClassName="modal__panel--confirm"
        >
          <div className="confirm-dialog">
            {options.message && (
              <p className="confirm-dialog__message">{options.message}</p>
            )}

            <div className="confirm-dialog__actions">
              <Button
                variant="secondary"
                icon="close"
                iconOnly
                onClick={() => settle(false)}
              >
                {options.cancelLabel ?? "Cancelar"}
              </Button>

              <Button
                variant={options.danger ? "danger" : "primary"}
                icon="check"
                iconOnly
                onClick={() => settle(true)}
              >
                {options.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}
