import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, ImagePlus, LockKeyhole, ShieldCheck, Smartphone, X } from 'lucide-react';
import { applicationApi } from '@/services/applicationApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DistrictSelect } from '@/components/common/DistrictSelect';
import { VehicleModelSelect } from '@/components/common/VehicleModelSelect';
import toyotaLogo from '@/assets/toyota/toyota-logo.png';
import landCruiserImage1 from '@/assets/toyota/lc-img1.jpg';
import landCruiserImage2 from '@/assets/toyota/lc-img2.jpg';
import landCruiserImage3 from '@/assets/toyota/lc-img3.jpg';
import { compressImages } from '@/utils/imageCompressor';

type RegistrationStep = 'mobile' | 'otp' | 'details' | 'complete';
const landCruiserImages = [landCruiserImage1, landCruiserImage2, landCruiserImage3];

const OwnerRegistration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<RegistrationStep>('mobile');
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const otp = otpDigits.join('');
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    address: '',
    district: '',
    vehicleModel: 'Toyota Land Cruiser 300 Series (LC300)',
    vehicleYear: '',
    vehicleNumber: '',
    consent: false,
  });

  const update = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    if (step !== 'mobile' && step !== 'otp') return;
    const carouselTimer = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % landCruiserImages.length);
    }, 5000);
    return () => window.clearInterval(carouselTimer);
  }, [step]);

  useEffect(() => {
    if (step === 'otp') otpInputRefs.current[0]?.focus();
  }, [step]);

  const requestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.mobile.trim()) return toast.error('Enter your mobile number to continue.');
    setLoading(true);
    try {
      await applicationApi.requestOtp(form.mobile.trim());
      setOtpDigits(Array(6).fill(''));
      setStep('otp');
      toast.success('Verification code sent to your mobile number.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyMobileCode = async (code: string) => {
    if (code.length !== 6 || loading) return;
    setLoading(true);
    try {
      const result = await applicationApi.verifyOtp(form.mobile.trim(), code);
      if (!result.verified) throw new Error(result.message || 'Mobile verification failed.');
      setStep('details');
      toast.success('Mobile number verified. Complete your registration below.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyMobile = (event: React.FormEvent) => {
    event.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the complete 6-digit verification code.');
    void verifyMobileCode(otp);
  };

  const updateOtpDigit = (index: number, value: string) => {
    if (loading) return;
    const digits = value.replace(/\D/g, '');
    const next = [...otpDigits];
    if (digits.length > 1) {
      digits.slice(0, 6 - index).split('').forEach((digit, offset) => { next[index + offset] = digit; });
    } else {
      next[index] = digits;
    }
    setOtpDigits(next);
    const nextEmptyIndex = next.findIndex((digit) => !digit);
    if (nextEmptyIndex >= 0) otpInputRefs.current[nextEmptyIndex]?.focus();
    if (next.every(Boolean)) void verifyMobileCode(next.join(''));
  };

  const [compressing, setCompressing] = useState(false);

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    const validImages = incoming.filter((file) => file.type.startsWith('image/'));
    if (validImages.length === 0) {
      return toast.error('Please select image files (JPEG, PNG, WebP).');
    }
    if (photos.length + validImages.length > 5) {
      return toast.error('You can upload a maximum of 5 vehicle images.');
    }

    setCompressing(true);
    const toastId = toast.loading('Optimizing vehicle images for fast, high-quality upload...');
    try {
      const optimized = await compressImages(validImages);
      setPhotos((current) => [...current, ...optimized]);
      toast.success(`${optimized.length} image${optimized.length > 1 ? 's' : ''} optimized and attached!`, { id: toastId });
    } catch (err) {
      console.error('Failed to compress images:', err);
      setPhotos((current) => [...current, ...validImages]);
      toast.dismiss(toastId);
    } finally {
      setCompressing(false);
    }
  };

  const submitRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.district.trim()) return toast.error('Please select your district in Sri Lanka.');
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
      payload.append('address', form.district.trim());
      payload.append('district', form.district.trim());
      payload.append('vehicle_model', form.vehicleModel.trim());
      payload.append('vehicle_year', form.vehicleYear.trim());
      payload.append('vehicle_number', form.vehicleNumber.trim());
      photos.forEach((photo) => payload.append('vehicle_images', photo));

      await applicationApi.submit(payload);
      setStep('complete');
      toast.success('Registration request submitted successfully. You will be contacted soon.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit your registration.');
    } finally {
      setLoading(false);
    }
  };

  const title = step === 'complete' ? 'Request Submitted' : step === 'details' ? 'Join the programme' : step === 'otp' ? 'Verify your mobile' : 'Start your application';
  const description = step === 'complete' ? 'Your application has been received and is being processed.' : step === 'details' ? 'Tell us about yourself and your Land Cruiser.' : step === 'otp' ? `Enter the code sent to ${form.mobile}.` : 'We will verify your mobile number before opening the registration form.';
  const hasCarousel = step === 'mobile' || step === 'otp';

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-[#18251e]">
      <header className="border-b border-[#d8e0da] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3"><img src={toyotaLogo} alt="Toyota Lanka" className="h-8 w-auto" /><Link to="/login-member" className="flex items-center gap-2 text-sm font-semibold text-[#31543f] hover:text-[#b51f2b]"><ArrowLeft className="h-4 w-4" /> Member login</Link></div></header>
      <main className={`mx-auto grid w-full items-center gap-3 px-4 py-2 sm:px-6 ${hasCarousel ? 'max-w-7xl lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:py-8' : 'min-h-[calc(100svh-3.75rem)] max-w-xl'}`}>
        {hasCarousel && <section className="relative h-[130px] overflow-hidden rounded-sm bg-[#173528] text-white sm:h-[190px] lg:h-[620px]">
          {landCruiserImages.map((image, index) => <img key={image} src={image} alt={`Toyota Land Cruiser view ${index + 1}`} aria-hidden={activeImage !== index} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${activeImage === index ? 'opacity-60' : 'opacity-0'}`} />)}
          <div className="absolute inset-0 bg-gradient-to-t from-[#10251c] via-[#173528]/40 to-[#173528]/10" />
          <div className="relative flex h-full flex-col justify-end p-4 sm:p-6 lg:p-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f5c54a] lg:text-xs">Toyota Lanka</p>
            <h1 className="mt-1 text-xl font-semibold leading-tight sm:text-2xl lg:mt-3 lg:text-5xl">Land Cruiser Owner Loyalty</h1>
            <p className="mt-3 hidden max-w-md text-sm leading-6 text-white/85 lg:block">Apply for your digital membership and unlock benefits created for the Land Cruiser community.</p>
            <div className="mt-2 flex items-center justify-between lg:mt-8">
              <span className="text-[10px] font-medium tracking-wide text-white/85 lg:text-xs">LAND CRUISER {String(activeImage + 1).padStart(2, '0')} / 03</span>
              <div className="flex items-center gap-1.5" aria-label="Land Cruiser image carousel controls">
                <Button type="button" variant="outline" size="icon" aria-label="Previous vehicle image" onClick={() => setActiveImage((current) => (current + landCruiserImages.length - 1) % landCruiserImages.length)} className="h-7 w-7 border-white/50 bg-black/20 text-white hover:bg-white/20 hover:text-white lg:h-9 lg:w-9"><ChevronLeft className="h-4 w-4" /></Button>
                {landCruiserImages.map((_, index) => <button key={index} type="button" aria-label={`Show vehicle image ${index + 1}`} aria-current={activeImage === index ? 'true' : undefined} onClick={() => setActiveImage(index)} className={`h-2 rounded-full transition-all ${activeImage === index ? 'w-5 bg-[#f5c54a]' : 'w-2 bg-white/60 hover:bg-white'}`} />)}
                <Button type="button" variant="outline" size="icon" aria-label="Next vehicle image" onClick={() => setActiveImage((current) => (current + 1) % landCruiserImages.length)} className="h-7 w-7 border-white/50 bg-black/20 text-white hover:bg-white/20 hover:text-white lg:h-9 lg:w-9"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </section>}
        <Card className="w-full rounded-sm border-[#d8e0da] shadow-sm"><CardHeader className="border-b border-[#e5ebe6] bg-white p-4 pb-3 sm:p-5 sm:pb-4"><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#b51f2b]"><ShieldCheck className="h-4 w-4" /> Secure owner registration</div><CardTitle className="text-2xl text-[#173528]">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="p-4 sm:p-5">
          {step === 'mobile' && <form onSubmit={requestOtp} className="space-y-4"><div className="rounded-sm border border-[#dce7de] bg-gradient-to-br from-[#f4f8f4] to-[#eef5ef] p-4 sm:p-6"><div className="mb-3 flex items-center gap-3"><div className="rounded-full bg-white p-2.5 text-[#31543f] shadow-sm"><Smartphone className="h-5 w-5" /></div><div><p className="font-semibold text-[#173528]">Your mobile number</p><p className="mt-1 text-xs text-slate-500">We will use it to verify your application.</p></div></div><Label htmlFor="mobile" className="text-sm font-semibold text-[#263d30]">Mobile number</Label><Input id="mobile" type="tel" inputMode="tel" autoComplete="tel" value={form.mobile} onChange={(event) => update('mobile', event.target.value)} required placeholder="07X XXX XXXX" className="mt-2 h-12 border-[#cbd8ce] bg-white text-lg shadow-sm placeholder:text-slate-400 focus-visible:ring-[#31543f]" /><div className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#31543f]" /><span>A one-time verification code will be sent by SMS. Your number stays private.</span></div></div><Button disabled={loading} className="h-12 w-full bg-[#b51f2b] text-base font-semibold hover:bg-[#921923]"><span>{loading ? 'Sending verification code...' : 'Continue with mobile'}</span>{loading ? <LockKeyhole className="ml-2 h-4 w-4" /> : <ArrowRight className="ml-2 h-4 w-4" />}</Button><p className="text-center text-xs text-slate-500">Already a member? <Link to="/login-member" className="font-semibold text-[#31543f] underline-offset-4 hover:underline">Sign in</Link></p></form>}
          {step === 'otp' && <form onSubmit={verifyMobile} className="space-y-4"><div className="rounded-sm bg-[#eef5ef] p-4 text-center sm:p-5"><Smartphone className="mx-auto mb-2 h-7 w-7 text-[#31543f]" /><Label id="registration-otp-label">Enter your 6-digit code</Label><div role="group" aria-labelledby="registration-otp-label" className="mx-auto mt-4 flex max-w-sm justify-center gap-2">{otpDigits.map((digit, index) => <Input key={index} ref={(element) => { otpInputRefs.current[index] = element; }} type="text" inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} aria-label={`Digit ${index + 1} of 6`} value={digit} disabled={loading} onChange={(event) => updateOtpDigit(index, event.target.value)} onPaste={(event) => { event.preventDefault(); updateOtpDigit(index, event.clipboardData.getData('text')); }} onKeyDown={(event) => { if (event.key === 'Backspace' && !digit && index > 0) { event.preventDefault(); updateOtpDigit(index - 1, ''); otpInputRefs.current[index - 1]?.focus(); } if (event.key === 'ArrowLeft' && index > 0) otpInputRefs.current[index - 1]?.focus(); if (event.key === 'ArrowRight' && index < 5) otpInputRefs.current[index + 1]?.focus(); }} className="h-12 w-10 px-0 text-center text-xl font-bold sm:h-14 sm:w-12" />)}</div><p aria-live="polite" className="mt-3 text-xs text-slate-500">{loading ? 'Verifying your number...' : 'Your number verifies automatically when all digits are entered.'}</p></div><Button type="submit" disabled={loading || otp.length !== 6} className="h-12 w-full bg-[#b51f2b] hover:bg-[#921923]">{loading ? 'Verifying mobile...' : 'Verify mobile & continue'}</Button><div className="flex justify-between text-sm"><button type="button" onClick={() => { setOtpDigits(Array(6).fill('')); setStep('mobile'); }} className="font-semibold text-[#31543f]">Change mobile</button><button type="button" onClick={requestOtp} disabled={loading} className="font-semibold text-[#b51f2b]">Resend code</button></div></form>}
          {step === 'details' && <form onSubmit={submitRegistration} className="space-y-5"><div className="rounded-sm border border-[#b8cdbd] bg-[#f7faf7] p-3 text-sm text-[#31543f]"><CheckCircle2 className="mr-2 inline h-4 w-4" />Mobile verified: {form.mobile}</div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first-name">First name *</Label>
                <Input id="first-name" value={form.firstName} onChange={(event) => update('firstName', event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last name</Label>
                <Input id="last-name" value={form.lastName} onChange={(event) => update('lastName', event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="district">District (Sri Lanka) *</Label>
                <DistrictSelect
                  id="district"
                  value={form.district}
                  onChange={(val) => update('district', val)}
                  placeholder="Search and select your district..."
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Vehicle model *</Label>
                <VehicleModelSelect
                  value={form.vehicleModel}
                  onChange={(val) => update('vehicleModel', val)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle-year">Vehicle year *</Label>
                <Input id="vehicle-year" value={form.vehicleYear} onChange={(event) => update('vehicleYear', event.target.value)} required placeholder="e.g. 2023" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle-number">Vehicle registration / plate number</Label>
                <Input id="vehicle-number" value={form.vehicleNumber} onChange={(event) => update('vehicleNumber', event.target.value)} placeholder="e.g. WP CAD-1234" />
              </div>
            </div>
            <div>
              <Label>Vehicle images <span className="font-normal text-slate-500">(3 to 5 clear exterior photos, auto-optimized)</span></Label>
              <div className="mt-2 grid grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <div key={`${photo.name}-${index}`} className="relative aspect-square overflow-hidden rounded-sm border border-[#cbd8ce] bg-[#f4f6f5]">
                    <img src={URL.createObjectURL(photo)} alt={`Vehicle view ${index + 1}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))} className="absolute right-1 top-1 rounded-full bg-white p-1 text-[#b51f2b]">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button type="button" disabled={compressing} onClick={() => fileInput.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-[#9eb4a3] bg-[#f7faf7] text-xs font-semibold text-[#31543f] disabled:opacity-50">
                    <ImagePlus className="h-6 w-6" />Add image
                  </button>
                )}
              </div>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => addPhotos(event.target.files)} />
              <p className="mt-2 text-xs text-slate-500">Upload clear exterior views of your Land Cruiser.</p>
            </div>
            <label className="flex gap-3 text-sm leading-5">
              <input type="checkbox" checked={form.consent} onChange={(event) => update('consent', event.target.checked)} className="mt-1 accent-[#b51f2b]" />
              I confirm that the information and vehicle details provided are accurate, and I accept the Toyota Lanka programme terms.
            </label>
            <Button disabled={loading || compressing} className="h-12 w-full bg-[#b51f2b] hover:bg-[#921923]">
              <LockKeyhole className="mr-2 h-4 w-4" />{compressing ? 'Optimizing vehicle images...' : loading ? 'Submitting registration & photos...' : 'Submit registration'}
            </Button>
          </form>}
          {step === 'complete' && (
            <div className="space-y-6 py-8 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-[#2d7a50]" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[#173528]">Request Submitted Successfully</h3>
                <p className="mx-auto max-w-md text-sm leading-6 text-slate-600">
                  Your registration request has been submitted. You will be contacted soon via SMS once your application is reviewed and approved. Once approved, you can log in to your member portal.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/login-member')}
                  className="border-[#173528] text-[#173528] hover:bg-[#173528] hover:text-white"
                >
                  Go to Member Login
                </Button>
                <Button
                  onClick={() => {
                    setStep('mobile');
                    setForm({
                      firstName: '',
                      lastName: '',
                      mobile: '',
                      email: '',
                      address: '',
                      district: '',
                      vehicleModel: 'Toyota Land Cruiser 300 Series (LC300)',
                      vehicleYear: '',
                      vehicleNumber: '',
                      consent: false,
                    });
                    setPhotos([]);
                  }}
                  className="bg-[#b51f2b] hover:bg-[#921923]"
                >
                  Register Another Member
                </Button>
              </div>
            </div>
          )}
        </CardContent></Card>
      </main>
    </div>
  );
};

export default OwnerRegistration;
