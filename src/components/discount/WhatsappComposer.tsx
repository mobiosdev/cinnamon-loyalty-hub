import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { whatsappApi } from '@/services/whatsappApi';
import { toast } from 'sonner';

export interface WhatsappDraft {
  templateName: string;
  campaignName: string;
  uploadedFileName: string;
}

export const emptyWhatsappDraft: WhatsappDraft = {
  templateName: 'xmas_tree_new_2025', campaignName: 'USER_WEB', uploadedFileName: '',
};

export const isWhatsappReady = (draft: WhatsappDraft) =>
  Object.values(draft).every(value => value.trim());

export function WhatsappComposer({ value, onChange, disabled, onUploading }: {
  value: WhatsappDraft;
  onChange: (value: WhatsappDraft) => void;
  disabled: boolean;
  onUploading: (uploading: boolean) => void;
}) {
  const id = useId();
  const [response, setResponse] = useState('');
  return <fieldset disabled={disabled} className="space-y-3">
    <p className="text-xs text-muted-foreground">Use an approved WhatsApp template and its uploaded media file.</p>
    {(['templateName', 'campaignName', 'uploadedFileName'] as const).map(key => (
      <div key={key} className="space-y-1">
        <Label htmlFor={`${id}-${key}`}>{ { templateName: 'Template name', campaignName: 'Campaign name', uploadedFileName: 'Uploaded filename' }[key]}</Label>
        <Input id={`${id}-${key}`} value={value[key]} onChange={e => onChange({ ...value, [key]: e.target.value })} />
      </div>
    ))}
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
  </fieldset>;
}
