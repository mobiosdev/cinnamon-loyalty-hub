import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Server, 
  ShieldCheck, 
  Database, 
  Lock, 
  Download, 
  Search, 
  FileSpreadsheet, 
  Layers, 
  FileCheck2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { toast } from "sonner";
import { auditApi, AssetInventoryItem, ComplianceMetrics } from "@/services/auditApi";

export function AssetInventory() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassification, setSelectedClassification] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [assets, setAssets] = useState<AssetInventoryItem[]>([]);

  const fetchInventory = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await auditApi.getAssetInventory();
      setMetrics(res.metrics);
      setAssets(res.assets);
      if (isManualRefresh) toast.success("Asset inventory refreshed successfully");
    } catch (err: any) {
      console.error("Failed to load asset inventory:", err);
      toast.error(err.response?.data?.message || "Failed to load asset inventory");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.dataHandled.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.stack.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClassification =
      selectedClassification === "all" || asset.classification.toLowerCase() === selectedClassification.toLowerCase();

    const matchesType =
      selectedType === "all" || asset.type.toLowerCase() === selectedType.toLowerCase();

    return matchesSearch && matchesClassification && matchesType;
  });

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case "Restricted":
        return <Badge variant="destructive" className="font-semibold">Restricted</Badge>;
      case "Confidential":
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 font-semibold">Confidential (PII)</Badge>;
      case "Internal":
        return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20 font-semibold">Internal</Badge>;
      case "Public":
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 font-semibold">Public</Badge>;
      default:
        return <Badge variant="outline">{classification}</Badge>;
    }
  };

  const exportCsv = () => {
    if (assets.length === 0) {
      toast.error("No asset data to export");
      return;
    }

    const headers = [
      "Asset ID",
      "Asset Name",
      "Technology Stack",
      "Asset Type",
      "Customer Data Handled",
      "Classification",
      "Hosting Location",
      "Security Controls"
    ];

    const rows = filteredAssets.map((a) => [
      `"${a.id}"`,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.stack.replace(/"/g, '""')}"`,
      `"${a.type}"`,
      `"${a.dataHandled.replace(/"/g, '""')}"`,
      `"${a.classification}"`,
      `"${a.location.replace(/"/g, '""')}"`,
      `"${a.securityControls.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cinnamon_Loyalty_Asset_Inventory_Q21_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Asset inventory exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tracked Digital Assets
            </CardTitle>
            <Server className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assets.length} Assets</div>
            <p className="text-xs text-muted-foreground mt-1">Apps, DBs, Backups & Gateways</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Customer Records Tracked
            </CardTitle>
            <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics ? metrics.total_members.toLocaleString() : "..."} Members
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics ? metrics.active_members.toLocaleString() : "..."} Active in Loyalty DB
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Encryption at Rest & Transit
            </CardTitle>
            <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold flex items-center gap-1.5 text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> AES-256 & TLS 1.3
            </div>
            <p className="text-xs text-muted-foreground mt-1">KMS-Enforced & SSL Validated</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Regulatory Privacy Standard
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold text-foreground">Sri Lanka PDPA Aligned</div>
            <p className="text-xs text-muted-foreground mt-1">Act No. 9 of 2022 Compliant</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold font-serif">
                  Information Asset & Customer Data Inventory (Q21 / Q22)
                </CardTitle>
              </div>
              <CardDescription className="mt-1">
                Catalogue of all platform applications, databases, cloud backups, and telco sub-processors handling Cinnamon customer data.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchInventory(true)}
                disabled={loading || refreshing}
                className="h-9 gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={exportCsv}
                className="h-9 gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t mt-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets, stack, or PII..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Select value={selectedClassification} onValueChange={setSelectedClassification}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Filter Classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classifications</SelectItem>
                <SelectItem value="Confidential">Confidential (Customer PII)</SelectItem>
                <SelectItem value="Restricted">Restricted (System Secrets)</SelectItem>
                <SelectItem value="Internal">Internal (Operational)</SelectItem>
                <SelectItem value="Public">Public (Visual Card)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Filter Asset Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Asset Types</SelectItem>
                <SelectItem value="Application">Application (Web / API / Messaging)</SelectItem>
                <SelectItem value="Database">Database & Persistence</SelectItem>
                <SelectItem value="Backup">Backups & DR</SelectItem>
                <SelectItem value="Integration">Third-Party Sub-Processor</SelectItem>
                <SelectItem value="Storage">Local Storage</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-24 font-bold text-xs">Asset ID</TableHead>
                  <TableHead className="font-bold text-xs min-w-[180px]">Asset Name & Stack</TableHead>
                  <TableHead className="font-bold text-xs min-w-[220px]">Customer Data Handled</TableHead>
                  <TableHead className="font-bold text-xs w-36">Classification</TableHead>
                  <TableHead className="font-bold text-xs min-w-[160px]">Hosting Location</TableHead>
                  <TableHead className="font-bold text-xs min-w-[200px]">Security Controls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        Loading Information Asset Inventory...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No assets found matching the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((asset) => (
                    <TableRow key={asset.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {asset.id}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-foreground">{asset.name}</div>
                        <div className="text-[11px] text-muted-foreground">{asset.stack}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-foreground/90 leading-relaxed font-normal">
                          {asset.dataHandled}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getClassificationBadge(asset.classification)}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono text-muted-foreground">
                          {asset.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground leading-normal">
                          {asset.securityControls}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Compliance Footer Note */}
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-2.5 text-xs text-muted-foreground">
            <FileCheck2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Audit Compliance Note:</span> This inventory satisfies Requirement 21 &amp; 22 of the Hotel Vendor Due Diligence framework. Data Controller responsibility remains with Cinnamon Grand Colombo; Mobios acts as the Data Processor. All customer personal data is encrypted in transit (TLS 1.3) and at rest (AES-256).
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
