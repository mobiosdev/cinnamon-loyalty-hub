import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  PlusCircle,
  X,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Upload,
  Clipboard,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { validateAndNormalizeSriLankanMobile, formatPhoneForDisplay } from "@/utils/phoneUtils";

interface ParsedNumber {
  mobile: string;
  name: string;
}

interface BulkUploadWidgetProps {
  onNumbersAdded: (numbers: ParsedNumber[]) => void;
  title?: string;
  buttonText?: string;
  applyRedemptionFilterOption?: boolean;
  filterManualState?: boolean;
  onFilterManualChange?: (checked: boolean) => void;
}

export const BulkUploadWidget = ({
  onNumbersAdded,
  title = "Manually Add Phone Numbers / Bulk Upload",
  buttonText = "Validate & Add",
  applyRedemptionFilterOption = false,
  filterManualState = true,
  onFilterManualChange,
}: BulkUploadWidgetProps) => {
  const [manualInput, setManualInput] = useState("");
  const [invalidNumbers, setInvalidNumbers] = useState<string[]>([]);
  const [activeInputTab, setActiveInputTab] = useState<"text" | "file">("text");

  // Validate array of raw string phone numbers
  const processRawNumbers = (rawItems: string[], rowNames?: string[]) => {
    const valid: ParsedNumber[] = [];
    const invalid: string[] = [];

    rawItems.forEach((item, index) => {
      const cleanItem = item.trim();
      if (!cleanItem) return;

      const validation = validateAndNormalizeSriLankanMobile(cleanItem);
      if (validation.isValid && validation.normalized) {
        const name = rowNames?.[index]
          ? `${rowNames[index]} (${formatPhoneForDisplay(validation.normalized)})`
          : `Manual Recipient (${formatPhoneForDisplay(validation.normalized)})`;
        
        valid.push({
          mobile: validation.normalized,
          name,
        });
      } else {
        invalid.push(cleanItem);
      }
    });

    if (valid.length > 0) {
      onNumbersAdded(valid);
      toast.success(`Successfully loaded ${valid.length} number(s)`);
    }
    if (invalid.length > 0) {
      setInvalidNumbers(invalid);
      toast.error(`Found ${invalid.length} invalid phone numbers`);
    } else {
      setInvalidNumbers([]);
    }
  };

  // Textarea input submission
  const handleValidateText = () => {
    if (!manualInput.trim()) {
      toast.error("Please enter some phone numbers first");
      return;
    }
    const items = manualInput.split(/[\n,;\s]+/);
    processRawNumbers(items);
    setManualInput("");
  };

  // Excel/CSV file upload parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (rows.length === 0) {
          toast.error("The uploaded sheet is empty");
          return;
        }

        // Identify the headers from row 0
        const headers = rows[0].map((h: any) => String(h).toLowerCase().trim());
        
        // Find column indexes
        let phoneIdx = -1;
        let firstNameIdx = -1;
        let lastNameIdx = -1;

        headers.forEach((header: string, idx: number) => {
          if (
            header.includes("phone") ||
            header.includes("mobile") ||
            header.includes("number") ||
            header.includes("contact")
          ) {
            phoneIdx = idx;
          }
          if (header.includes("first") || header.includes("name")) {
            if (firstNameIdx === -1) firstNameIdx = idx;
          }
          if (header.includes("last") || header.includes("surname")) {
            lastNameIdx = idx;
          }
        });

        // Fallback: If no column matches, assume first column is phone number
        if (phoneIdx === -1) phoneIdx = 0;

        const rawNumbers: string[] = [];
        const rowNames: string[] = [];

        // Parse starting from row 1 (row 0 is header)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const phoneVal = String(row[phoneIdx] || "").trim();
          if (!phoneVal) continue;

          rawNumbers.push(phoneVal);

          // Build a name if name columns are present
          let name = "";
          if (firstNameIdx !== -1) {
            const fName = String(row[firstNameIdx] || "").trim();
            const lName = lastNameIdx !== -1 ? String(row[lastNameIdx] || "").trim() : "";
            name = `${fName} ${lName}`.trim();
          }
          rowNames.push(name || `Row ${i}`);
        }

        if (rawNumbers.length === 0) {
          toast.error("No phone numbers found in sheet");
          return;
        }

        processRawNumbers(rawNumbers, rowNames);
      } catch (err) {
        console.error("Error reading file:", err);
        toast.error("Failed to parse sheet. Please ensure it's a valid CSV/Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset file input value
    e.target.value = "";
  };

  // Generate and download sample template
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        ["First Name", "Last Name", "Mobile"],
        ["John", "Doe", "0771234567"],
        ["Jane", "Smith", "+94776543210"],
        ["Ranil", "Perera", "94771112222"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.book_append_sheet(wb, ws, "Template");

      // Generate spreadsheet binary
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = "bulk_notification_template.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Sample template downloaded!");
    } catch (err) {
      console.error("Template download error:", err);
      // Fallback to CSV
      try {
        const csvContent = "First Name,Last Name,Mobile\nJohn,Doe,0771234567\nJane,Smith,+94776543210\nRanil,Perera,94771112222";
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "bulk_notification_template.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Sample CSV template downloaded!");
      } catch (fallbackErr) {
        console.error("Fallback template error:", fallbackErr);
        toast.error("Failed to download template");
      }
    }
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="bulk-upload" className="border-b-0">
        <AccordionTrigger className="hover:no-underline py-0">
          <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <PlusCircle className="h-4 w-4 text-primary" />
            {title}
          </span>
        </AccordionTrigger>
        <AccordionContent className="pt-4 space-y-4">
          {/* Tabs inside bulk upload: text paste vs file upload */}
          <div className="flex border-b text-sm">
            <button
              onClick={() => setActiveInputTab("text")}
              className={`pb-2 px-4 flex items-center gap-1.5 border-b-2 font-medium ${
                activeInputTab === "text"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clipboard className="h-4 w-4" />
              Copy/Paste Text
            </button>
            <button
              onClick={() => setActiveInputTab("file")}
              className={`pb-2 px-4 flex items-center gap-1.5 border-b-2 font-medium ${
                activeInputTab === "file"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel / CSV Upload
            </button>
          </div>

          {activeInputTab === "text" ? (
            <div className="space-y-2">
              <Label htmlFor="bulk-phones-text">Paste phone numbers (comma, space, or newline separated)</Label>
              <Textarea
                id="bulk-phones-text"
                placeholder="e.g., 0771234567, 0767654321, 94771112222"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                rows={3}
              />
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs text-muted-foreground">
                  Accepts Sri Lankan numbers starting with +94, 94, 07, or 7
                </span>
                <Button size="sm" variant="secondary" onClick={handleValidateText}>
                  {buttonText}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border border-dashed rounded-lg p-6 bg-muted/20">
                <div className="flex items-center gap-3">
                  <Upload className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Upload Excel or CSV Sheet</p>
                    <p className="text-xs text-muted-foreground">Supports .xlsx, .xls, .csv files</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-1.5">
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4">
                      Choose File
                    </span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Redemption Filter Toggle in Dialog if needed */}
          {applyRedemptionFilterOption && onFilterManualChange && (
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="apply-filter-manual"
                checked={filterManualState}
                onCheckedChange={(checked) => onFilterManualChange(!!checked)}
              />
              <Label htmlFor="apply-filter-manual" className="text-xs text-muted-foreground cursor-pointer">
                Filter already-redeemed manual/uploaded numbers
              </Label>
            </div>
          )}

          {/* Invalid feedback box */}
          {invalidNumbers.length > 0 && (
            <div className="border border-destructive/20 bg-destructive/5 rounded-md p-3 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-destructive font-medium">
                <X className="h-4 w-4" />
                <span>Failed to parse {invalidNumbers.length} item(s):</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1 text-destructive/80 font-mono">
                {invalidNumbers.map((num, i) => (
                  <span key={i} className="bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/10">
                    {num}
                  </span>
                ))}
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
export default BulkUploadWidget;
