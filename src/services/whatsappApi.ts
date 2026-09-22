import { apiManager } from '@/app/apiManager';

export interface WhatsappMessage {
  client_ref_id: string;
  templateName: 'message' | 'message_w_image';
  uploadedFileName?: string;
  values: [string, string];
  campaignName: string;
  msisdn: string;
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
};
