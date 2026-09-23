import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { setCustomerAuth, clearError } from "@/store/slices/authSlice";
import { AppDispatch, RootState } from "@/store";
import cinnamonLogo from "@/assets/cinnamon-logo.png";
import { Mail, Smartphone, ArrowLeft, Eye, EyeOff, Shield, UserCheck, ShieldCheck, ArrowRight } from "lucide-react";
import { staffApi } from "@/services/staffApi";

const OTP_LENGTH = 6;

const MemberLogin = () => {
  const location = useLocation();
  const handoffEmail = (location.state as { email?: string } | null)?.email || "";
  const [email, setEmail] = useState(handoffEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sendToSecondary, setSendToSecondary] = useState(false);

  // OTP Step States
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [memberId, setMemberId] = useState("");
  const [maskedMobile, setMaskedMobile] = useState("");
  const [sentToSecondary, setSentToSecondary] = useState(false);
  const [loading, setLoading] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user, error } = useSelector((state: RootState) => state.auth);
  const isMember = user?.role === "customer" || user?.is_customer === true;
  // A staff session in this browser should not hijack the member login; show the form instead
  const hasStaffSession = isAuthenticated && !isMember;
  // Coming from the set-password link for a different member: let them sign in as that member
  const isOtherMember = !!handoffEmail && handoffEmail.toLowerCase() !== (user?.email || "").toLowerCase();

  useEffect(() => {
    if (isAuthenticated && isMember && !isOtherMember) {
      navigate("/member-portal", { replace: true });
    }
  }, [isAuthenticated, isMember, isOtherMember, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (otpStep) {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }
  }, [otpStep]);

  // Step 1: Submit Member Credentials
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your registered email and password");
      return;
    }

    try {
      setLoading(true);
      const res = await staffApi.customerLogin(
        email.trim(),
        password,
        sendToSecondary
      );

      if (res && res.otpRequired) {
        setMemberId(res.member_id);
        setMaskedMobile(res.masked_mobile);
        setSentToSecondary(res.sent_to_secondary);
        setOtpStep(true);
        toast.info(
          res.sent_to_secondary
            ? "Verification code sent to your primary and secondary numbers."
            : "Verification code sent to your primary mobile number."
        );
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Login failed. Please check your credentials.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Member OTP
  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length < OTP_LENGTH) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    try {
      setLoading(true);
      const res = await staffApi.verifyCustomerOtp(memberId, otpValue);
      if (res && res.access_token) {
        dispatch(
          setCustomerAuth({
            access_token: res.access_token,
            refresh_token: res.refresh_token,
            user: res.user,
          })
        );
        toast.success(`Welcome back, ${res.user.full_name}!`);
        navigate("/member-portal", { replace: true });
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Invalid or expired OTP code. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
    if (newOtp.every((d) => d) && newOtp.join("").length === OTP_LENGTH) {
      setTimeout(() => {
        const form = document.getElementById("member-otp-form") as HTMLFormElement;
        form?.requestSubmit();
      }, 100);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleBack = () => {
    setOtpStep(false);
    setOtp(Array(OTP_LENGTH).fill(""));
  };

  const handleResend = async () => {
    try {
      setLoading(true);
      await staffApi.customerLogin(email.trim(), password, sendToSecondary);
      setOtp(Array(OTP_LENGTH).fill(""));
      toast.info("A new verification code has been dispatched to your mobile.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="border border-border/60 shadow-2xl backdrop-blur-sm">
          <CardHeader className="space-y-4 pb-2">
            <div className="flex justify-center">
              <img
                src={cinnamonLogo}
                alt="Cinnamon Grand Colombo"
                className="h-14 w-auto"
              />
            </div>

            <div className="text-center space-y-1">
              {!otpStep ? (
                <>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    Member Portal
                  </div>
                  <CardTitle className="text-2xl font-bold font-serif">Member Login</CardTitle>
                  <CardDescription>
                    Sign in to access your Cinnamon Grand loyalty privileges
                  </CardDescription>
                </>
              ) : (
                <>
                  <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold font-serif">Verify Your Identity</CardTitle>
                  <CardDescription>
                    We sent a 6-digit code to{" "}
                    <span className="font-semibold text-foreground font-mono">{maskedMobile}</span>
                    {sentToSecondary && (
                      <span className="block text-xs text-primary font-medium mt-1">
                        ✓ Also dispatched to your secondary mobile number
                      </span>
                    )}
                  </CardDescription>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {!otpStep ? (
              // Step 1: Member Email + Password Form
              <form onSubmit={handleStep1} className="space-y-5">
                {hasStaffSession && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                    You are currently signed in as staff
                    {user?.full_name ? <> (<span className="font-semibold">{user.full_name}</span>)</> : null}.
                    Signing in as a member will end that session in this browser.
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="member-email" className="text-sm font-medium">Member Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="member-email"
                      type="email"
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="member-password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="member-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your member password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Secondary Mobile Checkbox */}
                <div className="flex items-center space-x-2.5 p-3 rounded-lg bg-muted/50 border border-border/40">
                  <input
                    type="checkbox"
                    id="member-send-secondary"
                    checked={sendToSecondary}
                    onChange={(e) => setSendToSecondary(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <Label
                    htmlFor="member-send-secondary"
                    className="text-xs text-muted-foreground leading-snug cursor-pointer select-none"
                  >
                    Also send OTP to secondary mobile number (if registered)
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-semibold flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Sending OTP...
                    </span>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <div className="pt-2 border-t border-border/40 text-center space-y-2">
                  <p className="text-xs text-muted-foreground">
                    First time logging in? Check your email for the password creation link.
                  </p>
                  <div>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors underline"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Hotel Staff or Administrator Login
                    </Link>
                  </div>
                </div>
              </form>
            ) : (
              // Step 2: Member OTP Verification Form
              <form id="member-otp-form" onSubmit={handleStep2} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-center block">
                    Enter 6-digit verification code
                  </Label>
                  <div className="flex gap-2 justify-center">
                    {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                      <Input
                        key={i}
                        ref={(el) => (otpInputRefs.current[i] = el)}
                        id={`otp-box-${i}`}
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={1}
                        value={otp[i]}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-11 h-13 text-center text-xl font-bold tracking-widest"
                        style={{ width: "2.75rem", height: "3.25rem", fontSize: "1.25rem" }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Verification code expires in 5 minutes
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={loading || otp.join("").length < OTP_LENGTH}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Verifying...
                    </span>
                  ) : (
                    "Verify & Enter Member Portal"
                  )}
                </Button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-sm text-primary hover:underline disabled:opacity-50 transition-colors"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Step indicator */}
        <div className="flex justify-center gap-2 mt-4">
          <div
            className={`h-1.5 w-8 rounded-full transition-colors ${
              !otpStep ? "bg-primary" : "bg-primary/30"
            }`}
          />
          <div
            className={`h-1.5 w-8 rounded-full transition-colors ${
              otpStep ? "bg-primary" : "bg-muted"
            }`}
          />
        </div>
      </div>
    </div>
  );
};

export default MemberLogin;
