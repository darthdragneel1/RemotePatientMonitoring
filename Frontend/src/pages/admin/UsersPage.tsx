import { useState } from "react";
import { toast } from "sonner";
import { useUsers, useDeleteUser } from "@/hooks/useAdmin";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";

function DeleteUserDialog({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteUser = useDeleteUser();
  const { user } = useAuth();

  // Prevent users from deleting themselves in UI
  if (user?.id === userId) return null;

  async function handleDelete() {
    setError(null);
    try {
      await deleteUser.mutateAsync(userId);
      toast.success("User removed");
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm">Remove</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove User</DialogTitle>
        </DialogHeader>
        <p>Are you sure you want to remove <strong>{userEmail}</strong>? This action cannot be undone.</p>
        {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteUser.isPending}>
            {deleteUser.isPending ? "Removing…" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersPage() {
  const { data: users, isLoading } = useUsers();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
      </div>

      <div className="mt-6 overflow-x-auto rounded-md border border-border">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : users?.length === 0 ? (
          <p className="text-muted-foreground">No users found.</p>
        ) : (
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Email</TableHead>
                <TableHead className="whitespace-nowrap">Role</TableHead>
                <TableHead className="whitespace-nowrap">Organization</TableHead>
                <TableHead className="whitespace-nowrap">Created</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium whitespace-nowrap">{u.email}</TableCell>
                  <TableCell className="whitespace-nowrap">{u.role}</TableCell>
                  <TableCell className="whitespace-nowrap">{u.org?.name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DeleteUserDialog userId={u.id} userEmail={u.email} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
