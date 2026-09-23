import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useOrganizations, useCreateOrganization, useDeleteOrganization } from "@/hooks/useAdmin";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function DeleteOrganizationDialog({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteOrganization = useDeleteOrganization();

  async function handleDelete() {
    setError(null);
    try {
      await deleteOrganization.mutateAsync(orgId);
      toast.success("Organization removed");
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
          <DialogTitle>Remove Organization</DialogTitle>
        </DialogHeader>
        <p>Are you sure you want to remove <strong>{orgName}</strong>? This action cannot be undone.</p>
        {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteOrganization.isPending}>
            {deleteOrganization.isPending ? "Removing…" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OrganizationsPage() {
  const { data: organizations, isLoading } = useOrganizations();
  const createOrganization = useCreateOrganization();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setName("");
      setError(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createOrganization.mutateAsync({ name });
      toast.success("Organization created");
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Organizations</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>Create Organization</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={createOrganization.isPending}>
                  {createOrganization.isPending ? "Creating…" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

        <div className="mt-6 overflow-x-auto rounded-md border border-border">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Created</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations?.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium whitespace-nowrap">{org.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(org.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DeleteOrganizationDialog orgId={org.id} orgName={org.name} />
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
