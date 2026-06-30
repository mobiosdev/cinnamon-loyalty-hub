import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Building2, User, Check, ChevronsUpDown, Upload, Loader2, Calendar, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { companyApi } from "@/services/companyApi";
import { staffApi } from "@/services/staffApi";
import { categoryApi } from "@/services/categoryApi";
import { offerApi } from "@/services/offerApi";
import { useDebounce } from "@/hooks/useDebounce";
import { StaffList } from "./StaffList";
import { Checkbox } from "@/components/ui/checkbox";
import { logCompanyActivity, logMemberActivity } from "@/utils/auditLogger";
import { validateAndNormalizeSriLankanMobile } from "@/utils/phoneUtils";

interface Company {
  id: string;
  company_code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  created_at?: string;
  updated_at?: string;
}

interface StaffMember {
  id: string;
  title: string;
  first_name: string;
  last_name: string;
  mobile: string;
  email: string;
  address: string;
  dateOfBirth?: string;
  designation: string;
  registeredDate: string;
  renewDate: string;
  discountPercentage: string;
  discountAmount: string;
  discountPolicy: string;
  companyId?: string;
  category_id?: number;
}

// Mock existing companies - In production, fetch from your CRM database
// REMOVED: Mock data replaced with API integration

const CompanyRegistration = () => {
  const [isDragging, setIsDragging] = useState(false);
  // Company details
  const [openCompanySearch, setOpenCompanySearch] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [isReload, setIsReload] = useState(false);
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyFormData, setCompanyFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    manager_name: "",
  });

  // Companies search state
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  // Debounce company name search
  const debouncedCompanyName = useDebounce(companyName, 500);
  
  // Staff members state
  const [loading, setLoading] = useState(false);
  const [memberFormData, setMemberFormData] = useState<Partial<StaffMember>>({
    title: '',
    first_name: '',
    last_name: '',
    mobile: '',
    email: '',
    address: '',
    dateOfBirth: '',
    designation: '',
    registeredDate: new Date().toISOString().split('T')[0],
    renewDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    discountPercentage: '10',
    discountAmount: '',
    discountPolicy: 'percentage',
  });
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryOffers, setCategoryOffers] = useState<any[]>([]);
  const [discountEnabled, setDiscountEnabled] = useState(true);
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([]);

  // Bulk Upload states
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [uploadCategoryId, setUploadCategoryId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Fetch all companies and categories for the dropdowns
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [companiesData, categoriesData] = await Promise.all([
          companyApi.searchCompanies({ limit: 1000 }),
          categoryApi.getCategories()
        ]);
        setAvailableCompanies(companiesData);
        setCategories(categoriesData);
        
        // Set default category to "Member" if it exists
        const memberCategory = categoriesData.find(cat => cat.name.toLowerCase() === 'member');
        if (memberCategory) {
          setMemberFormData(prev => ({ ...prev, category_id: memberCategory.id }));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      }
    };
    
    fetchAllData();
  }, []);

  // Auto-set company ID when selected company changes
  useEffect(() => {
    if (selectedCompany?.id) {
      setMemberFormData(prev => ({ ...prev, companyId: selectedCompany.id }));
    }
  }, [selectedCompany]);

  // Load offers when category changes
  useEffect(() => {
    const loadCategoryOffers = async () => {
      if (memberFormData.category_id) {
        try {
          const offers = await offerApi.getOffersByCategory(memberFormData.category_id);
          setCategoryOffers(offers);
          // Auto-select all offers by default
          setSelectedOfferIds(offers.map(offer => offer.id));
        } catch (error) {
          console.error('Error loading category offers:', error);
          setCategoryOffers([]);
          setSelectedOfferIds([]);
        }
      } else {
        setCategoryOffers([]);
        setSelectedOfferIds([]);
      }
    };

    loadCategoryOffers();
  }, [memberFormData.category_id]);

  // Fetch companies when debounced company name changes
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!debouncedCompanyName.trim()) {
        setCompanies([]);
        return;
      }

      setIsLoadingCompanies(true);
      setCompaniesError(null);

      try {
        const fetchedCompanies = await companyApi.searchCompanies({
          name: debouncedCompanyName,
          limit: 50, // Get more results for better search experience
        });
        setCompanies(fetchedCompanies);
      } catch (error) {
        setCompaniesError(error instanceof Error ? error.message : 'Failed to fetch companies');
        setCompanies([]);
      } finally {
        setIsLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, [debouncedCompanyName]);

  const handleSelectCompany = (company: Company) => {
    console.log(company);
    setSelectedCompany(company);
    setCompanyFormData({
      name: company.name,
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      manager_name: company.manager_name || "",
    });
    setCompanyName(company.name);
    setCompanyAddress(company.address || "");
    setCompanyPhone(company.phone || "");
    setCompanyEmail(company.email || "");
    setTimeout(() => setOpenCompanySearch(false), 100);
  };

  const handleClearCompany = () => {
    setCompanyFormData({
      name: "",
      address: "",
      phone: "",
      email: "",
      manager_name: "",
    });
    setCompanyName("");
    setCompanyAddress("");
    setCompanyPhone("");
    setCompanyEmail("");
    setSelectedCompany(null);
    
    // Reset member form
    const memberCategory = categories.find(cat => cat.name.toLowerCase() === 'member');
    setMemberFormData({
      title: '',
      first_name: '',
      last_name: '',
      mobile: '',
      email: '',
      address: '',
      dateOfBirth: '',
      designation: '',
      registeredDate: new Date().toISOString().split('T')[0],
      renewDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      discountPercentage: '10',
      discountAmount: '',
      discountPolicy: 'percentage',
      category_id: memberCategory?.id,
    });
    setDiscountEnabled(true);
    setSelectedOfferIds([]);
  };

  const handleSubmitCompany = async () => {
    if (!companyFormData.name || !companyFormData.address) {
      toast.error("Please fill all required company fields (Name and Address)");
      return;
    }

    // Validate phone number if provided
    if (companyFormData.phone) {
      const phoneValidation = validateAndNormalizeSriLankanMobile(companyFormData.phone);
      if (!phoneValidation.isValid) {
        toast.error(phoneValidation.error || "Invalid phone number");
        return;
      }
      companyFormData.phone = phoneValidation.normalized!;
    }

    try {
      const companyCode = selectedCompany?.company_code || `COMP${Date.now()}`;
      const companyData = {
        company_code: companyCode,
        name: companyFormData.name,
        address: companyFormData.address,
        phone: companyFormData.phone || undefined,
        email: companyFormData.email || undefined,
        manager_name: companyFormData.manager_name || undefined,
      };

      let savedCompany: Company;

      if (selectedCompany && selectedCompany.id) {
        // Update existing company
        const savedCompany: any = await companyApi.updateCompany(selectedCompany.id, {
          company_code: companyCode,
          name: companyFormData.name,
          address: companyFormData.address,
          phone: companyFormData.phone || undefined,
          email: companyFormData.email || undefined,
          manager_name: companyFormData.manager_name || undefined,
        });
        setSelectedCompany(savedCompany);
        toast.success("Company information updated successfully!");
      } else {
        // Generate a unique company code
        const companyCode = `COMP${Date.now()}`;
        
        const newCompany = await companyApi.createCompany({
          company_code: companyCode,
          name: companyFormData.name || "",
          address: companyFormData.address || "",
          phone: companyFormData.phone || "",
          email: companyFormData.email || "",
          manager_name: companyFormData.manager_name || "",
        });
        setSelectedCompany(newCompany);
        toast.success("Company information saved successfully!");
      }

    } catch (error) {
      console.error('Error saving company:', error);
      toast.error(error instanceof Error ? error.message : "Failed to save company information");
    }
  };

  const handleEditStaff = (staff: any) => {
    console.log(staff);
    
    setMemberFormData({
      id: staff.id,
      title: staff.title,
      first_name: staff.first_name,
      last_name: staff.last_name,
      mobile: staff.mobile,
      email: staff.email,
      address: staff.address,
      dateOfBirth: staff.date_of_birth?.split('T')[0] || '',
      designation: staff.designation,
      registeredDate: staff.registered_date?.split('T')[0] || '',
      renewDate: staff.renew_date?.split('T')[0] || '',
      discountPercentage: staff.discount_percentage?.toString() || '10',
      discountAmount: staff.discount_amount?.toString() || '',
      discountPolicy: staff.discount_policy || 'percentage',
      companyId: staff.company_id,
      category_id: staff.category_id,
    });
    
    // Set discount and offers state
    setDiscountEnabled(staff.discount_enabled ?? true);
    setSelectedOfferIds(Array.isArray(staff.selected_offers) ? staff.selected_offers : []);
    
    // Set company details
    if (staff.company_id) {
      const company = availableCompanies.find(c => c.id === staff.company_id);
      if (company) {
        setSelectedCompany(company);
        setCompanyName(company.name);
        setCompanyAddress(company.address || '');
        setCompanyPhone(company.phone || '');
        setCompanyEmail(company.email || '');
        setCompanyFormData({
          name: company.name,
          address: company.address || '',
          phone: company.phone || '',
          email: company.email || '',
          manager_name: company.manager_name || '',
        });
      }
    }
    
    // Scroll to member form
    setTimeout(() => {
      document.getElementById('member-form-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return;
    
    try {
      // TODO: Implement delete API call when available
      // await staffApi.deleteStaff(id);
      setIsReload(!isReload);
      toast.success("Member deleted successfully!");
    } catch (error) {
      console.error("Error deleting member:", error);
      toast.error("Failed to delete member");
    }
  };

  const parseExcelDate = (val: any): string | null => {
    if (!val) return null;
    
    // If it's a number (Excel serial date)
    if (typeof val === 'number') {
      const date = new Date((val - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    // If it's a string
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return null;
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    }
    
    // If it's already a Date object
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val.toISOString().split('T')[0];
    }
    
    return null;
  };

  const downloadSampleExcel = () => {
    const headers = [
      ["Title", "First Name", "Last Name", "Mobile", "Date of Birth", "Email", "Designation", "Address", "Company Name", "Company Address", "Company Phone", "Company Email", "Company Manager", "Renewal Date"]
    ];
    const sampleData = [
      ["Mr", "John", "Doe", "0771234567", "1990-05-15", "john.doe@example.com", "Manager", "123 Galle Road, Colombo", "Cinnamon Hotels", "77 Galle Road, Colombo 03", "0112345678", "info@cinnamon.com", "Mr. Manager", "2027-06-24"]
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Members Template");
    XLSX.writeFile(workbook, "bulk_members_template.xlsx");
    toast.success("Sample Excel template downloaded!");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const handleBulkSubmit = async () => {
    if (!uploadCategoryId) {
      toast.error("Please select a member category");
      return;
    }
    if (!uploadFile) {
      toast.error("Please select an Excel file");
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

          if (jsonData.length === 0) {
            toast.error("The uploaded file contains no rows");
            setIsUploading(false);
            return;
          }

          let successCount = 0;
          let failCount = 0;
          const errorsList: string[] = [];
          const companyCache: Record<string, string> = {};

          // Load category offers
          let offers: any[] = [];
          try {
            offers = await offerApi.getOffersByCategory(Number(uploadCategoryId));
          } catch (e) {
            console.error("Error loading category offers:", e);
          }
          const offerIds = offers.map(o => o.id);

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            const title = row["Title"] || row["title"] || "";
            const first_name = row["First Name"] || row["first_name"] || row["FirstName"] || "";
            const last_name = row["Last Name"] || row["last_name"] || row["LastName"] || "";
            const mobileStr = String(row["Mobile"] || row["mobile"] || row["phone"] || row["Phone"] || "").trim();
            const email = row["Email"] || row["email"] || "";
            const designation = row["Designation"] || row["designation"] || "";
            const address = row["Address"] || row["address"] || "";

            // Date columns parsing
            const rawRenewDate = row["Renewal Date"] || row["renewal_date"] || row["Renew Date"] || row["renew_date"];
            const parsedRenewDate = parseExcelDate(rawRenewDate) || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

            const rawDob = row["Date of Birth"] || row["date_of_birth"] || row["DOB"] || row["dob"];
            const parsedDob = parseExcelDate(rawDob);

            // Company details columns
            const cName = (row["Company Name"] || row["company_name"] || row["Company"] || row["company"] || "").toString().trim();
            const cAddress = row["Company Address"] || row["company_address"] || "";
            const cPhone = row["Company Phone"] || row["company_phone"] || "";
            const cEmail = row["Company Email"] || row["company_email"] || "";
            const cManager = row["Company Manager"] || row["company_manager"] || "";

            if (!first_name || !last_name || !mobileStr) {
              failCount++;
              errorsList.push(`Row ${i + 2}: Missing Name or Mobile number`);
              continue;
            }

            const mobileValidation = validateAndNormalizeSriLankanMobile(mobileStr);
            if (!mobileValidation.isValid) {
              failCount++;
              errorsList.push(`Row ${i + 2} (${first_name}): ${mobileValidation.error}`);
              continue;
            }

            // Resolve company_id
            let companyId = "";
            let resolvedCompanyName = "";

            if (cName) {
              const cacheKey = cName.toUpperCase();
              if (companyCache[cacheKey]) {
                companyId = companyCache[cacheKey];
                resolvedCompanyName = cName;
              } else {
                try {
                  const existingCompanies = await companyApi.searchCompanies({
                    name: cName,
                    limit: 1
                  });

                  const existingCompany = existingCompanies?.[0];

                  if (existingCompany) {
                    companyId = existingCompany.id;
                    companyCache[cacheKey] = companyId;
                    resolvedCompanyName = existingCompany.name;
                  } else {
                    // Create new company
                    const companyCode = `COMP${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    const newCompany = await companyApi.createCompany({
                      company_code: companyCode,
                      name: cName,
                      address: cAddress || 'N/A',
                      phone: cPhone || '',
                      email: cEmail || '',
                      manager_name: cManager || '',
                    });
                    companyId = newCompany.id;
                    companyCache[cacheKey] = companyId;
                    resolvedCompanyName = cName;
                    
                    await logCompanyActivity('create', cName, companyId, {
                      company_code: companyCode,
                      source: 'bulk_upload'
                    });
                  }
                } catch (err: any) {
                  failCount++;
                  errorsList.push(`Row ${i + 2}: Failed to resolve/create company '${cName}' (${err.message})`);
                  continue;
                }
              }
            } else if (selectedCompany?.id) {
              companyId = selectedCompany.id;
              resolvedCompanyName = selectedCompany.name;
            } else {
              failCount++;
              errorsList.push(`Row ${i + 2}: Missing company name and no company is selected on the page`);
              continue;
            }

            try {
              const memberData = {
                title,
                company_id: companyId,
                first_name,
                last_name,
                mobile: mobileValidation.normalized!,
                email,
                address,
                designation,
                registered_date: new Date().toISOString().split('T')[0],
                renew_date: parsedRenewDate,
                date_of_birth: parsedDob,
                discount_amount: 0,
                discount_percentage: 10,
                discount_policy: 'percentage',
                is_active: true,
                category_id: Number(uploadCategoryId),
                discount_enabled: true,
                selected_offers: offerIds,
              };

              const result = await staffApi.registerStaff(memberData);

              await logMemberActivity('create', `${first_name} ${last_name}`, result.id, {
                company: resolvedCompanyName,
                category: categories.find(c => c.id === Number(uploadCategoryId))?.name,
                source: 'bulk_upload'
              });

              successCount++;
            } catch (err: any) {
              failCount++;
              errorsList.push(`Row ${i + 2} (${first_name}): ${err.message || 'Registration failed'}`);
            }
          }

          toast.success(`Uploaded ${successCount} member(s) successfully. Failed: ${failCount}`);
          if (errorsList.length > 0) {
            console.error("Bulk upload details:", errorsList);
            toast.error(`Upload error: ${errorsList[0]}`);
          }

          setIsReload(!isReload);
          setBulkUploadOpen(false);
          setUploadFile(null);
        } catch (err: any) {
          console.error(err);
          toast.error("Failed to parse the file structure");
        } finally {
          setIsUploading(false);
        }
      };

      reader.readAsBinaryString(uploadFile);
    } catch (err) {
      console.error(err);
      toast.error("Failed to read the file");
      setIsUploading(false);
    }
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate company fields
    // if (!companyName || !companyAddress) {
    //   toast.error('Please fill all required company fields (Name and Address)');
    //   return;
    // }

    // Validate member fields
    if (!memberFormData.title || !memberFormData.first_name || !memberFormData.last_name || 
        !memberFormData.mobile || !memberFormData.email 
        // || !memberFormData.designation
      ) {
      toast.error('Please fill all required member fields');
      return;
    }

    // Validate and normalize mobile number
    const mobileValidation = validateAndNormalizeSriLankanMobile(memberFormData.mobile);
    if (!mobileValidation.isValid) {
      toast.error(mobileValidation.error || "Invalid mobile number");
      return;
    }

    // Validate and normalize company phone if provided
    if (companyPhone) {
      const companyPhoneValidation = validateAndNormalizeSriLankanMobile(companyPhone);
      if (!companyPhoneValidation.isValid) {
        toast.error("Invalid company phone number: " + companyPhoneValidation.error);
        return;
      }
      setCompanyPhone(companyPhoneValidation.normalized!);
    }
    
    setLoading(true);

    try {
      // Step 1: Save or update company first
      let companyId = selectedCompany?.id;
      
      if (!companyId) {
        // Create new company
        const companyCode = `COMP${Date.now()}`;
        const newCompany = await companyApi.createCompany({
          company_code: companyCode,
          name: companyName,
          address: companyAddress,
          phone: companyPhone || '',
          email: companyEmail || '',
          manager_name: companyFormData.manager_name || '',
        });
        companyId = newCompany.id;
        setSelectedCompany(newCompany);
        
        // Log company creation
        await logCompanyActivity('create', companyName, companyId, {
          company_code: companyCode,
          manager: companyFormData.manager_name
        });
      } else {
        // Update existing company if details changed
        await companyApi.updateCompany(companyId, {
          company_code: selectedCompany.company_code,
          name: companyName,
          address: companyAddress,
          phone: companyPhone || undefined,
          email: companyEmail || undefined,
          manager_name: companyFormData.manager_name || undefined,
        });
        
        // Log company update
        await logCompanyActivity('update', companyName, companyId, {
          company_code: selectedCompany.company_code,
          manager: companyFormData.manager_name
        });
      }

      // Step 2: Save or update member with company ID
      if (memberFormData.id) {
        // Update existing member
        const updateData = {
          title: memberFormData.title,
          company_id: companyId,
          first_name: memberFormData.first_name || '',
          last_name: memberFormData.last_name || '',
          mobile: mobileValidation.normalized!,
          email: memberFormData.email || '',
          address: memberFormData.address || '',
          date_of_birth: memberFormData.dateOfBirth || null,
          designation: memberFormData.designation || '',
          registered_date: memberFormData.registeredDate || new Date().toISOString().split('T')[0],
          renew_date: memberFormData.renewDate || new Date().toISOString().split('T')[0],
          discount_amount: parseFloat(memberFormData.discountAmount || '0'),
          discount_percentage: parseFloat(memberFormData.discountPercentage || '10'),
          discount_policy: memberFormData.discountPolicy || 'percentage',
          is_active: true,
          category_id: memberFormData.category_id,
          discount_enabled: discountEnabled,
          selected_offers: selectedOfferIds,
        };
        
        await staffApi.updateStaff(memberFormData.id, updateData);
        
        // Log member update
        await logMemberActivity(
          'update',
          `${memberFormData.first_name} ${memberFormData.last_name}`,
          memberFormData.id,
          {
            company: companyName,
            category: categories.find(c => c.id === memberFormData.category_id)?.name,
            discount_policy: memberFormData.discountPolicy
          }
        );
        
        toast.success("Member updated successfully!");
      } else {
        // Create new member
        const staffData = {
          title: memberFormData.title,
          company_id: companyId,
          first_name: memberFormData.first_name || '',
          last_name: memberFormData.last_name || '',
          mobile: mobileValidation.normalized!,
          email: memberFormData.email || '',
          address: memberFormData.address || '',
          date_of_birth: memberFormData.dateOfBirth || null,
          designation: memberFormData.designation || '',
          registered_date: memberFormData.registeredDate || new Date().toISOString().split('T')[0],
          renew_date: memberFormData.renewDate || new Date().toISOString().split('T')[0],
          discount_amount: parseFloat(memberFormData.discountAmount || '0'),
          discount_percentage: parseFloat(memberFormData.discountPercentage || '10'),
          discount_policy: memberFormData.discountPolicy || 'percentage',
          is_active: true,
          category_id: memberFormData.category_id,
          discount_enabled: discountEnabled,
          selected_offers: selectedOfferIds,
        };

        const result = await staffApi.registerStaff(staffData);
        
        // Log member creation
        await logMemberActivity(
          'create',
          `${memberFormData.first_name} ${memberFormData.last_name}`,
          result.id,
          {
            company: companyName,
            category: categories.find(c => c.id === memberFormData.category_id)?.name,
            discount_policy: memberFormData.discountPolicy
          }
        );
        
        toast.success("Member registered successfully!");
      }
      
      // Trigger reload of members list
      setIsReload(prev => !prev);
      
      // Reset form
      handleClearCompany();
    } catch (error) {
      console.error("Error saving member:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to register member";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Prevent form submission on enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="member-details" className="w-full">
        <Card className="mt-4">
          <TabsList className="grid w-full grid-cols-2 h-auto p-0 bg-transparent border-b rounded-none">
            <TabsTrigger 
              value="member-details" 
              className="rounded-none rounded-tl-lg data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=inactive]:bg-muted/50 py-3 border-r border-b-0"
            >
              Register a Member
            </TabsTrigger>
            <TabsTrigger 
              value="registered-members" 
              className="rounded-none rounded-tr-lg data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-sm data-[state=inactive]:bg-muted/50 py-3 border-b-0"
            >
              Registered Members
            </TabsTrigger>
          </TabsList>
        </Card>

        <TabsContent value="member-details" className="mt-6">
          {/* Unified Member Registration Form */}
          <Card id="member-form-section">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="font-serif">Member Details</CardTitle>
          </div>
          <CardDescription>
            Enter member details and company information for member registration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMemberSubmit} onKeyDown={handleKeyDown}>
             <div className="space-y-6">
               {/* Member Details Cards */}
               <div className="space-y-6">
                 {/* Personal Information Card */}
                 <Card className="border border-border/60 shadow-sm bg-card/30">
                   <CardHeader className="pb-3">
                     <div className="flex items-center gap-2">
                       <User className="h-4 w-4 text-primary" />
                       <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
                     </div>
                   </CardHeader>
                   <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div className="space-y-2">
                       <Label>Title *</Label>
                       <Select 
                         value={memberFormData.title} 
                         onValueChange={(value) => setMemberFormData({...memberFormData, title: value})}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Select title" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="Mr">Mr.</SelectItem>
                           <SelectItem value="Mrs">Mrs.</SelectItem>
                           <SelectItem value="Ms">Ms.</SelectItem>
                           <SelectItem value="Miss">Miss</SelectItem>
                           <SelectItem value="Dr">Dr.</SelectItem>
                           <SelectItem value="Prof">Prof.</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                     
                     <div className="space-y-2">
                       <Label>First Name *</Label>
                       <Input 
                         value={memberFormData.first_name || ''} 
                         onChange={(e) => setMemberFormData({...memberFormData, first_name: e.target.value})}
                         placeholder="First name"
                       />
                     </div>
                     
                     <div className="space-y-2">
                       <Label>Last Name *</Label>
                       <Input 
                         value={memberFormData.last_name || ''} 
                         onChange={(e) => setMemberFormData({...memberFormData, last_name: e.target.value})}
                         placeholder="Last name"
                       />
                     </div>

                     <div className="space-y-2">
                       <Label>Date of Birth</Label>
                       <Input 
                         type="date"
                         value={memberFormData.dateOfBirth || ''} 
                         onChange={(e) => setMemberFormData({...memberFormData, dateOfBirth: e.target.value})}
                       />
                     </div>
                     
                     <div className="space-y-2">
                       <Label>Email *</Label>
                       <Input 
                         type="email"
                         value={memberFormData.email || ''} 
                         onChange={(e) => setMemberFormData({...memberFormData, email: e.target.value})}
                         placeholder="email@example.com"
                       />
                     </div>
                     
                     <div className="space-y-2">
                       <Label>Mobile *</Label>
                       <Input 
                         value={memberFormData.mobile || ''} 
                         onChange={(e) => setMemberFormData({...memberFormData, mobile: e.target.value})}
                         placeholder="+94 77 123 4567"
                       />
                     </div>
                     
                     
                     
                     <div className="space-y-2 lg:col-span-2">
                       <Label>Address</Label>
                       <Input 
                         value={memberFormData.address || ''} 
                         onChange={(e) => setMemberFormData({...memberFormData, address: e.target.value})}
                         placeholder="Member address"
                       />
                     </div>
                   </CardContent>
                 </Card>

                 {/* Company Information Card */}
                 <Card className="border border-border/60 shadow-sm bg-card/30">
                   <CardHeader className="pb-3">
                     <div className="flex items-center gap-2">
                       <Building2 className="h-4 w-4 text-primary" />
                       <CardTitle className="text-base font-semibold">Company Information</CardTitle>
                     </div>
                   </CardHeader>
                   <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="companyName">Company Name</Label>
                       <div className="relative">
                         <Input
                           id="companyName"
                           value={companyName}
                           onChange={(e) => setCompanyName(e.target.value)}
                           onFocus={() => setOpenCompanySearch(true)}
                           onBlur={() => setTimeout(() => setOpenCompanySearch(false), 200)}
                           placeholder="Search or enter company name..."
                           className="pr-10"
                         />
                         <ChevronsUpDown className="absolute right-3 top-3 h-4 w-4 opacity-50" />
                         {openCompanySearch && companyName && (
                           <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md">
                             <div className="max-h-60 overflow-auto p-1">
                               {isLoadingCompanies ? (
                                 <div className="flex items-center justify-center p-4">
                                   <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                   <span className="text-sm">Searching companies...</span>
                                 </div>
                               ) : companiesError ? (
                                 <div className="p-2 text-sm text-destructive">
                                   {companiesError}
                                 </div>
                               ) : companies.length > 0 ? (
                                 companies
                                   .filter(company =>
                                     company.name.toLowerCase().includes(companyName.toLowerCase())
                                   )
                                   .map((company) => (
                                     <div
                                       key={company.id}
                                       className="flex items-start gap-2 p-2 hover:bg-accent cursor-pointer rounded-sm"
                                       onClick={() => handleSelectCompany(company)}
                                     >
                                       <Check
                                         className={cn(
                                           "h-4 w-4 mt-0.5 pointer-events-none",
                                           selectedCompany?.id === company.id ? "opacity-100" : "opacity-0"
                                         )}
                                       />
                                       <div className="flex-1">
                                         <p className="font-medium text-sm">{company.name}</p>
                                         <p className="text-xs text-muted-foreground">{company.address}</p>
                                       </div>
                                     </div>
                                   ))
                               ) : (
                                 <div className="p-2 text-sm text-muted-foreground">
                                   No matching companies. Continue typing to add new company.
                                 </div>
                               )}
                             </div>
                           </div>
                         )}
                       </div>
                     </div>

                     <div className="space-y-2">
                       <Label>Designation</Label>
                       <Input 
                         value={memberFormData.designation || ''} 
                         onChange={(e) => setMemberFormData({...memberFormData, designation: e.target.value})}
                         placeholder="e.g. Sales Manager"
                       />
                     </div>

                     <div className="space-y-2">
                       <Label htmlFor="companyPhone">Company Phone Number</Label>
                       <Input
                         id="companyPhone"
                         value={companyPhone}
                         onChange={(e) => setCompanyPhone(e.target.value)}
                         placeholder="Enter company phone number"
                       />
                     </div>

                     <div className="space-y-2 lg:col-span-2">
                       <Label htmlFor="companyAddress">Company Address</Label>
                       <Input
                         id="companyAddress"
                         value={companyAddress}
                         onChange={(e) => setCompanyAddress(e.target.value)}
                         placeholder="Enter company address"
                       />
                     </div>

                     

                     <div className="space-y-2">
                       <Label htmlFor="companyEmail">Company Email</Label>
                       <Input
                         id="companyEmail"
                         type="email"
                         value={companyEmail}
                         onChange={(e) => setCompanyEmail(e.target.value)}
                         placeholder="Enter company email"
                       />
                     </div>
                   </CardContent>
                 </Card>

                 {/* Other Information Card */}
                 <Card className="border border-border/60 shadow-sm bg-card/30">
                   <CardHeader className="pb-3">
                     <div className="flex items-center gap-2">
                       <FileText className="h-4 w-4 text-primary" />
                       <CardTitle className="text-base font-semibold">Membership & Other Information</CardTitle>
                     </div>
                   </CardHeader>
                   <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div className="space-y-2">
                       <Label>Member Category *</Label>
                       <Select 
                         value={memberFormData.category_id?.toString() || ''} 
                         onValueChange={(value) => {
                           setMemberFormData({...memberFormData, category_id: value ? parseInt(value) : undefined});
                           setSelectedOfferIds([]); // Reset selected offers when category changes
                         }}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Select category (default: Member)" />
                         </SelectTrigger>
                         <SelectContent>
                           {categories.map((cat) => (
                             <SelectItem key={cat.id} value={cat.id.toString()}>
                               {cat.name}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                     
                     <div className="space-y-2">
                       <Label>Registration Date *</Label>
                       <Input 
                         type="date"
                         value={memberFormData.registeredDate || ''} 
                         onChange={(e) => setMemberFormData({...memberFormData, registeredDate: e.target.value})}
                       />
                     </div>
                     
                     <div className="space-y-2">
                       <Label>Renewal Date *</Label>
                       <Input 
                         type="date"
                         value={memberFormData.renewDate || ''} 
                         onChange={(e) => setMemberFormData({...memberFormData, renewDate: e.target.value})}
                       />
                     </div>

                     <div className="space-y-2">
                       <Label htmlFor="managerName">Manager Name</Label>
                       <Input
                         id="managerName"
                         value={companyFormData.manager_name}
                         onChange={(e) => setCompanyFormData({...companyFormData, manager_name: e.target.value})}
                         placeholder="Enter manager name"
                       />
                     </div>

                     
                   </CardContent>
                 </Card>
               </div>

                {/* Member Category Benefits Subsection */}
                {memberFormData.category_id && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                      <h4 className="font-semibold text-sm">Benefits for {categories.find(c => c.id === memberFormData.category_id)?.name || 'Selected Category'}</h4>
                    </div>
                    
                    {/* Discount Policy Benefit */}
                    <div className="space-y-3 p-2.5 bg-background rounded border border-border/50">
                      <div className="flex items-start gap-3">
                        <Checkbox 
                          id="discount-benefit"
                          checked={discountEnabled}
                          onCheckedChange={(checked) => setDiscountEnabled(checked as boolean)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <Label htmlFor="discount-benefit" className="text-sm font-medium cursor-pointer">
                            Discount Policy *
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Enable discount redemption for this member
                          </p>
                        </div>
                      </div>
                      
                      {discountEnabled && (
                        <div className="ml-7 grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/30">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Discount Policy Type *</Label>
                            <Select 
                              value={memberFormData.discountPolicy || ''} 
                              onValueChange={(value) => setMemberFormData({...memberFormData, discountPolicy: value, discountAmount: ''})}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select policy type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                <SelectItem value="fixed">Fixed Amount (LKR)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label className="text-xs">Discount Amount *</Label>
                            <div className="relative">
                              <Input 
                                type="number"
                                min="0"
                                max={memberFormData.discountPolicy === 'percentage' ? 100 : undefined}
                                step={memberFormData.discountPolicy === 'percentage' ? '0.01' : '1'}
                                className="h-9 pr-12"
                                value={memberFormData.discountAmount || ''} 
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Enforce max 100 for percentage
                                  if (memberFormData.discountPolicy === 'percentage' && parseFloat(value) > 100) {
                                    setMemberFormData({...memberFormData, discountAmount: '100'});
                                  } else {
                                    setMemberFormData({...memberFormData, discountAmount: value});
                                  }
                                }}
                                placeholder={memberFormData.discountPolicy === 'percentage' ? '10' : '1000'}
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                                {memberFormData.discountPolicy === 'percentage' ? '%' : 'LKR'}
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {memberFormData.discountPolicy === 'percentage' ? 'Enter value 0-100' : 'Enter amount in Sri Lankan Rupees'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Category Offers */}
                    {categoryOffers.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Physical Offers:</p>
                        <div className="space-y-1.5">
                          {categoryOffers.map((offer) => (
                            <div key={offer.id} className="flex items-start gap-2.5 p-2.5 bg-background rounded border border-border/50 hover:border-primary/30 transition-colors">
                              <Checkbox 
                                id={`offer-${offer.id}`}
                                checked={selectedOfferIds.includes(offer.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedOfferIds([...selectedOfferIds, offer.id]);
                                  } else {
                                    setSelectedOfferIds(selectedOfferIds.filter(id => id !== offer.id));
                                  }
                                }}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <Label htmlFor={`offer-${offer.id}`} className="text-sm font-medium cursor-pointer">
                                  {offer.name}
                                </Label>
                                {offer.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{offer.description}</p>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Valid: {new Date(offer.valid_from).toLocaleDateString()} - {new Date(offer.valid_to).toLocaleDateString()}
                                </p>
                                {(offer.min_bill_value || offer.max_discount_amount) && (
                                  <div className="mt-1.5 p-1.5 bg-accent/50 rounded text-[10px] space-y-0.5">
                                    <p className="font-medium text-foreground">Discount Policy:</p>
                                    {offer.min_bill_value && (
                                      <p className="text-muted-foreground">• Min. Bill: Rs. {offer.min_bill_value.toLocaleString()}</p>
                                    )}
                                    {offer.max_discount_amount && (
                                      <p className="text-muted-foreground">• Max. Discount: Rs. {offer.max_discount_amount.toLocaleString()}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {categoryOffers.length === 0 && (
                      <p className="text-xs text-muted-foreground italic p-2.5 bg-background rounded border border-border/50">
                        No physical offers available for this category yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  handleClearCompany();
                }}
                disabled={loading}
              >
                Clear Form
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  memberFormData.id ? 'Update Member' : 'Register Member'
                )}
              </Button>
            </div>
          </form>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="registered-members" className="mt-6">
          {/* Registered Members List */}
          <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif">Registered Members</CardTitle>
            </div>
            <CardDescription>
              View and manage all registered members
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2 shrink-0 self-start sm:self-auto"
            onClick={() => setBulkUploadOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Bulk Upload Members
          </Button>
        </CardHeader>
        <CardContent>
          <StaffList 
            isReload={isReload}
            selectedCompanyId={selectedCompany?.id}
            onEdit={handleEditStaff}
            onDelete={handleDeleteStaff}
            />
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkUploadOpen} onOpenChange={(open) => {
        setBulkUploadOpen(open);
        if (!open) {
          setUploadFile(null);
        }
      }}>
        <DialogContent className="sm:max-w-md flex flex-col p-6 gap-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Bulk Upload Member Details
            </DialogTitle>
            <DialogDescription className="text-sm">
              Upload an Excel file containing member details.
            </DialogDescription>
          </DialogHeader>

            <div className="space-y-4">
              {/* {selectedCompany?.id ? (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-700 dark:text-blue-400 text-xs">
                  Uploading members under company: <span className="font-semibold">{selectedCompany.name}</span>. (Or specify company details per row in Excel to route to other companies).
                </div>
              ) : (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-400 text-xs">
                  No company selected. Your Excel file must include the **Company Name** column to automatically find or register companies.
                </div>
              )} */}

              <div className="space-y-2">
                <Label htmlFor="upload-category">Member Category *</Label>
                <Select
                  value={uploadCategoryId}
                  onValueChange={setUploadCategoryId}
                >
                  <SelectTrigger id="upload-category" className="w-full">
                    <SelectValue placeholder="Select category for uploaded members" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 border border-dashed rounded-lg bg-muted/20 flex flex-col items-center justify-center gap-2 text-center">
                <p className="text-xs text-muted-foreground">
                  Need a template? Download our sample Excel layout.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadSampleExcel}
                  className="gap-1.5"
                >
                  <FileText className="h-4 w-4 text-green-600" />
                  Download Sample Template
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="upload-file">Choose Excel File *</Label>
                <Input
                  id="upload-file"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
                {uploadFile && (
                  <p className="text-xs text-green-600 font-medium">
                    Selected file: {uploadFile.name}
                  </p>
                )}
              </div>

              <DialogFooter className="pt-2 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBulkUploadOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleBulkSubmit}
                  disabled={isUploading || !uploadCategoryId || !uploadFile}
                  className="gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload Members
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyRegistration;
