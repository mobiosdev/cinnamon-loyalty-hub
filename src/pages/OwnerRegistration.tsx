import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, ImagePlus, LockKeyhole, ShieldCheck, Smartphone, X } from 'lucide-react';
import { applicationApi } from '@/services/applicationApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toyotaLogo from '@/assets/toyota/toyota-logo.png';
import landCruiserImage from '@/assets/toyota/lc-img1.jpg';

type RegistrationStep = 'mobile' | 'otp' | 'details' | 'complete';

const OwnerRegistration = () => {
  const [step, setStep] = useState<RegistrationStep>('mobile');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [memberCode, setMemberCode] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', mobile: '', email: '', address: '',
    vehicleModel: 'Toyota Land Cruiser', vehicleYear: '', consent: false,
  });

  const update = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const requestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.mobile.trim()) return toast.error('Enter your mobile number to continue.');
    setLoading(true);
    try {
      await applicationApi.requestOtp(form.mobile.trim());
      setOtp('');
      setStep('otp');
      toast.success('Verification code sent to your mobile number.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyMobile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the complete 6-digit verification code.');
    setLoading(true);
    try {
      const result = await applicationApi.verifyOtp(form.mobile.trim(), otp);
      if (!result.verified) throw new Error(result.message || 'Mobile verification failed.');
      setStep('details');
      toast.success('Mobile number verified. Complete your registration below.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    if (incoming.some((file) => !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024)) {
      return toast.error('Each vehicle image must be smaller than 5 MB.');
    }
    if (photos.length + incoming.length > 5) return toast.error('You can upload a maximum of five vehicle images.');
    setPhotos((current) => [...current, ...incoming]);
  };

  const submitRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    if (photos.length < 3) return toast.error('Upload at least three vehicle images.');
    if (!form.consent) return toast.error('Please accept the programme terms and accuracy declaration.');
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('mobile', form.mobile.trim());
      payload.append('otp', otp);
      payload.append('first_name', form.firstName.trim());
      payload.append('last_name', form.lastName.trim());
      payload.append('email', form.email.trim());
      payload.append('address', form.address.trim());
      payload.append('vehicle_model', form.vehicleModel.trim());
      payload.append('vehicle_year', form.vehicleYear.trim());
      photos.forEach((photo) => payload.append('vehicle_images', photo));

      const result = await applicationApi.submit(payload);
      setMemberCode(result.member_code);
      setResultMessage(result.message);
      try {
        const currentStatus = await applicationApi.getStatus(form.mobile.trim());
        setMemberCode(currentStatus.member_code || result.member_code);
        setResultMessage(currentStatus.admin_note ? `${currentStatus.message} ${currentStatus.admin_note}` : currentStatus.message);
      } catch {
        // The submission response remains the confirmation fallback.
      }
      setStep('complete');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit your registration.');
    } finally {
      setLoading(false);
    }
  };

  const title = step === 'complete' ? 'Registration received' : step === 'details' ? 'Join the programme' : step === 'otp' ? 'Verify your mobile' : 'Start with your mobile';
  const description = step === 'complete' ? 'Keep your member code for future reference.' : step === 'details' ? 'Tell us about yourself and your Land Cruiser.' : step === 'otp' ? `Enter the code sent to ${form.mobile}.` : 'We will verify your mobile number before opening the registration form.';

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-[#18251e]">
      <header className="border-b border-[#d8e0da] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><img src={toyotaLogo} alt="Toyota Lanka" className="h-9 w-auto" /><Link to="/login-member" className="flex items-center gap-2 text-sm font-semibold text-[#31543f] hover:text-[#b51f2b]"><ArrowLeft className="h-4 w-4" /> Member login</Link></div></header>
      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-14">
        <section className="relative min-h-[280px] overflow-hidden rounded-sm bg-[#173528] text-white lg:min-h-[620px]"><img src={landCruiserImage} alt="Toyota Land Cruiser" className="absolute inset-0 h-full w-full object-cover opacity-55" /><div className="absolute inset-0 bg-gradient-to-t from-[#10251c] via-[#173528]/60 to-transparent" /><div className="relative flex h-full flex-col justify-end p-7 lg:p-10"><p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#f5c54a]">Toyota Lanka</p><h1 className="max-w-md text-4xl font-semibold leading-tight lg:text-5xl">Land Cruiser Owner Loyalty</h1><p className="mt-4 max-w-md text-sm leading-6 text-white/80">Apply for your digital membership and unlock benefits created for the Land Cruiser community.</p></div></section>
        <Card className="rounded-sm border-[#d8e0da] shadow-sm"><CardHeader className="border-b border-[#e5ebe6] bg-white"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#b51f2b]"><ShieldCheck className="h-4 w-4" /> Secure owner registration</div><CardTitle className="text-2xl text-[#173528]">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="p-6 lg:p-8">
          {step === 'mobile' && <form onSubmit={requestOtp} className="space-y-6"><div className="rounded-sm bg-[#eef5ef] p-5"><Smartphone className="mb-3 h-8 w-8 text-[#31543f]" /><Label htmlFor="mobile">Mobile number</Label><Input id="mobile" type="tel" value={form.mobile} onChange={(event) => update('mobile', event.target.value)} required placeholder="07X XXX XXXX" className="mt-2 h-12" /><p className="mt-2 text-xs text-slate-500">A 6-digit OTP will be sent by SMS to verify this number.</p></div><Button disabled={loading} className="h-12 w-full bg-[#b51f2b] hover:bg-[#921923]"><LockKeyhole className="mr-2 h-4 w-4" />{loading ? 'Sending verification code...' : 'Send verification code'}</Button></form>}
          {step === 'otp' && <form onSubmit={verifyMobile} className="space-y-6"><div className="rounded-sm bg-[#eef5ef] p-5 text-center"><Smartphone className="mx-auto mb-3 h-8 w-8 text-[#31543f]" /><Label htmlFor="registration-otp">6-digit verification code</Label><Input id="registration-otp" inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} className="mx-auto mt-3 h-14 max-w-xs text-center text-2xl font-bold tracking-[0.5em]" /></div><Button disabled={loading || otp.length !== 6} className="h-12 w-full bg-[#b51f2b] hover:bg-[#921923]">{loading ? 'Verifying mobile...' : 'Verify mobile & continue'}</Button><div className="flex justify-between text-sm"><button type="button" onClick={() => setStep('mobile')} className="font-semibold text-[#31543f]">Change mobile</button><button type="button" onClick={requestOtp} disabled={loading} className="font-semibold text-[#b51f2b]">Resend code</button></div></form>}
          {step === 'details' && <form onSubmit={submitRegistration} className="space-y-5"><div className="rounded-sm border border-[#b8cdbd] bg-[#f7faf7] p-3 text-sm text-[#31543f]"><CheckCircle2 className="mr-2 inline h-4 w-4" />Mobile verified: {form.mobile}</div><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="first-name">First name</Label><Input id="first-name" value={form.firstName} onChange={(event) => update('firstName', event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="last-name">Last name</Label><Input id="last-name" value={form.lastName} onChange={(event) => update('lastName', event.target.value)} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="email">Email address</Label><Input id="email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="address">Address</Label><Input id="address" value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="Residential or business address" /></div><div className="space-y-2"><Label htmlFor="vehicle-model">Vehicle model</Label><Input id="vehicle-model" value={form.vehicleModel} onChange={(event) => update('vehicleModel', event.target.value)} /></div><div className="space-y-2"><Label htmlFor="vehicle-year">Vehicle year</Label><Input id="vehicle-year" value={form.vehicleYear} onChange={(event) => update('vehicleYear', event.target.value)} required placeholder="e.g. 2023" /></div></div><div><Label>Vehicle images <span className="font-normal text-slate-500">(3 to 5, max 5 MB each)</span></Label><div className="mt-2 grid grid-cols-3 gap-3">{photos.map((photo, index) => <div key={`${photo.name}-${index}`} className="relative aspect-square overflow-hidden rounded-sm border border-[#cbd8ce] bg-[#f4f6f5]"><img src={URL.createObjectURL(photo)} alt={`Vehicle view ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))} className="absolute right-1 top-1 rounded-full bg-white p-1 text-[#b51f2b]"><X className="h-3 w-3" /></button></div>)}{photos.length < 5 && <button type="button" onClick={() => fileInput.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-[#9eb4a3] bg-[#f7faf7] text-xs font-semibold text-[#31543f]"><ImagePlus className="h-6 w-6" />Add image</button>}</div><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => addPhotos(event.target.files)} /><p className="mt-2 text-xs text-slate-500">Upload clear exterior views of your Land Cruiser.</p></div><label className="flex gap-3 text-sm leading-5"><input type="checkbox" checked={form.consent} onChange={(event) => update('consent', event.target.checked)} className="mt-1 accent-[#b51f2b]" />I confirm that the information and vehicle details provided are accurate, and I accept the Toyota Lanka programme terms.</label><Button disabled={loading} className="h-12 w-full bg-[#b51f2b] hover:bg-[#921923]"><LockKeyhole className="mr-2 h-4 w-4" />{loading ? 'Submitting registration...' : 'Submit registration'}</Button></form>}
          {step === 'complete' && <div className="space-y-6 py-8 text-center"><CheckCircle2 className="mx-auto h-16 w-16 text-[#2d7a50]" /><div><p className="text-sm text-slate-500">Your member code</p><p className="mt-2 text-3xl font-bold tracking-wider text-[#173528]">{memberCode}</p></div><p className="text-sm leading-6 text-slate-600">{resultMessage || 'Your registration is pending admin verification. You will receive an update on your registered mobile number.'}</p><Link to="/login-member"><Button className="bg-[#b51f2b] hover:bg-[#921923]">Go to member login</Button></Link></div>}
        </CardContent></Card>
      </main>
    </div>
  );
};

export default OwnerRegistration;
