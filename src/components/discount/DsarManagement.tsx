import { useState, useEffect } from "react";
import { 
  ShieldCheck, FileText, Search, Filter, Clock, CheckCircle2, 
  XCircle, AlertTriangle, Download, Trash2, Edit3, RefreshCw, Eye
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { staffApi } from "@/services/staffApi";

interface DsarRequest {
  id: string;
  member_id: string | null;
  member_code: string | null;
  requester_name: string;
  requester_email: string | null;
  requester_phone: string | null;
  request_type: string;
  channel: string;
  status: string;
  assigned_to: number | null;
  assigned_user_name?: string;
  outcome_notes: string | null;
  deadline_at: string | null;
  completed_at: string | null;
  created_at: string;
}

const statusBadgeStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400",
  in_progress: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950/40 dark:text-green-400",
  rejected: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400",
};

const requestTypeBadges: Record<string, string> = {
  access: "bg-indigo-50 text-indigo-700 border-indigo-200",
  rectification: "bg-sky-50 text-sky-700 border-sky-200",
  erasure: "bg-rose-50 text-rose-700 border-rose-200",
  objection: "bg-purple-50 text-purple-700 border-purple-200",
  restriction: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function DsarManagement() {
  const [requests, setRequests] = useState<DsarRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Edit / Resolve Modal
  const [editingRequest, setEditingRequest] = useState<DsarRequest | null>(null);
  const [newStatus, setNewStatus] = useState<string>("pending");
  const [outcomeNotes, setOutcomeNotes] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      if (typeFilter !== "all") filters.request_type = typeFilter;
      const data = await staffApi.getDsarRequests(filters);
      setRequests(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load DSAR requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, typeFilter]);

  const handleOpenEdit = (req: DsarRequest) => {
    setEditingRequest(req);
    setNewStatus(req.status);
    setOutcomeNotes(req.outcome_notes || "");
  };

  const handleSaveUpdate = async () => {
    if (!editingRequest) return;
    try {
      setUpdating(true);
      await staffApi.updateDsarRequest(editingRequest.id, {
        status: newStatus,
        outcome_notes: outcomeNotes || undefined,
      });
      toast.success("Request updated successfully.");
      setEditingRequest(null);
      await fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to update request");
    } finally {
      setUpdating(false);
    }
  };

  const handleExportData = async (memberId: string, memberCode?: string) => {
    try {
      const payload = await staffApi.exportMemberData(memberId);
      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `member_data_export_${memberCode || memberId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Member data exported successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to export data");
    }
  };

  const filtered = requests.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.requester_name?.toLowerCase().includes(term) ||
      r.requester_email?.toLowerCase().includes(term) ||
      r.requester_phone?.toLowerCase().includes(term) ||
      r.member_code?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Data Subject Rights &amp; Privacy Requests (DSAR)
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Manage statutory Access, Rectification, Erasure, and Opt-out requests under Sri Lanka Personal Data Protection Act No. 9 of 2022.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by requester name, email, phone, or member code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 text-xs">
                <SelectValue placeholder="Status filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40 text-xs">
                <SelectValue placeholder="Request type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="access">Access (Sec. 13)</SelectItem>
                <SelectItem value="rectification">Rectification (Sec. 14)</SelectItem>
                <SelectItem value="erasure">Erasure (Sec. 15)</SelectItem>
                <SelectItem value="objection">Objection (Sec. 17)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              Loading privacy rights requests...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <FileText className="h-10 w-10 mx-auto opacity-30" />
              <p className="text-sm font-semibold">No rights requests found</p>
              <p className="text-xs">Requests submitted via the public Privacy Notice or Member Portal will appear here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Requester</TableHead>
                  <TableHead className="text-xs">Request Type</TableHead>
                  <TableHead className="text-xs">Channel</TableHead>
                  <TableHead className="text-xs">Date &amp; Statutory Deadline</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((req) => {
                  const isCloseToDeadline = req.deadline_at && new Date(req.deadline_at).getTime() - Date.now() < 7 * 86400000 && req.status !== "completed";
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{req.requester_name}</div>
                        <div className="text-muted-foreground text-[11px] space-y-0.5">
                          {req.requester_email && <div>{req.requester_email}</div>}
                          {req.requester_phone && <div>{req.requester_phone}</div>}
                          {req.member_code && <div className="font-mono text-primary font-medium">#{req.member_code}</div>}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] capitalize font-medium ${requestTypeBadges[req.request_type] || ""}`}>
                          {req.request_type}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs capitalize text-muted-foreground">
                        {req.channel}
                      </TableCell>

                      <TableCell className="text-xs">
                        <div>{format(new Date(req.created_at), "dd MMM yyyy")}</div>
                        {req.deadline_at && (
                          <div className={`text-[11px] flex items-center gap-1 mt-0.5 ${isCloseToDeadline ? "text-rose-600 font-semibold" : "text-muted-foreground"}`}>
                            {isCloseToDeadline && <AlertTriangle className="h-3 w-3" />}
                            Due: {format(new Date(req.deadline_at), "dd MMM yyyy")}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] capitalize font-medium ${statusBadgeStyles[req.status] || ""}`}>
                          {req.status.replace("_", " ")}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right space-x-1">
                        {req.member_id && req.request_type === "access" && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleExportData(req.member_id!, req.member_code || undefined)}
                            title="Export Data"
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleOpenEdit(req)}
                          title="Update Status"
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Status Modal */}
      {editingRequest && (
        <Dialog open={!!editingRequest} onOpenChange={() => setEditingRequest(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Update DSAR Request</DialogTitle>
              <DialogDescription className="text-xs">
                Requester: {editingRequest.requester_name} ({editingRequest.request_type.toUpperCase()})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs py-2">
              <div className="space-y-1.5">
                <Label htmlFor="status_select">Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger id="status_select" className="text-xs">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Outcome Notes &amp; Audit Summary</Label>
                <Textarea
                  id="notes"
                  placeholder="Record verification method, actions taken, or reason for rejection under Sri Lanka PDPA..."
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  rows={4}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingRequest(null)} disabled={updating}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveUpdate} disabled={updating}>
                {updating ? "Saving..." : "Save Outcome"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
