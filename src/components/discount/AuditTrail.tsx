import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Eye, Activity, Shield, Users, FileText, Gift, Building2, ChevronLeft, ChevronRight, Clock, User as UserIcon, Info } from "lucide-react";
import { toast } from "sonner";
import { auditApi } from "@/services/auditApi";
import { format, formatDistanceToNow } from "date-fns";

interface AuditLog {
  id: string;
  activity_type: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  action: string;
  details: any;
  performed_by: string | null;
  performed_at: string;
}

interface PhoneView {
  id: string;
  member_id: string;
  viewed_at: string;
  viewer_info: string;
  members: {
    first_name: string;
    last_name: string;
    mobile: string;
    member_code: string;
  };
}

interface AuditTrailProps {
  parentActiveTab?: string;
}

export function AuditTrail({ parentActiveTab }: AuditTrailProps) {
  const [activeTab, setActiveTab] = useState("user-activity");
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [phoneViews, setPhoneViews] = useState<PhoneView[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntityType, setFilterEntityType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    if (activeTab === "phone-views") {
      fetchPhoneViews();
    } else {
      fetchAuditLogs();
    }
  }, [activeTab, currentPage, filterAction, filterEntityType, searchTerm]);

  useEffect(() => {
    if (parentActiveTab === "audit") {
      if (activeTab === "phone-views") {
        fetchPhoneViews();
      } else {
        fetchAuditLogs();
      }
    }
  }, [parentActiveTab]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await auditApi.getAuditLogs({
        limit: 100,
        search: searchTerm || undefined,
      });
      
      // Filter in memory for entity type and action if selected (to preserve existing UI behaviors)
      let filteredData = data || [];
      if (filterEntityType !== 'all') {
        filteredData = filteredData.filter((log: any) => log.entity_type === filterEntityType);
      }
      if (filterAction !== 'all') {
        filteredData = filteredData.filter((log: any) => log.action === filterAction);
      }

      // Pagination
      const count = filteredData.length;
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

      setAuditLogs(paginatedData);
      setTotalPages(Math.ceil(count / itemsPerPage));
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchPhoneViews = async () => {
    try {
      setLoading(true);
      const data = await auditApi.getPhoneViews({
        limit: 100,
        search: searchTerm || undefined,
      });

      // Pagination
      const count = data.length;
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

      setPhoneViews(paginatedData);
      setTotalPages(Math.ceil(count / itemsPerPage));
    } catch (error) {
      console.error("Error fetching phone views:", error);
      toast.error("Failed to load phone view logs");
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (entityType: string) => {
    switch (entityType) {
      case 'member':
        return <Users className="h-4 w-4" />;
      case 'company':
        return <Building2 className="h-4 w-4" />;
      case 'offer':
        return <Gift className="h-4 w-4" />;
      case 'category':
        return <FileText className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'default';
      case 'update':
        return 'secondary';
      case 'delete':
        return 'destructive';
      case 'redeem':
        return 'default';
      default:
        return 'outline';
    }
  };

  const renderTimelineView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (auditLogs.length === 0) {
      return (
        <div className="p-12 text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No activities found</p>
        </div>
      );
    }

    return (
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
        
        <div className="space-y-3">
          {auditLogs.map((log, index) => (
            <div key={log.id} className="relative pl-12 pb-3">
              {/* Timeline dot */}
              <div className="absolute left-[18px] top-1.5 w-4 h-4 rounded-full border-2 border-background bg-primary" />
              
              {/* Activity card */}
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="p-1.5 rounded-md bg-primary/10 flex-shrink-0">
                        {getActivityIcon(log.entity_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getActionColor(log.action)} className="capitalize text-xs h-5">
                            {log.action}
                          </Badge>
                          <span className="font-semibold capitalize">{log.entity_type}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {log.activity_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(log.performed_at), { addSuffix: true })}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(log.performed_at), 'MMM dd, yyyy · HH:mm:ss')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-2">
                    {/* Entity name and Performed by - in same row */}
                    <div className="flex items-center gap-4 text-xs">
                      {log.entity_name && (
                        <div className="flex items-center gap-1.5">
                          <Info className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Entity:</span>
                          <span className="font-medium">{log.entity_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Performed by:</span>
                        <span className="font-medium">{log.performed_by || 'System'}</span>
                      </div>
                    </div>

                    {/* Affected Member Info */}
                    {log.details?.affected_member && (
                      <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                        <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase mb-1">Affected Member</p>
                        <div className="flex flex-wrap gap-3 text-xs">
                          {log.details.affected_member.member_code && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Code:</span>
                              <span className="font-medium">{log.details.affected_member.member_code}</span>
                            </div>
                          )}
                          {log.details.affected_member.name && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Name:</span>
                              <span className="font-medium">{log.details.affected_member.name}</span>
                            </div>
                          )}
                          {log.details.affected_member.phone && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Phone:</span>
                              <span className="font-medium">{log.details.affected_member.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Section Info */}
                    {log.details?.section && (
                      <div className="mt-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded">
                        <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase mb-1">Section</p>
                        <p className="text-xs font-medium">{log.details.section}</p>
                      </div>
                    )}

                    {/* Changes */}
                    {log.details?.changes && Array.isArray(log.details.changes) && log.details.changes.length > 0 && (
                      <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                        <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase mb-1">Changes Made</p>
                        <div className="space-y-1.5">
                          {log.details.changes.map((change: any, idx: number) => (
                            <div key={idx} className="text-xs">
                              <span className="font-semibold capitalize">{change.field.replace(/_/g, ' ')}:</span>
                              <div className="flex items-center gap-2 mt-0.5 ml-2">
                                <span className="text-muted-foreground line-through">
                                  {change.before === null || change.before === undefined || change.before === '' 
                                    ? '(empty)' 
                                    : typeof change.before === 'object' 
                                      ? JSON.stringify(change.before) 
                                      : String(change.before)}
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-medium text-green-600 dark:text-green-400">
                                  {change.after === null || change.after === undefined || change.after === '' 
                                    ? '(empty)' 
                                    : typeof change.after === 'object' 
                                      ? JSON.stringify(change.after) 
                                      : String(change.after)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other Details */}
                    {log.details && Object.keys(log.details).filter(key => 
                      key !== 'affected_member' && key !== 'section' && key !== 'changes'
                    ).length > 0 && (
                      <div className="mt-2 p-2 bg-muted/30 rounded">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Additional Details</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {Object.entries(log.details)
                            .filter(([key]) => key !== 'affected_member' && key !== 'section' && key !== 'changes')
                            .map(([key, value]) => (
                              <div key={key} className="flex items-start gap-1.5 text-xs">
                                <span className="text-muted-foreground capitalize">
                                  {key.replace(/_/g, ' ')}:
                                </span>
                                <span className="font-medium break-all">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Main Audit Trail Card with Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setCurrentPage(1); }} className="w-full">
        <Card>
          <TabsList className="grid w-full grid-cols-2 h-auto p-0 bg-transparent border-b rounded-none">
            <TabsTrigger 
              value="user-activity" 
              className="rounded-none rounded-tl-lg data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=inactive]:bg-muted/50 py-3 border-r border-b-0"
            >
              <Activity className="h-4 w-4 mr-2" />
              User Activity
            </TabsTrigger>
            <TabsTrigger 
              value="phone-views" 
              className="rounded-none rounded-tr-lg data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=inactive]:bg-muted/50 py-3 border-b-0"
            >
              <Eye className="h-4 w-4 mr-2" />
              Phone Views
            </TabsTrigger>
          </TabsList>

          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>
                    {activeTab === 'phone-views' ? 'Phone Number Views' : 'User Activity Timeline'}
                  </CardTitle>
                  <CardDescription>
                    {activeTab === 'phone-views' 
                      ? 'Phone number access logs for security and compliance' 
                      : 'Complete timeline of all system activities with detailed user journey tracking'
                    }
                  </CardDescription>
                </div>
              </div>
              {activeTab === 'user-activity' && (
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'timeline' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('timeline')}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Timeline
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Table
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <TabsContent value="user-activity" className="mt-0">
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by entity, performer, or action..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>

                <Select
                  value={filterEntityType}
                  onValueChange={(value) => {
                    setFilterEntityType(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="member">Members</SelectItem>
                    <SelectItem value="company">Companies</SelectItem>
                    <SelectItem value="offer">Offers</SelectItem>
                    <SelectItem value="category">Categories</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filterAction}
                  onValueChange={(value) => {
                    setFilterAction(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="redeem">Redeem</SelectItem>
                    <SelectItem value="view">View</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Timeline or Table View */}
              {viewMode === 'timeline' ? (
                renderTimelineView()
              ) : (
                <div className="rounded-md border">
                  {loading ? (
                    <div className="flex items-center justify-center p-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="p-12 text-center">
                      <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No activities found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Entity Name</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Activity Type</TableHead>
                          <TableHead>Performed By</TableHead>
                          <TableHead>Date & Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getActivityIcon(log.entity_type)}
                                <span className="capitalize font-medium">{log.entity_type}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {log.entity_name || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getActionColor(log.action)} className="capitalize">
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {log.activity_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </TableCell>
                            <TableCell className="font-medium">{log.performed_by || 'System'}</TableCell>
                            <TableCell className="text-sm tabular-nums">
                              {format(new Date(log.performed_at), 'MMM dd, yyyy')}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(log.performed_at), 'HH:mm:ss')}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </TabsContent>

          <TabsContent value="phone-views" className="mt-0">
            <CardContent className="space-y-4">
              {/* Phone Views Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search phone view logs..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              <div className="rounded-md border">
                {loading ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : phoneViews.length === 0 ? (
                  <div className="p-12 text-center">
                    <Eye className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No phone views recorded yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member Code</TableHead>
                        <TableHead>Member Name</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Viewed By</TableHead>
                        <TableHead>Viewed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {phoneViews.map((view) => (
                        <TableRow key={view.id}>
                          <TableCell className="font-mono font-semibold">
                            {view.members?.member_code || 'N/A'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {view.members ? `${view.members.first_name} ${view.members.last_name}` : 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono">
                            {view.members?.mobile || 'N/A'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {view.viewer_info || 'Unknown User'}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {format(new Date(view.viewed_at), 'MMM dd, yyyy')}
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(view.viewed_at), 'HH:mm:ss')}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}
