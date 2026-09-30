import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Eye, FileSearch, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { applicationApi, getUploadUrl, ApplicationStatus, OwnerApplication } from '@/services/applicationApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const statusLabels: Record<ApplicationStatus | 'all', string> = {
  pending: 'Pending', verified: 'Verified', rejected: 'Rejected', all: 'All statuses',
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

  const decide = async (nextStatus: Exclude<ApplicationStatus, 'pending'>) => {
    if (!selected || !message.trim()) return toast.error('Add an admin note before continuing.');
    try {
      await applicationApi.updateStatus(selected.id, nextStatus, message.trim());
      toast.success(`Member ${nextStatus === 'verified' ? 'approved' : 'rejected'}.`);
      setSelected(null);
      setMessage('');
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update verification status.');
    }
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-xl font-semibold text-[#173528]">Verify users</h2><p className="text-sm text-muted-foreground">Review Land Cruiser registrations before activating membership access.</p></div><Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button></div>
      <Card><CardHeader className="pb-3"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><CardTitle className="text-base">Verification requests</CardTitle><div className="flex flex-col gap-2 sm:flex-row"><form onSubmit={submitSearch} className="flex gap-2"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, mobile, email or code" className="w-full sm:w-72" /><Button type="submit" variant="outline">Search</Button></form><select value={status} onChange={(event) => { setStatus(event.target.value as ApplicationStatus | 'all'); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-3">Member</th><th className="px-3 py-3">Contact</th><th className="px-3 py-3">Vehicle</th><th className="px-3 py-3">Submitted</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="px-3 py-12 text-center text-muted-foreground"><RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" />Loading verification requests...</td></tr> : applications.length ? applications.map((application) => <tr key={application.id} className="border-b last:border-0"><td className="px-3 py-3 font-semibold">{fullName(application)}<span className="block font-mono text-xs text-muted-foreground">{application.member_code || application.id}</span></td><td className="px-3 py-3">{application.mobile}<span className="block text-xs text-muted-foreground">{application.email || 'No email'}</span></td><td className="px-3 py-3">{application.vehicle_model || 'Toyota Land Cruiser'}<span className="block text-xs text-muted-foreground">Year: {application.vehicle_year || 'Not provided'}</span></td><td className="px-3 py-3 text-muted-foreground">{application.created_at ? new Date(application.created_at).toLocaleDateString() : '—'}</td><td className="px-3 py-3"><Badge variant={application.verification_status === 'verified' ? 'default' : application.verification_status === 'rejected' ? 'destructive' : 'outline'}>{statusLabels[application.verification_status]}</Badge></td><td className="px-3 py-3 text-right"><Button size="sm" variant="outline" onClick={() => { setSelected(application); setMessage(application.admin_note || ''); }}><Eye className="mr-2 h-4 w-4" />Review</Button></td></tr>) : <tr><td colSpan={6} className="px-3 py-12 text-center text-muted-foreground"><FileSearch className="mx-auto mb-2 h-8 w-8 opacity-40" />No verification requests found.</td></tr>}</tbody></table></div><div className="mt-4 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><Button size="sm" variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div></CardContent></Card>
      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) { setSelected(null); setMessage(''); } }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {selected && <>
            <DialogHeader>
              <DialogTitle>Review application: {fullName(selected)}</DialogTitle>
              <DialogDescription>Review the owner and vehicle details, then approve or reject this application.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
                  <dt className="font-semibold">Mobile</dt><dd>{selected.mobile}</dd>
                  <dt className="font-semibold">Email</dt><dd className="break-all">{selected.email || 'Not provided'}</dd>
                  <dt className="font-semibold">Address</dt><dd>{selected.address || 'Not provided'}</dd>
                  <dt className="font-semibold">Vehicle</dt><dd>{selected.vehicle_model || 'Toyota Land Cruiser'}</dd>
                  <dt className="font-semibold">Year</dt><dd>{selected.vehicle_year || 'Not provided'}</dd>
                  <dt className="font-semibold">Member code</dt><dd className="font-mono">{selected.member_code || 'Not assigned'}</dd>
                </dl>
                <div>
                  <p className="mb-2 text-sm font-semibold">Vehicle photos</p>
                  <div className="grid grid-cols-3 gap-2">{(selected.vehicle_images || []).map((image, index) => <img key={`${typeof image === 'string' ? image : image.url || image.path || index}`} src={getUploadUrl(image)} alt={`Submitted vehicle ${index + 1}`} className="aspect-square rounded-sm object-cover" onError={(event) => { const imageElement = event.currentTarget; if (!imageElement.src.includes('/api/uploads/')) imageElement.src = imageElement.src.replace('/uploads/', '/api/uploads/'); }} />)}</div>
                  {!selected.vehicle_images?.length && <p className="text-sm text-muted-foreground">No vehicle photos submitted.</p>}
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="review-message">Admin note / feedback</Label>
                <Textarea id="review-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explain the approval or rejection reason. This note is sent to the customer by the backend." rows={6} />
                <div className="flex flex-wrap justify-end gap-2 pt-2"><Button onClick={() => decide('verified')} className="bg-[#2d7a50] hover:bg-[#246340]"><Check className="mr-2 h-4 w-4" />Approve</Button><Button onClick={() => decide('rejected')} variant="destructive">Reject</Button></div>
              </div>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationReview;
