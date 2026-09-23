import { apiManager } from '@/app/apiManager';

export interface SendSmsRecipient {
  phone: string;
  name?: string;
}

export interface SendSmsPayload {
  recipients: Array<string | SendSmsRecipient>;
  message: string;
  type?: string;
  offer_name?: string;
  categories_name?: string;
  performed_by?: string;
  send_to_secondary?: boolean;
}

export interface SendSmsResponse {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    phone: string;
    success: boolean;
    response: string;
  }>;
}

export const notificationApi = {
  async sendSms(payload: SendSmsPayload): Promise<SendSmsResponse> {
    return apiManager.post<SendSmsResponse>('/notifications/send-sms', payload);
  },
};
