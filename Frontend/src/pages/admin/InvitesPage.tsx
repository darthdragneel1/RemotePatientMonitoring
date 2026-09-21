import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useInvites, useCreateInvite, useRevokeInvite, useOrganizations } from "@/hooks/useAdmin";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function InvitesPage() {
  const { data: invites, isLoading } = useInvites();
  const { data: organizations } = useOrganizations();
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [orgId, setOrgId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setEmail("");
      setOrgId("");
      setError(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createInvite.mutateAsync({ email, orgId });
      toast.success("Invite sent");
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this invite?")) return;
    await revokeInvite.mutateAsync(id);
    toast.success("Invite revoked");
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invites</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>Invite User</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select value={orgId} onValueChange={(v) => setOrgId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations?.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={createInvite.isPending || !orgId}>
                  {createInvite.isPending ? "Sending…" : "Send Invite"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : invites?.length === 0 ? (
          <p className="text-muted-foreground">No pending invites.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites?.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>{invite.email}</TableCell>
                  <TableCell>{invite.org?.name ?? "—"}</TableCell>
                  <TableCell>{new Date(invite.expiresAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleRevoke(invite.id)}>
                      Revoke
                    </Button>
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
