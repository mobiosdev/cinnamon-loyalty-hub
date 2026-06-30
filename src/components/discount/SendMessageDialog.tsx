import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Users } from "lucide-react";
import { staffApi } from "@/services/staffApi";

interface SendMessageDialogProps {
  offer: {
    id: string;
    name: string;
    description: string;
    categories: Array<{
      id: number;
      name: string;
      memberCount: number;
    }>;
    totalMembers: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

export const SendMessageDialog = ({ offer, isOpen, onClose }: SendMessageDialogProps) => {
  const [smsMessage, setSmsMessage] = useState(
    `Special Offer: ${offer.name}\n\n${offer.description}\n\nVisit us to redeem this exclusive offer!`
  );
  const [whatsappMessage, setWhatsappMessage] = useState(
    `🎁 *${offer.name}*\n\n${offer.description}\n\n✨ This is an exclusive offer for you! Visit us to redeem.\n\nThank you for being a valued member!`
  );
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("sms");

  const getMemberPhones = async () => {
    try {
      const categoryIds = offer.categories.map(cat => cat.id);
      
      const membersLists = await Promise.all(
        categoryIds.map(async (catId) => {
          const res = await staffApi.getStaff({
            category_id: catId.toString(),
            is_active: true,
            limit: 1000
          });
          return res.data;
        })
      );
      
      const allMembers = membersLists.flat();
      const uniqueMembers = Array.from(new Map(allMembers.map(m => [m.id, m])).values());
      
      return uniqueMembers;
    } catch (error) {
      console.error('Error fetching member phones:', error);
      throw error;
    }
  };

  const sendSMS = async () => {
    setSending(true);
    try {
      const members = await getMemberPhones();
      
      if (members.length === 0) {
        toast.error("No members found to send messages to");
        return;
      }

      // Prepare bulk SMS data
      const smsData = {
        recipients: members.map(m => ({
          phone: m.mobile,
          name: `${m.first_name} ${m.last_name}`,
        })),
        message: smsMessage,
        offer_id: offer.id,
        offer_name: offer.name,
      };

      // TODO: Replace with actual SMS API endpoint
      // For now, simulating API call
      console.log('Sending SMS to:', smsData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success(`SMS sent successfully to ${members.length} members!`);
      onClose();
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error("Failed to send SMS messages");
    } finally {
      setSending(false);
    }
  };

  const sendWhatsApp = async () => {
    setSending(true);
    try {
      const members = await getMemberPhones();
      
      if (members.length === 0) {
        toast.error("No members found to send messages to");
        return;
      }

      // Prepare bulk WhatsApp data
      const whatsappData = {
        recipients: members.map(m => ({
          phone: m.mobile,
          name: `${m.first_name} ${m.last_name}`,
        })),
        message: whatsappMessage,
        offer_id: offer.id,
        offer_name: offer.name,
      };

      // TODO: Replace with actual WhatsApp API endpoint
      // For now, simulating API call
      console.log('Sending WhatsApp to:', whatsappData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success(`WhatsApp messages sent successfully to ${members.length} members!`);
      onClose();
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast.error("Failed to send WhatsApp messages");
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (activeTab === "sms") {
      sendSMS();
    } else {
      sendWhatsApp();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Notification: {offer.name}
          </DialogTitle>
          <DialogDescription>
            Send SMS or WhatsApp messages to members about this offer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Offer Categories Info */}
          <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Target Categories
            </div>
            <div className="flex flex-wrap gap-2">
              {offer.categories.map((cat) => (
                <Badge key={cat.id} variant="secondary" className="gap-1">
                  {cat.name}
                  <span className="text-xs text-muted-foreground">
                    ({cat.memberCount} members)
                  </span>
                </Badge>
              ))}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Total recipients: <span className="font-semibold">{offer.totalMembers}</span>
            </div>
          </div>

          {/* Tabs for SMS/WhatsApp */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sms">SMS</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            </TabsList>

            <TabsContent value="sms" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="sms-message">SMS Message</Label>
                <Textarea
                  id="sms-message"
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  rows={8}
                  className="resize-none"
                  placeholder="Enter your SMS message..."
                />
                <p className="text-xs text-muted-foreground">
                  Character count: {smsMessage.length} (160 chars per SMS)
                </p>
              </div>

              <div className="border rounded-lg p-3 bg-muted/50 text-sm">
                <p className="font-medium mb-1">Message Preview:</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{smsMessage}</p>
              </div>
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-message">WhatsApp Message</Label>
                <Textarea
                  id="whatsapp-message"
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  rows={8}
                  className="resize-none"
                  placeholder="Enter your WhatsApp message..."
                />
                <p className="text-xs text-muted-foreground">
                  You can use *bold*, _italic_, and emojis in WhatsApp messages
                </p>
              </div>

              <div className="border rounded-lg p-3 bg-muted/50 text-sm">
                <p className="font-medium mb-1">Message Preview:</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{whatsappMessage}</p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending} className="gap-2">
              <Send className="h-4 w-4" />
              {sending ? "Sending..." : `Send ${activeTab === "sms" ? "SMS" : "WhatsApp"}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
