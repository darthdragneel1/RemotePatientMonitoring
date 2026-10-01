import { useParams, Link, useNavigate } from "react-router-dom";
import { useOrganization } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: organization, isLoading } = useOrganization(id);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!organization) return <p className="text-muted-foreground">Organization not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/organizations" className="text-sm text-muted-foreground hover:underline">
          ← Organizations
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{organization.name}</h1>
        <p className="text-sm text-muted-foreground">
          Created {new Date(organization.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Patients ({organization.patients.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {organization.patients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No patients found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>MRN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organization.patients.map((patient: any) => (
                      <TableRow 
                        key={patient.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/patients/${patient.id}`)}
                      >
                        <TableCell className="font-medium text-primary">
                          {patient.firstName} {patient.lastName}
                        </TableCell>
                        <TableCell>{patient.mrn || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Unassigned Devices</CardTitle>
          </CardHeader>
          <CardContent>
            {organization.devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unassigned devices found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device ID</TableHead>
                      <TableHead>Model</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organization.devices.map((device: any) => (
                      <TableRow 
                        key={device.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/devices/${device.id}`)}
                      >
                        <TableCell className="font-medium text-primary">{device.deviceId}</TableCell>
                        <TableCell>{device.modelNumber || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
