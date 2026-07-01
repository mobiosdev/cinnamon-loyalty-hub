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

export const logSentNotification = (log: Omit<SentNotification, "id" | "timestamp">) => {
  try {
    const raw = localStorage.getItem("sent_notifications");
    const list = raw ? JSON.parse(raw) : [];
    
    // Generate UUID or fallback
    const id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const record: SentNotification = {
      id,
      timestamp: new Date().toISOString(),
      ...log,
    };

    list.unshift(record);
    localStorage.setItem("sent_notifications", JSON.stringify(list));
  } catch (e) {
    console.error("Error logging notification:", e);
  }
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
