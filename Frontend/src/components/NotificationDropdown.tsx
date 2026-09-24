import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useWebPush } from "@/hooks/useWebPush";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { SwipeableAlertItem, type AlertLog } from "./SwipeableAlertItem";

const DISMISSED_ALERTS_KEY = "rpm_dismissed_alerts";

function getDismissedAlertIds(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDismissedAlertId(id: string) {
  try {
    const current = getDismissedAlertIds();
    if (!current.includes(id)) {
      const updated = [...current.slice(-199), id];
      localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error("Failed to save dismissed alert ID", e);
  }
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { isSupported, isSubscribed, subscribe, unsubscribe } = useWebPush();

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ logs: AlertLog[] }>("/push/alerts?limit=25");
      const dismissedIds = getDismissedAlertIds();
      const activeAlerts = (data.logs || []).filter(
        (log) => !dismissedIds.includes(log.id)
      );
      setAlerts(activeAlerts);
    } catch (err) {
      console.error("Failed to fetch alerts", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch initial alerts on mount and listen to live alert events
  useEffect(() => {
    fetchAlerts();

    const handleNewAlert = () => {
      fetchAlerts();
    };

    window.addEventListener("rpm:new-alert", handleNewAlert);
    return () => {
      window.removeEventListener("rpm:new-alert", handleNewAlert);
    };
  }, [fetchAlerts]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = async () => {
    if (!isOpen) {
      fetchAlerts();
    }
    setIsOpen((prev) => !prev);
  };

  const handleToggleSubscription = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleSelectAlert = (url?: string) => {
    setIsOpen(false);
    if (url) {
      navigate(url);
    }
  };

  const handleDismissAlert = (id: string) => {
    saveDismissedAlertId(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleClearAll = () => {
    alerts.forEach((alert) => saveDismissedAlertId(alert.id));
    setAlerts([]);
  };

  if (!isSupported) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className={`p-2 transition-colors relative rounded-full hover:bg-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isSubscribed ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
        title="Notifications"
        aria-label="Toggle notifications dropdown"
      >
        <Bell size={20} />
        {alerts.length > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm animate-in zoom-in-50">
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        ) : !isSubscribed ? (
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full"
            title="Push notifications disabled"
          />
        ) : null}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-88 max-w-sm bg-background border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="p-3 border-b flex justify-between items-center bg-muted/40 backdrop-blur">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
              {alerts.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
                  {alerts.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {alerts.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleClearAll}
                >
                  Clear all
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleToggleSubscription}
                title={isSubscribed ? "Disable push notifications" : "Enable push notifications"}
              >
                {isSubscribed ? (
                  <>
                    <BellOff className="w-3 h-3 mr-1 text-muted-foreground" /> Mute
                  </>
                ) : (
                  <>
                    <Bell className="w-3 h-3 mr-1 text-primary" /> Enable
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="max-h-84 overflow-y-auto divide-y divide-border/40">
            {isLoading && alerts.length === 0 ? (
              <div className="p-8 flex justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-1.5">
                <Bell className="w-8 h-8 opacity-25 mb-1" />
                <span className="font-medium">No alerts right now</span>
                <span className="text-xs opacity-75">
                  Abnormal vitals will appear here in real time.
                </span>
              </div>
            ) : (
              <div className="flex flex-col">
                {alerts.map((alert) => (
                  <SwipeableAlertItem
                    key={alert.id}
                    alert={alert}
                    onSelect={handleSelectAlert}
                    onDismiss={handleDismissAlert}
                  />
                ))}
              </div>
            )}
          </div>
          {alerts.length > 0 && (
            <div className="px-3 py-1.5 bg-muted/20 border-t border-border/40 text-[10px] text-muted-foreground text-center select-none">
              Swipe sideways to dismiss • Click to view device
            </div>
          )}
        </div>
      )}
    </div>
  );
}
