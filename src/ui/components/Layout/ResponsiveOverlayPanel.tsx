import React, { useEffect } from 'react';

import { cn } from '@/ui/design-system/utils/cn';

type Position = 'left' | 'right' | 'bottom';

interface ResponsiveOverlayPanelProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  position?: Position;
  widthClassName?: string;
}

export const ResponsiveOverlayPanel: React.FC<ResponsiveOverlayPanelProps> = ({
  open,
  title,
  onClose,
  children,
  position = 'right',
  widthClassName = 'max-w-md',
}) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const panelClassName =
    position === 'bottom'
      ? 'absolute bottom-0 left-0 right-0 max-h-[82vh] rounded-t-2xl bg-background-elevated border-t border-border shadow-2xl flex flex-col'
      : cn(
          'absolute top-0 bottom-0 w-full bg-background-elevated shadow-2xl flex flex-col',
          widthClassName,
          position === 'left'
            ? 'left-0 border-r border-border'
            : 'right-0 border-l border-border'
        );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={panelClassName}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-background-muted text-foreground-secondary"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default ResponsiveOverlayPanel;
