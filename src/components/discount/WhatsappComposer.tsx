import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { whatsappApi } from '@/services/whatsappApi';
import { toast } from 'sonner';

export interface WhatsappDraft {
  templateName: 'message' | 'message_w_image';
  content: string;
  campaignName: string;
  uploadedFileName: string;
}

export const emptyWhatsappDraft: WhatsappDraft = {
  templateName: 'message_w_image', campaignName: 'USER_WEB', uploadedFileName: '', content: '',
};

export const isWhatsappReady = (draft: WhatsappDraft) =>
  Boolean(draft.content.trim() && draft.campaignName.trim() &&
    (draft.templateName === 'message_w_image' || draft.uploadedFileName.trim()));

export function WhatsappComposer({ value, onChange, disabled, onUploading }: {
  value: WhatsappDraft;
  onChange: (value: WhatsappDraft) => void;
  disabled: boolean;
  onUploading: (uploading: boolean) => void;
}) {
  const id = useId();
  const [response, setResponse] = useState('');
  return <fieldset disabled={disabled} className="space-y-3">
    <div className="space-y-1">
      <Label htmlFor={`${id}-type`}>Message type</Label>
      <select id={`${id}-type`} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={value.templateName}
        onChange={e => onChange({ ...value, templateName: e.target.value as WhatsappDraft['templateName'] })}>
        <option value="message_w_image">Without image</option>
        <option value="message">With image</option>
      </select>
    </div>
    <div className="space-y-1">
      <Label htmlFor={`${id}-content`}>Message content</Label>
      <Textarea id={`${id}-content`} value={value.content} rows={5}
        placeholder="Enter your WhatsApp message..."
        onChange={e => onChange({ ...value, content: e.target.value })} />
      <p className="text-xs text-muted-foreground">Each recipient's name is added automatically.</p>
    </div>
    {(['campaignName'] as const).map(key => (
      <div key={key} className="space-y-1">
        <Label htmlFor={`${id}-${key}`}>{ { templateName: 'Template name', campaignName: 'Campaign name', uploadedFileName: 'Uploaded filename' }[key]}</Label>
        <Input id={`${id}-${key}`} value={value[key]} onChange={e => onChange({ ...value, [key]: e.target.value })} />
      </div>
    ))}
    {value.templateName === 'message' && <>
    <Label htmlFor={`${id}-filename`}>Uploaded filename</Label>
    <Input id={`${id}-filename`} value={value.uploadedFileName}
      onChange={e => onChange({ ...value, uploadedFileName: e.target.value })} />
    <Label htmlFor={`${id}-file`}>Upload media (up to 10 MiB)</Label>
    <Input id={`${id}-file`} type="file" onChange={async e => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      onUploading(true);
      setResponse('');
      onChange({ ...value, uploadedFileName: '' });
      try {
        const result = await whatsappApi.uploadFile(file);
        if (result && typeof result === 'object' && 'uploadedFileName' in result && typeof result.uploadedFileName === 'string') {
          onChange({ ...value, uploadedFileName: result.uploadedFileName });
        } else {
          setResponse(typeof result === 'string' ? result : JSON.stringify(result) ?? 'Empty response');
          toast.info('Enter the uploaded filename returned by the provider.');
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Upload failed');
      } finally {
        onUploading(false);
      }
    }} />
    {response && <div className="text-xs space-y-1"><p>Upload response — copy the returned filename into the field above:</p><pre className="whitespace-pre-wrap break-all">{response}</pre></div>}
    </>}
  </fieldset>;
}
