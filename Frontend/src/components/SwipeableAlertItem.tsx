import React, { useState, useRef } from "react";
import { Trash2, X, AlertTriangle, ExternalLink, Info } from "lucide-react";

export interface AlertLog {
  id: string;
  targetId?: string;
  createdAt: string;
  details?: {
    title?: string;
    body?: string;
    url?: string;
    level?: string;
  };
}

interface SwipeableAlertItemProps {
  alert: AlertLog;
  onSelect: (url?: string) => void;
  onDismiss: (id: string) => void;
}

export function SwipeableAlertItem({ alert, onSelect, onDismiss }: SwipeableAlertItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const isPointerDownRef = useRef(false);
  const hasDraggedRef = useRef(false);

  const DISMISS_THRESHOLD = 70; // px threshold to trigger dismiss

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only respond to primary click (left mouse) or direct touch
    if (e.button !== 0 || isDismissing) return;

    isPointerDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    currentXRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || isDismissing) return;

    const deltaX = e.clientX - startXRef.current;
    const deltaY = e.clientY - startYRef.current;

    // Detect if user is scrolling vertically before horizontal drag is established
    if (!hasDraggedRef.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        // Vertical scroll - release pointer down so normal scroll continues
        isPointerDownRef.current = false;
        return;
      }

      if (Math.abs(deltaX) > 6) {
        hasDraggedRef.current = true;
        setIsDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Fallback if setPointerCapture is unsupported
        }
      }
    }

    if (hasDraggedRef.current) {
      currentXRef.current = deltaX;
      setTranslateX(deltaX);
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    setIsDragging(false);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Fallback
    }

    const deltaX = currentXRef.current;
    if (Math.abs(deltaX) >= DISMISS_THRESHOLD) {
      triggerDismiss(deltaX > 0 ? "right" : "left");
    } else {
      // Snap back smoothly
      setTranslateX(0);
      currentXRef.current = 0;
    }
  };

  const triggerDismiss = (direction: "left" | "right") => {
    setIsDismissing(true);
    setTranslateX(direction === "right" ? 360 : -360);

    setTimeout(() => {
      onDismiss(alert.id);
    }, 280);
  };

  const handleClick = (e: React.MouseEvent) => {
    // If user dragged horizontally, prevent navigation click
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const targetUrl =
      alert.details?.url ||
      (alert.targetId ? `/devices/${alert.targetId}` : "/devices");

    onSelect(targetUrl);
  };

  const handleExplicitDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerDismiss("right");
  };

  const isPastThreshold = Math.abs(translateX) >= DISMISS_THRESHOLD;
  const targetUrl =
    alert.details?.url ||
    (alert.targetId ? `/devices/${alert.targetId}` : "/devices");

  return (
    <div
      className={`relative overflow-hidden transition-all duration-300 ${
        isDismissing
          ? "max-h-0 opacity-0 py-0 border-transparent pointer-events-none"
          : "max-h-48 border-b border-border/60 last:border-b-0"
      }`}
    >
      {/* Background action banner revealed on drag */}
      <div
        className={`absolute inset-0 flex items-center px-4 transition-colors select-none ${
          translateX > 0
            ? "justify-start bg-red-500/15 text-red-600 dark:text-red-400"
            : "justify-end bg-red-500/15 text-red-600 dark:text-red-400"
        } ${isPastThreshold ? "bg-red-500/25 font-semibold" : "opacity-80"}`}
        aria-hidden="true"
      >
        <div
          className={`flex items-center gap-1.5 text-xs transition-transform duration-150 ${
            isPastThreshold ? "scale-105" : "scale-95"
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Dismiss</span>
        </div>
      </div>

      {/* Foreground Swipeable Card */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClick={handleClick}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging
            ? "none"
            : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
          opacity: isDismissing ? 0 : 1 - Math.min(Math.abs(translateX) / 450, 0.45),
        }}
        className="relative bg-background p-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors cursor-pointer select-none touch-pan-y group"
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            {alert.details?.level === "info" ? (
              <span className="mt-0.5 inline-flex items-center justify-center p-1.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                <Info className="w-3.5 h-3.5" />
              </span>
            ) : (
              <span className="mt-0.5 inline-flex items-center justify-center p-1.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground flex items-center gap-1.5 truncate">
                <span className="truncate">{alert.details?.title || "Alert"}</span>
                {targetUrl && (
                  <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                {alert.details?.body || "Telemetry threshold exceeded."}
              </div>
              <div className="text-[10px] text-muted-foreground/80 mt-2 flex items-center justify-between">
                <span>{new Date(alert.createdAt).toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                  Drag to dismiss
                </span>
              </div>
            </div>
          </div>

          {/* Quick dismiss button for hover / touch */}
          <button
            type="button"
            onClick={handleExplicitDismiss}
            className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all shrink-0"
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
