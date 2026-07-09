import { apiManager } from '@/app/apiManager';

export interface SendOtpPayload {
  mobile: string;
  notes?: string;
  user_id: number;
  bill_number: string;
}

export interface SendOtpResponse {
  message: string;
  data: {
    staff_id: string;
    expiry_time: string;
  };
}

export interface VerifyOtpPayload {
  mobile: string;
  otp: string;
  staff_id: string;
}

export interface PendingPayload {
  mobile: string;
  notes: string;
  user_id: number;
  bill_number: string;
}

export const transactionApi = {
  async sendOtp(payload: SendOtpPayload): Promise<SendOtpResponse> {
    return apiManager.post<SendOtpResponse>('/transaction/send-otp', payload);
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<any> {
    return apiManager.post<any>('/transaction/verify-otp', payload);
  },

  async checkBillExists(billNumber: string): Promise<boolean> {
    const res = await apiManager.get<{ exists: boolean }>(`/transaction/check-bill/${encodeURIComponent(billNumber)}`);
    return res.exists;
  },

  async processPendingDiscount(payload: PendingPayload): Promise<any> {
    return apiManager.post<any>('/transaction/pending', payload);
  },
};
