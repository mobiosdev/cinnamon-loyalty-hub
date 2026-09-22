import { auditApi } from "@/services/auditApi";

export interface SentNotification {
  id: string;
  timestamp: string;
  type: string; // "Offer Reminder", "Category Bulk", "Individual Custom"
  channel: "sms" | "whatsapp";
  message: string;
  recipients: { phone: string; name: string }[];
  offerName?: string;
  categoriesName?: string;
}

export const logSentNotification = async (log: Omit<SentNotification, "id" | "timestamp">): Promise<SentNotification> => {
  const timestamp = new Date().toISOString();

  // Generate UUID or fallback
  const id = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const record: SentNotification = {
    id,
    timestamp,
    ...log,
  };

  // 1. Save to local storage for quick offline / UI history access
  try {
    const raw = localStorage.getItem("sent_notifications");
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    localStorage.setItem("sent_notifications", JSON.stringify(list));
  } catch (e) {
    console.error("Error logging notification to localStorage:", e);
  }

  // 2. Call connected Backend API (/audit/logs) to persist and hit backend logs
  try {
    let performedBy = "Admin User";
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userObj = JSON.parse(userStr);
        const roleSuffix = userObj.role === "superadmin" ? "Super Admin" : (userObj.role_name || userObj.role || "");
        const suffixStr = roleSuffix ? ` (${roleSuffix})` : "";
        performedBy = userObj.username ? `${userObj.username}${suffixStr}` : "Admin User";
      }
    } catch {
      // ignore
    }

    await auditApi.logActivity({
      action: "SEND_NOTIFICATION",
      activity_type: "notification_dispatch",
      entity_type: "member",
      entity_id: null,
      entity_name: log.offerName || log.categoriesName || log.type || "Individual Custom",
      performed_by: performedBy,
      details: {
        channel: log.channel,
        type: log.type,
        message: log.message,
        recipient_count: log.recipients.length,
        recipients: log.recipients,
        offer_name: log.offerName,
        categories_name: log.categoriesName,
        sent_at: timestamp,
      },
    });
  } catch (apiErr) {
    console.error("Failed to log notification dispatch to backend API:", apiErr);
  }

  return record;
};

export const getSentNotifications = (): SentNotification[] => {
  try {
    const raw = localStorage.getItem("sent_notifications");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Error loading logged notifications:", e);
    return [];
  }
};

export const clearSentNotificationsLog = () => {
  try {
    localStorage.removeItem("sent_notifications");
  } catch (e) {
    console.error("Error clearing logged notifications:", e);
  }
};
