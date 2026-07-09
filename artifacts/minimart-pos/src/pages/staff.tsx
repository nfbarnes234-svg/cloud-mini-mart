import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, UserCog, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListUsersQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function Staff() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: staff, isLoading } = useListUsers();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "", email: "", password: "", role: "cashier" as "owner" | "manager" | "cashier", active: true
  });

  if (user?.role !== "owner") {
    return <Redirect to="/" />;
  }

  const handleOpenForm = (staffMember: any = null) => {
    if (staffMember) {
      setEditingUser(staffMember);
      setFormData({
        name: staffMember.name,
        email: staffMember.email,
        password: "", // leave empty for edit unless changing
        role: staffMember.role,
        active: staffMember.active
      });
    } else {
      setEditingUser(null);
      setFormData({ name: "", email: "", password: "", role: "cashier", active: true });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData: any = { 
          name: formData.name, 
          email: formData.email, 
          role: formData.role, 
          active: formData.active 
        };
        if (formData.password) updateData.password = formData.password;
        
        await updateUser.mutateAsync({ id: editingUser.id, data: updateData });
        toast({ title: "Staff member updated" });
      } else {
        if (!formData.password) {
          toast({ title: "Password required", variant: "destructive" });
          return;
        }
        await createUser.mutateAsync({ 
          data: {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: formData.role
          }
        });
        toast({ title: "Staff member added" });
      }
      
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setIsFormOpen(false);
    } catch (err) {
      toast({ title: "Error saving staff member", variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
            <p className="text-muted-foreground mt-1">Manage system access and roles.</p>
          </div>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="w-4 h-4 mr-2" /> Add Staff
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : staff?.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        <UserCog className="w-4 h-4" />
                      </div>
                      <div className="font-medium">{member.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{member.email}</TableCell>
                  <TableCell>
                    <Badge variant={member.role === 'owner' ? 'default' : member.role === 'manager' ? 'secondary' : 'outline'} className="capitalize">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.active ? 'success' : 'destructive'}>
                      {member.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenForm(member)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={async () => {
                        if(confirm('Delete user?')) {
                          await deleteUser.mutateAsync({ id: member.id });
                          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
                        }
                      }}
                      disabled={user?.id === member.id} // prevent self deletion
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit Staff" : "Add Staff Member"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{editingUser ? "New Password (leave blank to keep current)" : "Password"}</Label>
                <Input type="password" required={!editingUser} minLength={6} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(v: any) => setFormData({...formData, role: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingUser && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.active ? "active" : "inactive"} onValueChange={(v) => setFormData({...formData, active: v === "active"})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit">Save Staff</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
