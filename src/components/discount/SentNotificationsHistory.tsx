import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Calendar,
  Layers,
  Sparkles,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Info,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSentNotifications,
  clearSentNotificationsLog,
  SentNotification,
} from "@/utils/notificationLogger";
import { formatPhoneForDisplay } from "@/utils/phoneUtils";

const SentNotificationsHistory = () => {
  const [logs, setLogs] = useState<SentNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<SentNotification | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const itemsPerPage = 8;

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    setLogs(getSentNotifications());
  };

  const handleClear = () => {
    clearSentNotificationsLog();
    loadLogs();
    setConfirmClearOpen(false);
    toast.success("Sent notifications history cleared successfully!");
  };

  // Filter logs based on search query, channel, and type
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Channel Filter
      if (channelFilter !== "all" && log.channel !== channelFilter) {
        return false;
      }

      // 2. Type Filter
      if (typeFilter !== "all" && log.type !== typeFilter) {
        return false;
      }

      // 3. Search Query (Message text, recipient name/phone, offer/category names)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesMessage = log.message.toLowerCase().includes(query);
        const matchesOffer = log.offerName?.toLowerCase().includes(query) || false;
        const matchesCategory = log.categoriesName?.toLowerCase().includes(query) || false;
        const matchesRecipient = log.recipients.some(
          (r) =>
            r.name.toLowerCase().includes(query) ||
            r.phone.toLowerCase().includes(query)
        );
        return matchesMessage || matchesOffer || matchesCategory || matchesRecipient;
      }

      return true;
    });
  }, [logs, searchQuery, channelFilter, typeFilter]);

  // Paginated logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, channelFilter, typeFilter]);

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("en-LK", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search message content, recipients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Send Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Offer Reminder">Offer Reminder</SelectItem>
              <SelectItem value="Category Bulk">Category Bulk</SelectItem>
              <SelectItem value="Individual Custom">Individual Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {logs.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmClearOpen(true)}
            className="gap-2 shrink-0 md:self-auto"
          >
            <Trash2 className="h-4 w-4" />
            Clear Log History
          </Button>
        )}
      </div>

      {/* Logs Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[150px]">Type</TableHead>
              <TableHead className="w-[100px]">Channel</TableHead>
              <TableHead className="w-[110px] text-center">Recipients</TableHead>
              <TableHead>Message Preview</TableHead>
              <TableHead className="w-[80px] text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No sent notifications matches your criteria.
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/10">
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {log.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={log.channel === "whatsapp" ? "default" : "secondary"}
                      className={`text-xs uppercase font-medium ${
                        log.channel === "whatsapp" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                      }`}
                    >
                      {log.channel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-semibold text-sm">
                    {log.recipients.length}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {log.message}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedLog(log)}
                      className="hover:text-primary hover:bg-muted/50"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of{" "}
            {filteredLogs.length} logs
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog for details */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedLog && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Sent Notification Details
                </DialogTitle>
                <DialogDescription>
                  Sent on {formatDateTime(selectedLog.timestamp)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 border-y py-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">Type</span>
                  <Badge variant="outline" className="font-semibold text-xs">
                    {selectedLog.type}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">Channel</span>
                  <Badge
                    variant={selectedLog.channel === "whatsapp" ? "default" : "secondary"}
                    className={`text-xs uppercase font-medium ${
                      selectedLog.channel === "whatsapp" ? "bg-emerald-600 text-white" : ""
                    }`}
                  >
                    {selectedLog.channel}
                  </Badge>
                </div>
                {selectedLog.offerName && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs block mb-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Associated Filter Offer(s)
                    </span>
                    <span className="font-semibold">{selectedLog.offerName}</span>
                  </div>
                )}
                {selectedLog.categoriesName && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs block mb-1 flex items-center gap-1">
                      <Layers className="h-3 w-3 text-primary" />
                      Target Categories
                    </span>
                    <span className="font-semibold">{selectedLog.categoriesName}</span>
                  </div>
                )}
              </div>

              {/* Message text block */}
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs font-semibold">Message Body:</span>
                <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap border font-mono">
                  {selectedLog.message}
                </div>
              </div>

              {/* Recipients detail */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs font-semibold flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    Recipients ({selectedLog.recipients.length})
                  </span>
                </div>
                <div className="border rounded-md max-h-48 overflow-y-auto bg-background">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="py-2 text-xs">Recipient Name</TableHead>
                        <TableHead className="py-2 text-xs">Phone Number</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedLog.recipients.map((rec, i) => (
                        <TableRow key={i} className="hover:bg-muted/10">
                          <TableCell className="py-1.5 text-xs font-medium">{rec.name}</TableCell>
                          <TableCell className="py-1.5 text-xs font-mono">
                            {formatPhoneForDisplay(rec.phone)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setSelectedLog(null)} className="min-w-24">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation to clear */}
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Clear Log History
            </DialogTitle>
            <DialogDescription>
              Are you absolutely sure you want to permanently clear all sent notification history logs? This action is irreversible.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" onClick={() => setConfirmClearOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClear} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Yes, Clear Log
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SentNotificationsHistory;
