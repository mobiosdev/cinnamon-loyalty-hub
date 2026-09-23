import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import cinnamonLogo from "@/assets/cinnamon-logo.png";
import { staffApi } from "@/services/staffApi";
import { Shield, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, UserCheck } from "lucide-react";

const SetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [memberInfo, setMemberInfo] = useState<{
    member_id: string;
    name: string;
    email: string;
    member_code: string;
  } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setTokenValid(false);
      setErrorMessage("No password setup token found. Please check the link in your email.");
      return;
    }

    const checkToken = async () => {
      try {
        setIsVerifying(true);
        const res = await staffApi.verifyPasswordToken(token);
        if (res && res.valid) {
          setTokenValid(true);
          setMemberInfo(res);
        } else {
          setTokenValid(false);
          setErrorMessage(res.message || "This password setup link is invalid or has expired.");
        }
      } catch (err: any) {
        setTokenValid(false);
        setErrorMessage(
          err.response?.data?.message ||
          err.message ||
          "This password setup link is invalid or has expired. Please contact Cinnamon Grand."
        );
      } finally {
        setIsVerifying(false);
      }
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setIsSubmitting(true);
      await staffApi.setPassword(token!, newPassword);
      setIsSuccess(true);
      toast.success("Password created successfully!");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
        err.message ||
        "Failed to set password. Please try again."
      );
    } finally {
      setIsSubmitting(false);
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
                alt="Cinnamon Grand Logo"
                className="h-14 w-auto"
              />
            </div>

            <div className="text-center space-y-1">
              <CardTitle className="text-2xl font-bold">
                {isSuccess
                  ? "Password Created!"
                  : tokenValid
                  ? "Create Your Password"
                  : isVerifying
                  ? "Verifying Link..."
                  : "Link Expired or Invalid"}
              </CardTitle>
              <CardDescription>
                {isSuccess
                  ? "Your account is now ready to use."
                  : tokenValid
                  ? "Set up a secure password for your member portal access"
                  : isVerifying
                  ? "Please wait while we verify your invitation..."
                  : "We could not verify your password creation link."}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {isVerifying ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                <p className="text-sm text-muted-foreground">Verifying security token...</p>
              </div>
            ) : isSuccess ? (
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Welcome to Cinnamon Grand</h3>
                  <p className="text-sm text-muted-foreground">
                    Your password has been successfully saved. You can now log in using your email and password.
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/login-member")}
                  className="w-full h-11 font-semibold flex items-center justify-center gap-2"
                >
                  Proceed to Member Login
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            ) : !tokenValid ? (
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-destructive font-medium">{errorMessage}</p>
                  <p className="text-xs text-muted-foreground">
                    If your link has expired, you can request a new password link from Cinnamon Grand staff or the login screen.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="w-full h-11 font-semibold"
                >
                  Return to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Member summary banner */}
                {memberInfo && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div className="text-left text-xs space-y-0.5 overflow-hidden">
                      <p className="font-semibold text-foreground text-sm truncate">{memberInfo.name}</p>
                      <p className="text-muted-foreground truncate">{memberInfo.email}</p>
                      <p className="text-primary font-mono font-medium">#{memberInfo.member_code}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password (min. 6 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      minLength={6}
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

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-type your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Saving Password...
                    </span>
                  ) : (
                    "Save & Activate Account"
                  )}
                </Button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => navigate("/login-member")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                  >
                    Already have a password? Sign In to Member Portal
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetPassword;
