import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { updateProfileSuccess } from "@/store/slices/authSlice";
import { userApi, UpdateProfilePayload } from "@/services/userApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, User, Mail, Phone, Lock, Loader2 } from "lucide-react";
import { logActivity } from "@/utils/auditLogger";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Fetch fresh profile data from backend when dialog opens
  useEffect(() => {
    if (open) {
      setPassword("");
      setShowPassword(false);
      fetchProfile();
    }
  }, [open]);

  const fetchProfile = async () => {
    setFetching(true);
    try {
      const profile = await userApi.getProfile();
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
      setMobile(profile.mobile || "");
    } catch (error: any) {
      console.error("Failed to fetch profile:", error);
      // Fallback to redux state if API fails
      if (currentUser) {
        setFullName(currentUser.full_name || "");
        setEmail(currentUser.email || "");
        setMobile(currentUser.mobile || "");
      }
      toast.error("Could not load fresh profile details.");
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full Name is required");
      return;
    }

    setLoading(true);
    try {
      const payload: UpdateProfilePayload = {
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        mobile: mobile.trim() || undefined,
      };

      if (password) {
        payload.password = password;
      }

      const updatedUser = await userApi.updateProfile(payload);
      
      // Update local Redux store & localStorage
      dispatch(updateProfileSuccess(updatedUser));

      // Log audit trail activity
      if (currentUser?.username) {
        logActivity({
          activityType: "user_management",
          entityType: "user",
          action: "update",
          performedBy: currentUser.username,
          details: { event: "self_profile_update", fields: Object.keys(payload) },
        });
      }

      toast.success("Profile updated successfully!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast.error(error.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">My Profile</DialogTitle>
          <DialogDescription>
            View and update your personal information and account password.
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground mt-2">Loading profile details...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Username (Read-only) */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Username</Label>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm font-medium">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{currentUser?.username}</span>
                <span className="ml-auto text-xs bg-card px-2 py-0.5 rounded border border-border text-muted-foreground uppercase">
                  {currentUser?.role}
                </span>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-1">
              <Label htmlFor="fullName" className="text-xs">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  className="pl-9"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="superadmin@gmail.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Mobile */}
            <div className="space-y-1">
              <Label htmlFor="mobile" className="text-xs">Mobile Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="+947XXXXXXXX"
                  className="pl-9"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label htmlFor="profile-password" className="text-xs">
                New Password <span className="text-muted-foreground font-normal">(Leave blank to keep current)</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="profile-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
