import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { whatsappApi } from '@/services/whatsappApi';
import { validateAndNormalizeSriLankanMobile } from '@/utils/phoneUtils';
import { logSentNotification } from '@/utils/notificationLogger';
import { emptyWhatsappDraft, isWhatsappReady } from '@/components/discount/WhatsappComposer';

interface Recipient { mobile: string; first_name: string; last_name: string }

export function useWhatsappNotification() {
  const [draft, setDraft] = useState({ ...emptyWhatsappDraft });
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  // Keep accepted recipients when retrying a partially failed batch.
  const accepted = useRef(new Set<string>());

  const send = async (members: Recipient[], type: string, offerName?: string) => {
    if (busy.current || uploading) return false;
    if (!isWhatsappReady(draft)) {
      toast.error('Enter message content, a campaign name, and an uploaded filename when sending an image.');
      return false;
    }
    const recipients = new Map<string, { phone: string; name: string }>();
    for (const member of members) {
      const result = validateAndNormalizeSriLankanMobile(member.mobile);
      if (!result.isValid || !result.normalized || !/^[1-9]\d{6,14}$/.test(result.normalized)) {
        toast.error(`Invalid recipient number: ${member.mobile}`);
        return false;
      }
      const name = [member.first_name, member.last_name].filter(Boolean).join(' ').trim() || 'Valued member';
      recipients.set(result.normalized, { phone: result.normalized, name });
    }
    if (!recipients.size) { toast.error('Select at least one recipient.'); return false; }
    const payload = {
      templateName: draft.templateName,
      ...(draft.templateName === 'message' ? { uploadedFileName: draft.uploadedFileName.trim() } : {}),
      campaignName: draft.campaignName.trim(),
    };
    busy.current = true;
    setSending(true);
    const completed: { phone: string; name: string }[] = [];
    try {
      for (const recipient of recipients.values()) {
        const values: [string, string] = [recipient.name, draft.content.trim()];
        const key = JSON.stringify({ ...payload, msisdn: recipient.phone, values });
        if (accepted.current.has(key)) continue;
        await whatsappApi.sendMessage({ ...payload, values, msisdn: recipient.phone, client_ref_id: crypto.randomUUID() });
        accepted.current.add(key);
        completed.push(recipient);
      }
      toast.success(`WhatsApp requests accepted for ${recipients.size} recipient(s).`);
      accepted.current.clear();
      return true;
    } catch (error) {
      toast.error(`${completed.length} request(s) accepted in this attempt. ${error instanceof Error ? error.message : 'WhatsApp request failed'}. Check delivery before retrying.`);
      return false;
    } finally {
      if (completed.length) logSentNotification({
        type, channel: 'whatsapp',
        message: `${draft.content.trim()}\n\nTemplate: ${payload.templateName}\nCampaign: ${payload.campaignName}${payload.uploadedFileName ? `\nFile: ${payload.uploadedFileName}` : ''}\nStatus: request accepted (delivery not confirmed)`,
        recipients: completed, offerName,
      });
      busy.current = false;
      setSending(false);
    }
  };
  return { draft, setDraft, uploading, setUploading, sending, send, ready: isWhatsappReady(draft) };
}
