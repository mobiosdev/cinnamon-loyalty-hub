import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "@/store";
import DiscountManagement from "@/components/DiscountManagement";
import MemberPortal from "./MemberPortal";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const isMember = user?.role === "customer" || user?.is_customer === true;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return isMember ? <MemberPortal /> : <DiscountManagement />;
};

export default Index;
