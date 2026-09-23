import { useState } from "react";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

export function AuditLogsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLogs(page, 20);

  if (user?.role === "ORG_USER") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
      <Card>
        <CardHeader>
          <CardTitle>System Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Timestamp</TableHead>
                  <TableHead className="whitespace-nowrap">User</TableHead>
                  <TableHead className="whitespace-nowrap">Action</TableHead>
                  <TableHead className="whitespace-nowrap">Target</TableHead>
                  <TableHead className="whitespace-nowrap">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data?.logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{log.userEmail || "System"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {log.target} {log.targetId ? <span className="text-xs text-muted-foreground ml-1">({log.targetId.slice(-6)})</span> : null}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs font-mono text-muted-foreground">
                        {log.details ? JSON.stringify(log.details) : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Page {page} of {data?.totalPages || 1}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!data || page >= data.totalPages || isLoading}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
