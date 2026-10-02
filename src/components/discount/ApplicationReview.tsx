import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Eye, FileSearch, RefreshCw, Clock, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { applicationApi, getUploadUrl, ApplicationStatus, OwnerApplication } from '@/services/applicationApi';
import { categoryApi } from '@/services/categoryApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const statusLabels: Record<ApplicationStatus | 'all', string> = {
  pending: 'Pending',
  processing: 'Processing / In Review',
  verified: 'Verified',
  rejected: 'Rejected',
  all: 'All statuses',
};

const fullName = (application: OwnerApplication) => `${application.first_name} ${application.last_name || ''}`.trim();

const ApplicationReview = () => {
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('pending');
  const [applications, setApplications] = useState<OwnerApplication[]>([]);
  const [selected, setSelected] = useState<OwnerApplication | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    categoryApi.getCategories().then((cats) => {
      setCategories(cats || []);
    }).catch((err) => {
      console.error('Failed to load categories:', err);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await applicationApi.getApplications({ status, page, limit: 10, search: search.trim() });
      setApplications(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load verification requests.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  const handleOpenReview = (application: OwnerApplication) => {
    setSelected(application);
    setMessage(application.admin_note || '');
    setSelectedCategoryId(application.category_id || categories.find(c => c.name.toLowerCase().includes('land cruiser'))?.id || categories[0]?.id);
  };

  const decide = async (nextStatus: 'verified' | 'rejected') => {
    if (!selected) return;
    if (nextStatus === 'rejected' && !message.trim()) {
      return toast.error('Add an admin note explaining the rejection reason.');
    }
    setActionLoading(true);
    try {
      await applicationApi.updateStatus(selected.id, nextStatus, message.trim(), selectedCategoryId);
      toast.success(`Member ${nextStatus === 'verified' ? 'approved' : 'rejected'} successfully.`);
      setSelected(null);
      setMessage('');
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update verification status.');
    } finally {
      setActionLoading(false);
    }
  };

  const saveAsProcessing = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await applicationApi.updateStatus(selected.id, 'processing', message.trim(), selectedCategoryId);
      toast.success('Changes saved. Application status marked as processing.');
      setSelected(null);
      setMessage('');
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save changes.');
    } finally {
      setActionLoading(false);
    }
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    load();
  };

  const getStatusBadge = (s: ApplicationStatus) => {
    switch (s) {
      case 'verified':
        return <Badge className="bg-[#2d7a50] text-white">Verified</Badge>;
      case 'processing':
        return <Badge className="bg-sky-600 text-white">Processing</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-[#173528]">Verify users</h2>
          <p className="text-sm text-muted-foreground">Review Land Cruiser registrations before activating membership access.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base">Verification requests</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <form onSubmit={submitSearch} className="flex gap-2">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, mobile, vehicle or district"
                  className="w-full sm:w-72"
                />
                <Button type="submit" variant="outline">Search</Button>
              </form>
              <select
                value={status}
                onChange={(event) => { setStatus(event.target.value as ApplicationStatus | 'all'); setPage(1); }}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-3">Member</th>
                  <th className="px-3 py-3">Contact &amp; District</th>
                  <th className="px-3 py-3">Vehicle Details</th>
                  <th className="px-3 py-3">Submitted</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-muted-foreground">
                      <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" />Loading verification requests...
                    </td>
                  </tr>
                ) : applications.length ? (
                  applications.map((application) => (
                    <tr key={application.id} className="border-b last:border-0 hover:bg-slate-50/60">
                      <td className="px-3 py-3 font-semibold">
                        {fullName(application)}
                        <span className="block font-mono text-xs text-muted-foreground">{application.member_code || application.id}</span>
                      </td>
                      <td className="px-3 py-3">
                        {application.mobile}
                        <span className="block text-xs text-muted-foreground">{application.district ? `District: ${application.district}` : (application.email || 'No email')}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-medium">{application.vehicle_model || 'Toyota Land Cruiser'}</span>
                        <span className="block text-xs text-muted-foreground">
                          Year: {application.vehicle_year || '—'} {application.vehicle_number ? `· Plate: ${application.vehicle_number}` : ''}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {application.created_at ? new Date(application.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-3">
                        {getStatusBadge(application.verification_status)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => handleOpenReview(application)}>
                          <Eye className="mr-2 h-4 w-4" />Review
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-muted-foreground">
                      <FileSearch className="mx-auto mb-2 h-8 w-8 opacity-40" />No verification requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" />Previous
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>
                Next<ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) { setSelected(null); setMessage(''); } }}>
        <DialogContent className="max-h-[92vh] w-[95vw] sm:w-[92vw] md:max-w-4xl lg:max-w-5xl overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {selected && (
            <>
              <DialogHeader className="pb-3 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
                  <div>
                    <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      Review application: {fullName(selected)}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Review owner, district, and Land Cruiser details, choose membership tier, and approve or update status.
                    </DialogDescription>
                  </div>
                  <div className="self-start sm:self-auto">{getStatusBadge(selected.verification_status)}</div>
                </div>
              </DialogHeader>

              <div className="grid gap-5 lg:grid-cols-2 items-start pt-2">
                {/* Left Column: Applicant Details & Photos */}
                <div className="space-y-4">
                  <div className="rounded-lg border bg-slate-50/80 p-3.5 sm:p-4 shadow-sm dark:bg-slate-900/40">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center justify-between">
                      <span>Applicant &amp; Vehicle Details</span>
                      <span className="text-[11px] font-mono text-slate-400">ID: {selected.id}</span>
                    </h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-x-4 gap-y-2 text-sm">
                      <dt className="font-semibold text-slate-600 dark:text-slate-300">Mobile</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100">{selected.mobile}</dd>

                      <dt className="font-semibold text-slate-600 dark:text-slate-300">Email</dt>
                      <dd className="break-all text-slate-900 dark:text-slate-100">{selected.email || 'Not provided'}</dd>

                      <dt className="font-semibold text-slate-600 dark:text-slate-300">District</dt>
                      <dd className="font-semibold text-[#173528] dark:text-emerald-400">{selected.district || 'Not provided'}</dd>

                      <dt className="font-semibold text-slate-600 dark:text-slate-300">Address</dt>
                      <dd className="text-slate-800 dark:text-slate-200">{selected.address || 'Not provided'}</dd>

                      <dt className="font-semibold text-slate-600 dark:text-slate-300">Vehicle Model</dt>
                      <dd className="font-semibold text-[#173528] dark:text-emerald-400">{selected.vehicle_model || 'Toyota Land Cruiser'}</dd>

                      <dt className="font-semibold text-slate-600 dark:text-slate-300">Vehicle Year</dt>
                      <dd className="text-slate-900 dark:text-slate-100">{selected.vehicle_year || 'Not provided'}</dd>

                      <dt className="font-semibold text-slate-600 dark:text-slate-300">Vehicle Number</dt>
                      <dd className="font-mono font-bold text-slate-900 dark:text-slate-100">{selected.vehicle_number || 'Not provided'}</dd>

                      <dt className="font-semibold text-slate-600 dark:text-slate-300">Member code</dt>
                      <dd className="font-mono font-bold text-[#b51f2b] dark:text-rose-400">{selected.member_code || 'Not assigned yet'}</dd>
                    </dl>
                  </div>

                  <div className="rounded-lg border bg-white p-3.5 sm:p-4 shadow-sm dark:bg-slate-900/40">
                    <p className="mb-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>Vehicle photos</span>
                      <span className="text-xs font-normal text-muted-foreground">({selected.vehicle_images?.length || 0}) submitted</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {(selected.vehicle_images || []).map((image, index) => (
                        <a
                          key={`${typeof image === 'string' ? image : image.url || image.path || index}`}
                          href={getUploadUrl(image)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative aspect-square overflow-hidden rounded-md border bg-slate-100 dark:bg-slate-800 hover:ring-2 hover:ring-[#173528]/50 transition-all"
                        >
                          <img
                            src={getUploadUrl(image)}
                            alt={`Submitted vehicle ${index + 1}`}
                            className="aspect-square w-full h-full object-cover transition-transform group-hover:scale-105"
                            onError={(event) => {
                              const imageElement = event.currentTarget;
                              if (!imageElement.src.includes('/api/uploads/')) {
                                imageElement.src = imageElement.src.replace('/uploads/', '/api/uploads/');
                              }
                            }}
                          />
                        </a>
                      ))}
                    </div>
                    {!selected.vehicle_images?.length && (
                      <p className="text-sm text-muted-foreground py-2">No vehicle photos submitted.</p>
                    )}
                  </div>
                </div>

                {/* Right Column: Membership Tier, Note & Action Buttons */}
                <div className="space-y-4 flex flex-col justify-between h-full">
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-slate-50/60 p-3.5 sm:p-4 shadow-sm dark:bg-slate-900/30 space-y-2">
                      <Label htmlFor="membership-tier" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Membership Tier / Category
                      </Label>
                      <Select
                        value={selectedCategoryId?.toString() || ''}
                        onValueChange={(val) => setSelectedCategoryId(Number(val))}
                      >
                        <SelectTrigger id="membership-tier" className="h-10 bg-white dark:bg-slate-950">
                          <SelectValue placeholder="Choose membership tier" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Select the tier to assign to this member upon approval.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="review-message" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Admin note / feedback
                      </Label>
                      <Textarea
                        id="review-message"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Add an internal reviewer note, or explain approval/rejection reasons. For rejections, this note will be included in the SMS to the applicant."
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                  </div>

                  {/* Action Buttons: Exact same width & flex row on tablet/desktop, stacked on mobile */}
                  <div className="border-t pt-4 mt-2">
                    <div className="flex flex-col sm:flex-row items-stretch gap-2.5 w-full">
                      <Button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => decide('rejected')}
                        variant="destructive"
                        className="flex-1 h-11 px-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <X className="h-4 w-4 shrink-0" />
                        <span>Reject</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={actionLoading}
                        onClick={saveAsProcessing}
                        className="flex-1 h-11 px-2.5 text-xs sm:text-sm font-semibold border-sky-600 text-sky-700 hover:bg-sky-50 dark:border-sky-500 dark:text-sky-400 dark:hover:bg-sky-950/40 flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap"
                      >
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>Save Changes (Processing)</span>
                      </Button>

                      <Button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => decide('verified')}
                        className="flex-1 h-11 px-3 text-xs sm:text-sm font-semibold bg-[#2d7a50] hover:bg-[#246340] text-white flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Check className="h-4 w-4 shrink-0" />
                        <span>Approve</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationReview;
