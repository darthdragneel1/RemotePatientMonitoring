import { useState, useEffect, useRef } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useWebPush } from "@/hooks/useWebPush";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

interface AlertLog {
  id: string;
  createdAt: string;
  details?: {
    title?: string;
    body?: string;
    url?: string;
  };
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { isSupported, isSubscribed, subscribe, unsubscribe } = useWebPush();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ logs: AlertLog[] }>("/push/alerts?limit=10");
      setAlerts(data.logs || []);
    } catch (err) {
      console.error("Failed to fetch alerts", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDropdown = async () => {
    if (!isOpen) {
      fetchAlerts();
    }
    setIsOpen(!isOpen);
  };

  const handleToggleSubscription = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (!isSupported) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className={`p-2 transition-colors relative ${isSubscribed ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        title="Notifications"
      >
        <Bell size={20} />
        {!isSubscribed && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-background border rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-3 border-b flex justify-between items-center bg-muted/30">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs"
              onClick={handleToggleSubscription}
            >
              {isSubscribed ? (
                <><BellOff className="w-3 h-3 mr-1" /> Disable</>
              ) : (
                <><Bell className="w-3 h-3 mr-1" /> Enable</>
              )}
            </Button>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 flex justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No recent alerts.
              </div>
            ) : (
              <div className="flex flex-col">
                {alerts.map((alert) => (
                  <button
                    key={alert.id}
                    onClick={() => {
                      setIsOpen(false);
                      if (alert.details?.url) navigate(alert.details.url);
                    }}
                    className="p-3 border-b last:border-b-0 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="font-medium text-sm text-foreground">
                      {alert.details?.title || "Alert"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                      {alert.details?.body}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-2">
                      {new Date(alert.createdAt).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
