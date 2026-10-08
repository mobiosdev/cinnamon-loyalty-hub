import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { clearMustChangePassword, logout } from "@/store/slices/authSlice";
import { userApi } from "@/services/userApi";
import { validatePasswordPolicy } from "@/utils/passwordPolicy";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldAlert, Lock, Eye, EyeOff, CheckCircle2, XCircle, LogOut } from "lucide-react";

export function ForcedPasswordChangeModal() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // If user does not need to change password, do not render
  if (!user || !user.must_change_password) {
    return null;
  }

  const isPrivileged = ["admin", "superadmin"].includes(user.role);
  const minLength = 8;
  const validation = validatePasswordPolicy(newPassword, isPrivileged, [user.username, user.email, user.full_name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      toast.error("Please enter your current temporary password");
      return;
    }

    if (!validation.isValid) {
      toast.error(validation.message || "Password does not meet security requirements");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password cannot be the same as your current password");
      return;
    }

    setSubmitting(true);
    try {
      await userApi.changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully! You may now use the Cinnamon Loyalty Hub.");
      dispatch(clearMustChangePassword());
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to update password. Please check your current password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            Password Change Required
          </DialogTitle>
          <DialogDescription className="text-center text-xs leading-relaxed text-muted-foreground">
            In compliance with the <strong className="text-foreground">TextWare Information Security Policy</strong>, 
            initial and default passwords must be changed immediately upon your first login before accessing the system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Current Temporary Password */}
          <div className="space-y-1.5">
            <Label htmlFor="current-temp-password">Current / Temporary Password *</Label>
            <div className="relative">
              <Input
                id="current-temp-password"
                type={showCurrent ? "text" : "password"}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="new-perm-password">New Permanent Password *</Label>
            <div className="relative">
              <Input
                id="new-perm-password"
                type={showNew ? "text" : "password"}
                placeholder={`Minimum ${minLength} characters`}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-perm-password">Confirm New Password *</Label>
            <div className="relative">
              <Input
                id="confirm-perm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Security Checklist */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-xs">
            <p className="font-semibold text-foreground/80 mb-1">Password Requirements:</p>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <span className={`flex items-center gap-1.5 ${validation.checks.minLength ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                {validation.checks.minLength ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                At least {minLength} characters
              </span>
              <span className={`flex items-center gap-1.5 ${validation.checks.hasUppercase ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                {validation.checks.hasUppercase ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                1 Uppercase letter (A-Z)
              </span>
              <span className={`flex items-center gap-1.5 ${validation.checks.hasLowercase ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                {validation.checks.hasLowercase ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                1 Lowercase letter (a-z)
              </span>
              <span className={`flex items-center gap-1.5 ${validation.checks.hasDigit ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                {validation.checks.hasDigit ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                1 Number (0-9)
              </span>
              <span className={`flex items-center gap-1.5 ${validation.checks.hasSpecialChar ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                {validation.checks.hasSpecialChar ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                1 Special character (!@#$)
              </span>
              <span className={`flex items-center gap-1.5 ${validation.checks.noIdentityMatch ? "text-emerald-500 font-medium" : "text-destructive font-medium"}`}>
                {validation.checks.noIdentityMatch ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                No name or username
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              disabled={submitting}
              className="flex-1 gap-1 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
            <Button
              type="submit"
              disabled={submitting || !validation.isValid || !currentPassword}
              className="flex-1 gap-1 text-xs"
            >
              <Lock className="h-3.5 w-3.5" />
              {submitting ? "Updating..." : "Set New Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
