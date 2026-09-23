import { apiManager } from '@/app/apiManager';

export interface WhatsappMessage {
  client_ref_id: string;
  templateName: 'message' | 'message_w_image';
  uploadedFileName?: string;
  values: [string, string];
  campaignName: string;
  msisdn: string;
}

export interface WhatsappRecipientInput {
  id?: string;
  member_id?: string;
  phone?: string;
  mobile?: string;
  secondary_mobile?: string;
  name?: string;
}

export interface SendWhatsappNotificationPayload {
  recipients: Array<string | WhatsappRecipientInput>;
  templateName: 'message' | 'message_w_image';
  uploadedFileName?: string;
  campaignName: string;
  content: string;
  type?: string;
  offer_name?: string;
  categories_name?: string;
  performed_by?: string;
  send_to_secondary?: boolean;
}

export interface SendWhatsappNotificationResponse {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    phone: string;
    name: string;
    is_secondary: boolean;
    success: boolean;
    response?: any;
    error?: string;
  }>;
}

export const whatsappApi = {
  uploadFile(file: File): Promise<unknown> {
    if (!file.size || file.size > 10 * 1024 * 1024) {
      throw new Error('Select a non-empty file of up to 10 MiB.');
    }
    const form = new FormData();
    form.append('file', file);
    return apiManager.post('/whatsapp/upload/file', form, {
      headers: { 'Content-Type': undefined },
      timeout: 45000,
    });
  },
  sendMessage(message: WhatsappMessage): Promise<unknown> {
    return apiManager.post('/whatsapp/single/send', message, { timeout: 45000 });
  },
  sendNotification(payload: SendWhatsappNotificationPayload): Promise<SendWhatsappNotificationResponse> {
    return apiManager.post('/whatsapp/send-notification', payload, { timeout: 60000 });
  },
};

