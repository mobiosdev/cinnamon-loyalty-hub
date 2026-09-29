import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Eye, FileSearch, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { applicationApi, getUploadUrl, ApplicationStatus, OwnerApplication } from '@/services/applicationApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
      {selected && <Card className="border-[#b8cdbd]"><CardHeader><CardTitle className="flex items-center justify-between text-base">Review {selected.member_code || fullName(selected)}<button onClick={() => setSelected(null)} aria-label="Close review"><X className="h-5 w-5" /></button></CardTitle></CardHeader><CardContent className="grid gap-6 lg:grid-cols-[1fr_1.2fr]"><div className="space-y-3 text-sm"><p><strong>Owner:</strong> {fullName(selected)}</p><p><strong>Mobile:</strong> {selected.mobile}</p><p><strong>Email:</strong> {selected.email || 'Not provided'}</p><p><strong>Address:</strong> {selected.address || 'Not provided'}</p><p><strong>Vehicle:</strong> {selected.vehicle_model || 'Toyota Land Cruiser'}, {selected.vehicle_year || 'Year not provided'}</p><div className="grid grid-cols-3 gap-2">{(selected.vehicle_images || []).map((image, index) => <img key={`${typeof image === 'string' ? image : image.url || image.path || index}`} src={getUploadUrl(image)} alt={`Submitted vehicle ${index + 1}`} className="aspect-square rounded-sm object-cover" onError={(event) => { const imageElement = event.currentTarget; if (!imageElement.src.includes('/api/uploads/')) imageElement.src = imageElement.src.replace('/uploads/', '/api/uploads/'); }} />)}</div></div><div className="space-y-3"><Label htmlFor="review-message">Admin note / feedback</Label><Textarea id="review-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explain the approval or rejection reason. This note is sent to the customer by the backend." rows={5} /><div className="flex flex-wrap gap-2"><Button onClick={() => decide('verified')} className="bg-[#2d7a50] hover:bg-[#246340]"><Check className="mr-2 h-4 w-4" />Approve</Button><Button onClick={() => decide('rejected')} variant="destructive">Reject</Button></div></div></CardContent></Card>}
    </div>
  );
};

export default ApplicationReview;
