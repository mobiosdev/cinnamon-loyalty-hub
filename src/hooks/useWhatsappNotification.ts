import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { whatsappApi } from '@/services/whatsappApi';
import { validateAndNormalizeSriLankanMobile } from '@/utils/phoneUtils';
import { logSentNotification } from '@/utils/notificationLogger';
import { emptyWhatsappDraft, isWhatsappReady } from '@/components/discount/WhatsappComposer';

interface Recipient {
  id?: string;
  member_id?: string;
  mobile: string;
  phone?: string;
  secondary_mobile?: string;
  first_name: string;
  last_name: string;
}

export function useWhatsappNotification() {
  const [draft, setDraft] = useState({ ...emptyWhatsappDraft });
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);

  const send = async (members: Recipient[], type: string, offerName?: string) => {
    if (busy.current || uploading) return false;
    if (!isWhatsappReady(draft)) {
      toast.error('Enter message content, a campaign name, and an uploaded filename when sending an image.');
      return false;
    }
    if (!members || members.length === 0) {
      toast.error('Select at least one recipient.');
      return false;
    }

    const recipientsPayload = members.map((m: any) => ({
      id: m.id && !String(m.id).startsWith('manual-') ? m.id : undefined,
      member_id: m.id && !String(m.id).startsWith('manual-') ? m.id : undefined,
      phone: m.mobile || m.phone,
      mobile: m.mobile || m.phone,
      secondary_mobile: m.secondary_mobile,
      name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Valued member',
    }));

    busy.current = true;
    setSending(true);
    try {
      const response = await whatsappApi.sendNotification({
        recipients: recipientsPayload,
        templateName: draft.templateName,
        uploadedFileName: draft.uploadedFileName?.trim() || undefined,
        campaignName: draft.campaignName.trim(),
        content: draft.content.trim(),
        type,
        offer_name: offerName,
      });

      if (!response.success && response.successful === 0) {
        throw new Error('WhatsApp requests were not accepted by the gateway');
      }

      toast.success(
        `WhatsApp request accepted for ${response.successful} recipient number(s) (including secondary numbers).`
      );

      const completed = (response.results || [])
        .filter((r) => r.success)
        .map((r) => ({ phone: r.phone, name: r.name }));

      if (completed.length) {
        logSentNotification({
          type,
          channel: 'whatsapp',
          message: `${draft.content.trim()}\n\nTemplate: ${draft.templateName}\nCampaign: ${draft.campaignName}${draft.uploadedFileName ? `\nFile: ${draft.uploadedFileName}` : ''}\nStatus: request accepted (delivery not confirmed)`,
          recipients: completed,
          offerName,
        });
      }

      return true;
    } catch (error) {
      console.error('Error dispatching WhatsApp notifications:', error);
      toast.error(
        `${error instanceof Error ? error.message : 'WhatsApp request failed'}. Check delivery before retrying.`
      );
      return false;
    } finally {
      busy.current = false;
      setSending(false);
    }
  };
  return { draft, setDraft, uploading, setUploading, sending, send, ready: isWhatsappReady(draft) };
}
