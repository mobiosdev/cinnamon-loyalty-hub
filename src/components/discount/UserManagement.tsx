import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { UserPlus, Pencil, UserX, RefreshCw, Eye, EyeOff, Users, Shield, ShieldCheck, Trash2, Clock, Activity, Building2, FileText, Gift, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { userApi, SystemUser, SystemRole, CreateUserPayload, UpdateUserPayload, CreateRolePayload, UpdateRolePayload, UserPermissions } from "@/services/userApi";
import { auditApi, AuditLog } from "@/services/auditApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { logActivity } from "@/utils/auditLogger";

const PERMISSION_LABELS: { key: keyof UserPermissions; label: string }[] = [
  { key: "registration", label: "Registration" },
  { key: "redemption", label: "Redemption" },
  { key: "transactions", label: "Transactions" },
  { key: "reports", label: "Reports" },
  { key: "settings_categories", label: "Settings - Member Categories" },
  { key: "settings_offers", label: "Settings - Offers" },
  { key: "settings_notifications", label: "Settings - Send Notifications" },
  { key: "settings_audit", label: "Settings - Audit Trail" },
  { key: "redemption_reversal", label: "Redemption Reversal" },
];

const emptyPermissions = (): UserPermissions => ({
  registration: false,
  redemption: false,
  transactions: false,
  reports: false,
  settings_categories: false,
  settings_offers: false,
  settings_notifications: false,
  settings_audit: false,
  redemption_reversal: false,
});

interface UserFormState {
  username: string;
  password: string;
  full_name: string;
  email: string;
  mobile: string;
  role_id: string;
}

interface RoleFormState {
  name: string;
  description: string;
  permissions: UserPermissions;
}

interface UserManagementProps {
  onViewLogs?: (username: string) => void;
}

const UserManagement = ({ onViewLogs }: UserManagementProps) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  // Data State
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("users");

  // User Logs Dialog State
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedUserForLogs, setSelectedUserForLogs] = useState<SystemUser | null>(null);
  const [userLogs, setUserLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Role logs states & expandable rows
  const [selectedRoleForLogs, setSelectedRoleForLogs] = useState<SystemRole | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // User Dialogs / Forms
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deactivateUserTarget, setDeactivateUserTarget] = useState<SystemUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [userForm, setUserForm] = useState<UserFormState>({
    username: "",
    password: "",
    full_name: "",
    email: "",
    mobile: "",
    role_id: "",
  });

  // Role Dialogs / Forms
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<SystemRole | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<SystemRole | null>(null);
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleForm, setRoleForm] = useState<RoleFormState>({
    name: "",
    description: "",
    permissions: emptyPermissions(),
  });

  // Fetch all users and roles
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        userApi.getUsers(),
        userApi.getRoles()
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load management data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openUserLogs = async (user: SystemUser) => {
    setSelectedUserForLogs(user);
    setSelectedRoleForLogs(null);
    setExpandedRows({});
    setLogsLoading(true);
    try {
      const logs = await auditApi.getAuditLogs({ limit: 100, search: user.username });
      setUserLogs(logs);
    } catch (err: any) {
      toast.error(err.message || "Failed to load activity logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const openRoleLogs = async (role: SystemRole) => {
    setSelectedRoleForLogs(role);
    setSelectedUserForLogs(null);
    setExpandedRows({});
    setLogsLoading(true);
    try {
      const logs = await auditApi.getAuditLogs({ limit: 100, search: role.name });
      setUserLogs(logs);
    } catch (err: any) {
      toast.error(err.message || "Failed to load activity logs");
    } finally {
      setLogsLoading(false);
    }
  };

  // ==========================================
  // USER HANDLERS
  // ==========================================
  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      username: "",
      password: "",
      full_name: "",
      email: "",
      mobile: "",
      role_id: roles[0]?.id || "",
    });
    setShowPassword(false);
    setUserDialogOpen(true);
  };

  const openEditUser = (user: SystemUser) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      password: "",
      full_name: user.full_name,
      email: user.email || "",
      mobile: user.mobile || "",
      role_id: user.role_id || "",
    });
    setShowPassword(false);
    setUserDialogOpen(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.full_name.trim()) { toast.error("Full name is required"); return; }
    if (!editingUser && !userForm.username.trim()) { toast.error("Username is required"); return; }
    if (!editingUser && !userForm.password.trim()) { toast.error("Password is required"); return; }
    if (!userForm.mobile.trim()) { toast.error("Mobile number is required for OTP"); return; }

    setUserSubmitting(true);
    try {
      if (editingUser) {
        const payload: UpdateUserPayload = {
          full_name: userForm.full_name,
          email: userForm.email || undefined,
          mobile: userForm.mobile || undefined,
          role_id: userForm.role_id || undefined,
        };
        if (userForm.password.trim()) payload.password = userForm.password;
        await userApi.updateUser(editingUser.id, payload);
        
        logActivity({
          activityType: 'user_management',
          entityType: 'user',
          entityId: editingUser.id,
          entityName: editingUser.username,
          action: 'update',
          details: {
            updated_username: editingUser.username,
            full_name: userForm.full_name,
            email: userForm.email || undefined,
            mobile: userForm.mobile || undefined,
            role_name: roles.find(r => r.id === userForm.role_id)?.name
          }
        });

        toast.success(`User "${editingUser.username}" updated successfully`);
      } else {
        const payload: CreateUserPayload = {
          username: userForm.username,
          password: userForm.password,
          full_name: userForm.full_name,
          email: userForm.email || undefined,
          mobile: userForm.mobile,
          role_id: userForm.role_id || undefined,
        };
        await userApi.createUser(payload, currentUser!.id);

        logActivity({
          activityType: 'user_management',
          entityType: 'user',
          entityName: userForm.username,
          action: 'create',
          details: {
            created_username: userForm.username,
            full_name: userForm.full_name,
            email: userForm.email || undefined,
            mobile: userForm.mobile,
            role_name: roles.find(r => r.id === userForm.role_id)?.name
          }
        });

        toast.success(`User "${userForm.username}" created successfully`);
      }
      setUserDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!deactivateUserTarget) return;
    try {
      await userApi.deactivateUser(deactivateUserTarget.id);
      
      logActivity({
        activityType: 'user_management',
        entityType: 'user',
        entityId: deactivateUserTarget.id,
        entityName: deactivateUserTarget.username,
        action: 'update',
        details: {
          event: 'deactivate_user',
          deactivated_username: deactivateUserTarget.username
        }
      });

      toast.success(`User "${deactivateUserTarget.username}" deactivated`);
      setDeactivateUserTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate user");
    }
  };

  const handleReactivateUser = async (user: SystemUser) => {
    try {
      await userApi.updateUser(user.id, { is_active: true });

      logActivity({
        activityType: 'user_management',
        entityType: 'user',
        entityId: user.id,
        entityName: user.username,
        action: 'update',
        details: {
          event: 'reactivate_user',
          reactivated_username: user.username
        }
      });

      toast.success(`User "${user.username}" reactivated`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate user");
    }
  };

  // ==========================================
  // ROLE HANDLERS
  // ==========================================
  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({
      name: "",
      description: "",
      permissions: emptyPermissions(),
    });
    setRoleDialogOpen(true);
  };

  const openEditRole = (role: SystemRole) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || "",
      permissions: { ...role.permissions },
    });
    setRoleDialogOpen(true);
  };



  const handleRolePermissionToggle = (key: keyof UserPermissions) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim()) { toast.error("Role name is required"); return; }

    setRoleSubmitting(true);
    try {
      if (editingRole) {
        const payload: UpdateRolePayload = {
          name: roleForm.name,
          description: roleForm.description || undefined,
          permissions: roleForm.permissions,
        };
        await userApi.updateRole(editingRole.id, payload);

        logActivity({
          activityType: 'role_management',
          entityType: 'role',
          entityId: editingRole.id,
          entityName: roleForm.name,
          action: 'update',
          details: {
            role_name: roleForm.name,
            description: roleForm.description,
            permissions: roleForm.permissions
          }
        });

        toast.success(`Role "${editingRole.name}" updated successfully`);
      } else {
        const payload: CreateRolePayload = {
          name: roleForm.name,
          description: roleForm.description || undefined,
          permissions: roleForm.permissions,
        };
        await userApi.createRole(payload);

        logActivity({
          activityType: 'role_management',
          entityType: 'role',
          entityName: roleForm.name,
          action: 'create',
          details: {
            role_name: roleForm.name,
            description: roleForm.description,
            permissions: roleForm.permissions
          }
        });

        toast.success(`Role "${roleForm.name}" created successfully`);
      }
      setRoleDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleTarget) return;
    try {
      await userApi.deleteRole(deleteRoleTarget.id);

      logActivity({
        activityType: 'role_management',
        entityType: 'role',
        entityId: deleteRoleTarget.id,
        entityName: deleteRoleTarget.name,
        action: 'delete',
        details: {
          deleted_role_name: deleteRoleTarget.name
        }
      });

      toast.success(`Role "${deleteRoleTarget.name}" deleted successfully`);
      setDeleteRoleTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete role");
    }
  };

  const viewingSubjectName = selectedUserForLogs 
    ? selectedUserForLogs.full_name 
    : (selectedRoleForLogs ? `Role: ${selectedRoleForLogs.name}` : '');

  const viewingSubjectSub = selectedUserForLogs 
    ? `Viewing audit trail performed by @${selectedUserForLogs.username}` 
    : (selectedRoleForLogs ? `Viewing audit trail performed by users with role ${selectedRoleForLogs.name}` : '');

  if (selectedUserForLogs || selectedRoleForLogs) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedUserForLogs(null);
              setSelectedRoleForLogs(null);
              setUserLogs([]);
            }}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary animate-pulse" />
              Activity Logs: {viewingSubjectName}
            </h2>
            <p className="text-sm text-muted-foreground">{viewingSubjectSub}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Action History</CardTitle>
            <CardDescription>
              Expand any row to view full payload data, changes, and affected member records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <RefreshCw className="h-8 w-8 animate-spin mb-2 text-primary" />
                <span>Loading activity logs...</span>
              </div>
            ) : userLogs.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                <p>No activity logs found.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Type</TableHead>
                      <TableHead>Entity Name</TableHead>
                      <TableHead className="w-[120px]">Action</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead className="w-[180px]">Date & Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userLogs.map((log) => {
                      const isExpanded = !!expandedRows[log.id];
                      return (
                        <>
                          <TableRow 
                            key={log.id} 
                            className="cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => toggleRow(log.id)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                {log.entity_type === 'member' && <Users className="h-4 w-4 text-primary" />}
                                {log.entity_type === 'user' && <Users className="h-4 w-4 text-primary" />}
                                {log.entity_type === 'company' && <Building2 className="h-4 w-4 text-primary" />}
                                {log.entity_type === 'offer' && <Gift className="h-4 w-4 text-primary" />}
                                {log.entity_type === 'category' && <FileText className="h-4 w-4 text-primary" />}
                                {log.entity_type === 'role' && <Shield className="h-4 w-4 text-primary" />}
                                {log.entity_type !== 'member' && log.entity_type !== 'user' && log.entity_type !== 'company' && log.entity_type !== 'offer' && log.entity_type !== 'category' && log.entity_type !== 'role' && <Activity className="h-4 w-4 text-primary" />}
                                <span className="capitalize font-medium">{log.entity_type}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {log.entity_name || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  log.action === 'create' || log.action === 'redeem' || log.action === 'login' ? 'default' :
                                  log.action === 'delete' || log.action === 'logout' ? 'destructive' : 'secondary'
                                } 
                                className="capitalize text-[10px] h-4.5 px-1.5 font-semibold"
                              >
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {log.activity_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </TableCell>
                            <TableCell className="text-sm tabular-nums text-muted-foreground">
                              {format(new Date(log.performed_at), 'MMM dd, yyyy · HH:mm:ss')}
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="bg-muted/10 hover:bg-muted/10">
                              <TableCell colSpan={5} className="p-4 border-t border-b">
                                <div className="pl-6 pr-6 py-4 bg-muted/40 border border-border/50 rounded-lg space-y-3">
                                  {/* Affected Member Info */}
                                  {log.details?.affected_member && (
                                    <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                                      <p className="text-[10px] font-bold text-primary uppercase mb-1 tracking-wider">Affected Member</p>
                                      <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
                                        {log.details.affected_member.member_code && (
                                          <div>
                                            <span className="text-muted-foreground">Code:</span>{" "}
                                            <span className="font-semibold text-foreground">{log.details.affected_member.member_code}</span>
                                          </div>
                                        )}
                                        {log.details.affected_member.name && (
                                          <div>
                                            <span className="text-muted-foreground">Name:</span>{" "}
                                            <span className="font-semibold text-foreground">{log.details.affected_member.name}</span>
                                          </div>
                                        )}
                                        {log.details.affected_member.phone && (
                                          <div>
                                            <span className="text-muted-foreground">Phone:</span>{" "}
                                            <span className="font-semibold text-foreground">{log.details.affected_member.phone}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Section Info */}
                                  {log.details?.section && (
                                    <div className="p-3 bg-secondary/5 border border-secondary/10 rounded-lg">
                                      <p className="text-[10px] font-bold text-secondary-foreground uppercase mb-1 tracking-wider font-mono">Section</p>
                                      <p className="text-xs font-semibold">{log.details.section}</p>
                                    </div>
                                  )}

                                  {/* Changes */}
                                  {log.details?.changes && Array.isArray(log.details.changes) && log.details.changes.length > 0 && (
                                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                                      <p className="text-[10px] font-bold text-amber-600 uppercase mb-1 tracking-wider">Changes Made</p>
                                      <div className="space-y-1.5">
                                        {log.details.changes.map((change: any, idx: number) => (
                                          <div key={idx} className="text-xs">
                                            <span className="font-semibold capitalize text-foreground/80">{change.field.replace(/_/g, ' ')}:</span>
                                            <div className="flex items-center gap-2 mt-0.5 ml-2">
                                              <span className="text-muted-foreground line-through">
                                                {change.before === null || change.before === undefined || change.before === '' ? '(empty)' : String(change.before)}
                                              </span>
                                              <span className="text-muted-foreground">→</span>
                                              <span className="font-medium text-green-600 dark:text-green-400">
                                                {change.after === null || change.after === undefined || change.after === '' ? '(empty)' : String(change.after)}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Other Details fallback */}
                                  {log.details && !log.details.changes && !log.details.affected_member && Object.keys(log.details).length > 0 && (
                                    <div className="p-3 bg-muted/40 rounded-lg">
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 tracking-wider">Log Details</p>
                                      <pre className="text-[10px] font-mono whitespace-pre-wrap text-foreground/90 overflow-x-auto max-h-32 bg-muted/65 p-2 rounded">
                                        {JSON.stringify(log.details, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">User &amp; Access Control</h2>
            <p className="text-sm text-muted-foreground">Manage user roles, role permissions, and user accounts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
          {activeTab === "users" ? (
            <Button size="sm" onClick={openCreateUser} disabled={roles.length === 0}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          ) : (
            <Button size="sm" onClick={openCreateRole}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-80 grid-cols-2 mb-6">
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Shield className="h-4 w-4 mr-2" />
            Roles
          </TabsTrigger>
        </TabsList>

        {/* USERS CONTENT */}
        <TabsContent value="users" className="space-y-4">
          <div className="rounded-lg border border-border overflow-hidden bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">User Details</th>
                  <th className="px-4 py-3 text-left font-semibold">Assigned Role</th>
                  <th className="px-4 py-3 text-left font-semibold">Mobile (for OTP)</th>
                  <th className="px-4 py-3 text-left font-semibold">Inherited Permissions</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No users found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{user.full_name}</div>
                        <div className="text-xs text-muted-foreground">@{user.username}</div>
                        {user.email && <div className="text-xs text-muted-foreground">{user.email}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.role === "superadmin" ? "default" : "secondary"}>
                          {user.role === "superadmin" ? "Super Admin" : (user.role_name || "Custom Role")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.mobile || <span className="italic text-xs text-muted-foreground/60">Not set</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {PERMISSION_LABELS.map(({ key, label }) =>
                            user.permissions?.[key] ? (
                              <Badge key={key} variant="outline" className="text-xs py-0">
                                {label}
                              </Badge>
                            ) : null
                          )}
                          {!Object.values(user.permissions || {}).some(Boolean) && (
                            <span className="text-xs text-muted-foreground italic">No access</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.is_active ? "outline" : "destructive"} className={user.is_active ? "border-green-500 text-green-600 bg-green-50/50" : ""}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openUserLogs(user)}
                            className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/5"
                            title="View user activity logs"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditUser(user)}
                            className="h-8 w-8 p-0"
                            disabled={user.role === "superadmin" && user.id !== currentUser?.id}
                            title="Edit user"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {user.id !== currentUser?.id && user.role !== "superadmin" && (
                            user.is_active ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeactivateUserTarget(user)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                title="Deactivate user"
                              >
                                <UserX className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReactivateUser(user)}
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-600"
                                title="Reactivate user"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ROLES CONTENT */}
        <TabsContent value="roles" className="space-y-4">
          <div className="rounded-lg border border-border overflow-hidden bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Role Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Description</th>
                  <th className="px-4 py-3 text-left font-semibold">Granted Permissions</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading roles...
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No roles defined yet. Add one to define tab permissions.
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {role.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {role.description || <span className="italic text-xs text-muted-foreground/60">No description</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {PERMISSION_LABELS.map(({ key, label }) =>
                            role.permissions?.[key] ? (
                              <Badge key={key} variant="outline" className="text-xs py-0">
                                {label}
                              </Badge>
                            ) : null
                          )}
                          {!Object.values(role.permissions || {}).some(Boolean) && (
                            <span className="text-xs text-muted-foreground italic">No access</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRoleLogs(role)}
                            className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/5"
                            title="View role activity logs"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditRole(role)}
                            className="h-8 w-8 p-0"
                            title="Edit Role"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteRoleTarget(role)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Delete Role"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* USER DIALOG */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? `Edit User - ${editingUser.username}` : "Create New User"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUserSubmit} className="space-y-4 mt-2">
            {!editingUser && (
              <div className="space-y-1.5">
                <Label htmlFor="user-username">Username *</Label>
                <Input
                  id="user-username"
                  placeholder="e.g. john_doe"
                  value={userForm.username}
                  onChange={e => setUserForm(p => ({ ...p, username: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="user-fullname">Full Name *</Label>
              <Input
                id="user-fullname"
                placeholder="e.g. John Doe"
                value={userForm.full_name}
                onChange={e => setUserForm(p => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="john@example.com"
                value={userForm.email}
                onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-mobile">Mobile * <span className="text-xs text-muted-foreground">(for OTP)</span></Label>
              <Input
                id="user-mobile"
                placeholder="94XXXXXXXXX"
                value={userForm.mobile}
                onChange={e => setUserForm(p => ({ ...p, mobile: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-role">Assign Role *</Label>
              <select
                id="user-role"
                value={userForm.role_id}
                onChange={e => setUserForm(p => ({ ...p, role_id: e.target.value }))}
                disabled={editingUser?.role === "superadmin"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-password">
                {editingUser ? "New Password (leave blank to keep current)" : "Password *"}
              </Label>
              <div className="relative">
                <Input
                  id="user-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={editingUser ? "Leave blank to keep unchanged" : "Enter password"}
                  value={userForm.password}
                  onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={userSubmitting}>
                {userSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                    Saving...
                  </span>
                ) : editingUser ? "Save Changes" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ROLE DIALOG */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? `Edit Role - ${editingRole.name}` : "Create New Role"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRoleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">Role Name *</Label>
              <Input
                id="role-name"
                placeholder="e.g. Cashier"
                value={roleForm.name}
                onChange={e => setRoleForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-desc">Description</Label>
              <Input
                id="role-desc"
                placeholder="Brief description of the role's purpose"
                value={roleForm.description}
                onChange={e => setRoleForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            {/* Permission Switches */}
            <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/20">
              <Label className="text-sm font-semibold">Granted Permissions</Label>
              <div className="space-y-2 mt-1">
                {PERMISSION_LABELS.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between rounded-md px-3 py-1.5 bg-background border border-border/50">
                    <span className="text-sm font-medium">{label}</span>
                    <Switch
                      id={`role-perm-${key}`}
                      checked={roleForm.permissions[key]}
                      onCheckedChange={() => handleRolePermissionToggle(key)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setRoleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={roleSubmitting}>
                {roleSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                    Saving...
                  </span>
                ) : editingRole ? "Save Changes" : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Deactivation Alert */}
      <AlertDialog open={!!deactivateUserTarget} onOpenChange={o => !o && setDeactivateUserTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate the user account for <strong>{deactivateUserTarget?.full_name}</strong>?
              They will not be able to log in. You can reactivate this account later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Deletion Alert */}
      <AlertDialog open={!!deleteRoleTarget} onOpenChange={o => !o && setDeleteRoleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role <strong>{deleteRoleTarget?.name}</strong>?
              This action cannot be undone. You can only delete roles that are not currently assigned to active users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
};

export default UserManagement;

