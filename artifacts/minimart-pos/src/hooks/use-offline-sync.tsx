import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createSale } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListProductsQueryKey, getListSalesQueryKey, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useOnlineStatus } from "./use-online-status";
import { getPendingSales, removePendingSale, countPendingSales, type PendingSale } from "@/lib/offline-db";
import { useToast } from "./use-toast";

type OfflineSyncContextValue = {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  refreshPendingCount: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refreshPendingCount = useCallback(async () => {
    setPendingCount(await countPendingSales());
  }, []);

  const syncPendingSales = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const pending: PendingSale[] = await getPendingSales();
      if (pending.length === 0) return;

      let syncedCount = 0;
      let failedCount = 0;

      for (const sale of pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
        try {
          await createSale(sale.payload);
          await removePendingSale(sale.localId);
          syncedCount += 1;
        } catch {
          // Leave it in the queue (e.g. stock conflict, still offline) and try again next time.
          failedCount += 1;
        }
      }

      if (syncedCount > 0) {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        toast({
          title: "Offline sales synced",
          description: `${syncedCount} sale${syncedCount > 1 ? "s" : ""} uploaded successfully.`,
        });
      }
      if (failedCount > 0) {
        toast({
          title: "Some sales could not sync",
          description: `${failedCount} sale${failedCount > 1 ? "s" : ""} still pending — will retry automatically.`,
          variant: "destructive",
        });
      }
    } finally {
      await refreshPendingCount();
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [queryClient, refreshPendingCount, toast]);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    if (isOnline) {
      syncPendingSales();
    }
  }, [isOnline, syncPendingSales]);

  // Retry periodically while there are pending sales (handles flaky connections
  // where `online`/`offline` events don't fire reliably).
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      syncPendingSales();
    }, 30000);
    return () => clearInterval(interval);
  }, [isOnline, syncPendingSales]);

  return (
    <OfflineSyncContext.Provider value={{ isOnline, pendingCount, isSyncing, refreshPendingCount }}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) throw new Error("useOfflineSync must be used within an OfflineSyncProvider");
  return ctx;
}
