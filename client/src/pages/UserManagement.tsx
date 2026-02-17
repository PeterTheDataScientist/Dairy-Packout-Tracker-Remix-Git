import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Pencil, Key, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type User = { id: number; name: string; email: string; role: string; active: boolean };

const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "DATA_ENTRY", label: "Data Entry" },
];

const roleLabel = (val: string) => ROLES.find(r => r.value === val)?.label || val;

export default function UserManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "DATA_ENTRY" });
  const [newPassword, setNewPassword] = useState("");

  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; role: string }) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User created successfully" });
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<User> }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User updated successfully" });
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: number; newPassword: string }) => {
      const res = await apiRequest("POST", `/api/users/${id}/reset-password`, { newPassword });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password reset successfully" });
      setIsResetPasswordOpen(false);
      setNewPassword("");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, { active });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User status updated" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const handleSave = () => {
    if (!formData.name || !formData.email) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: { name: formData.name, email: formData.email, role: formData.role } });
    } else {
      if (formData.password.length < 6) {
        toast({ variant: "destructive", title: "Validation Error", description: "Password must be at least 6 characters." });
        return;
      }
      createMutation.mutate({ name: formData.name, email: formData.email, password: formData.password, role: formData.role });
    }
  };

  const handleResetPassword = () => {
    if (!resetUserId) return;
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Validation Error", description: "Password must be at least 6 characters." });
      return;
    }
    resetPasswordMutation.mutate({ id: resetUserId, newPassword });
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({ name: user.name, email: user.email, password: "", role: user.role });
    setIsDialogOpen(true);
  };

  const handleOpenResetPassword = (user: User) => {
    setResetUserId(user.id);
    setNewPassword("");
    setIsResetPasswordOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: "", email: "", password: "", role: "DATA_ENTRY" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">User Management</h2>
          <p className="text-muted-foreground" data-testid="text-page-description">Create and manage user accounts.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2" data-testid="button-add-user">
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden overflow-x-auto">
        <Table data-testid="table-users">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                <TableCell>
                  <div className="font-medium" data-testid={`text-name-${user.id}`}>{user.name}</div>
                </TableCell>
                <TableCell data-testid={`text-email-${user.id}`}>{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={user.role === "ADMIN" ? "bg-purple-100 text-purple-800 border-purple-200" : "bg-blue-100 text-blue-800 border-blue-200"} data-testid={`badge-role-${user.id}`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {roleLabel(user.role)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={user.active}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: user.id, active: checked })}
                    data-testid={`switch-active-${user.id}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} data-testid={`button-edit-${user.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenResetPassword(user)} data-testid={`button-reset-password-${user.id}`}>
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No users yet. Click "Add User" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">{editingId ? "Edit User" : "Create User"}</DialogTitle>
            <DialogDescription>{editingId ? "Update user details below." : "Fill in the details to create a new user."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-name" className="text-right">Name</Label>
              <Input id="user-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="col-span-3" data-testid="input-user-name" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-email" className="text-right">Email</Label>
              <Input id="user-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="col-span-3" data-testid="input-user-email" />
            </div>
            {!editingId && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="user-password" className="text-right">Password</Label>
                <Input id="user-password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="col-span-3" placeholder="Minimum 6 characters" data-testid="input-user-password" />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Role</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                <SelectTrigger className="col-span-3" data-testid="select-user-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value} data-testid={`select-role-option-${r.value}`}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel-user">Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-user">
              {editingId ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle data-testid="text-reset-password-title">Reset Password</DialogTitle>
            <DialogDescription>Enter a new password for the user.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-password" className="text-right">New Password</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="col-span-3" placeholder="Minimum 6 characters" data-testid="input-new-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)} data-testid="button-cancel-reset-password">Cancel</Button>
            <Button onClick={handleResetPassword} disabled={resetPasswordMutation.isPending} data-testid="button-confirm-reset-password">Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
