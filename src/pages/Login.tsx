import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { loginStep1, loginStep2, clearError, resetOtpStep } from "@/store/slices/authSlice";
import { AppDispatch, RootState } from "@/store";
import cinnamonLogo from "@/assets/cinnamon-logo.png";
import { Mail, Smartphone, ArrowLeft, Eye, EyeOff, Shield, Key } from "lucide-react";

const OTP_LENGTH = 6;
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7050/api';

const Login = () => {
  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Forgot Password State
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email request, 2: OTP + New Password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotMaskedMobile, setForgotMaskedMobile] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error, isAuthenticated, otpStep, maskedMobile, pendingUsername } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    if (isAuthenticated) {
      toast.success("Login successful! Welcome back.");
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Focus first OTP box when entering login OTP step
  useEffect(() => {
    if (otpStep) {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }
  }, [otpStep]);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your email and password");
      return;
    }
    dispatch(loginStep1({ email: email.trim(), password }));
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length < OTP_LENGTH) {
      toast.error("Please enter the complete 6-digit OTP");
      return;
    }
    dispatch(loginStep2({ username: pendingUsername!, otp: otpValue }));
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all filled
    if (newOtp.every(d => d) && newOtp.join("").length === OTP_LENGTH) {
      setTimeout(() => {
        const form = document.getElementById("otp-form") as HTMLFormElement;
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
    dispatch(resetOtpStep());
    setOtp(Array(OTP_LENGTH).fill(""));
  };

  const handleResend = () => {
    dispatch(loginStep1({ email: email.trim(), password }));
    setOtp(Array(OTP_LENGTH).fill(""));
    toast.info("New OTP sent to your mobile");
  };

  // ==========================================
  // FORGOT PASSWORD HANDLERS
  // ==========================================
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error("Please enter your registered email address");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/reset-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send reset code");
      }
      setForgotMaskedMobile(data.masked_mobile);
      setForgotStep(2);
      toast.success("Verification code sent to your registered mobile number");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || forgotOtp.length < 6) {
      toast.error("Please enter the 6-digit OTP code");
      return;
    }
    if (!forgotNewPassword.trim()) {
      toast.error("Please enter a new password");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/reset-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          otp: forgotOtp.trim(),
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Reset failed");
      }
      toast.success("Password reset successful! You can now sign in.");
      // Reset state and return to login screen
      setForgotMode(false);
      setForgotStep(1);
      setForgotOtp("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setEmail(forgotEmail); // Autofill login email
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="border border-border/60 shadow-2xl">
          <CardHeader className="space-y-4 pb-2">
            <div className="flex justify-center">
              <img
                src={cinnamonLogo}
                alt="Cinnamon Logo"
                className="h-14 w-auto"
              />
            </div>
            <div className="text-center space-y-1">
              {forgotMode ? (
                forgotStep === 1 ? (
                  <>
                    <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
                    <CardDescription>
                      Enter your email to request a reset code
                    </CardDescription>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center mb-2">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Verify Reset Code</CardTitle>
                    <CardDescription>
                      We sent a password reset OTP to{" "}
                      <span className="font-semibold text-foreground">{forgotMaskedMobile}</span>
                    </CardDescription>
                  </>
                )
              ) : !otpStep ? (
                <>
                  <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                  <CardDescription>
                    Sign in to Cinnamon Loyalty Hub
                  </CardDescription>
                </>
              ) : (
                <>
                  <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold">Verify Your Identity</CardTitle>
                  <CardDescription>
                    We sent a 6-digit code to{" "}
                    <span className="font-semibold text-foreground">{maskedMobile}</span>
                  </CardDescription>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {forgotMode ? (
              // FORGOT PASSWORD FLOW
              forgotStep === 1 ? (
                // Forgot Step 1: Request OTP
                <form onSubmit={handleForgotRequest} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="Enter registered email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? "Sending OTP..." : "Send Reset Code"}
                  </Button>
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotMode(false)}
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                // Forgot Step 2: OTP + New Password
                <form onSubmit={handleForgotReset} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-otp" className="text-sm font-medium">Verification Code (OTP)</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgot-otp"
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-new-password" className="text-sm font-medium">New Password</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgot-new-password"
                        type={showForgotNewPassword ? "text" : "password"}
                        placeholder="Create new password"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showForgotNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-confirm-password" className="text-sm font-medium">Confirm New Password</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgot-confirm-password"
                        type={showForgotNewPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? "Resetting..." : "Reset Password"}
                  </Button>
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleForgotRequest}
                      disabled={forgotLoading}
                      className="text-sm text-primary hover:underline disabled:opacity-50 transition-colors"
                    >
                      Resend OTP
                    </button>
                  </div>
                </form>
              )
            ) : !otpStep ? (
              // Step 1: Email + Password
              <form onSubmit={handleStep1} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <button
                      type="button"
                      onClick={() => { setForgotMode(true); setForgotStep(1); setForgotEmail(email); }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
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
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Sending OTP...
                    </span>
                  ) : "Continue"}
                </Button>
              </form>
            ) : (
              // Step 2: OTP Input
              <form id="otp-form" onSubmit={handleStep2} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-center block">
                    Enter verification code
                  </Label>
                  <div className="flex gap-2 justify-center">
                    {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                      <Input
                        key={i}
                        ref={(el) => (otpInputRefs.current[i] = el)}
                        id={`otp-${i}`}
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
                    Code expires in 5 minutes
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={isLoading || otp.join("").length < OTP_LENGTH}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Verifying...
                    </span>
                  ) : "Verify & Sign In"}
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
                    disabled={isLoading}
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
          <div className={`h-1.5 w-8 rounded-full transition-colors ${forgotMode || !otpStep ? 'bg-primary' : 'bg-primary/30'}`} />
          <div className={`h-1.5 w-8 rounded-full transition-colors ${!forgotMode && otpStep ? 'bg-primary' : 'bg-muted'}`} />
        </div>
      </div>
    </div>
  );
};

export default Login;


