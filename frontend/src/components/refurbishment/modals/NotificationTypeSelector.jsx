import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Zap, Clock, ArrowLeft } from "lucide-react";

/**
 * NotificationTypeSelector - Modal for choosing between Instant or Scheduled notification
 * First step when admin clicks bell icon
 */
const NotificationTypeSelector = ({
  isOpen = false,
  onClose,
  onSelectInstant,
  onSelectSchedule,
  defaultMessage = "",
}) => {
  const [step, setStep] = useState("choose"); // choose | instant-message
  const [message, setMessage] = useState(defaultMessage || "");

  useEffect(() => {
    if (isOpen) {
      setStep("choose");
      setMessage(defaultMessage || "");
    }
  }, [isOpen, defaultMessage]);

  const handleClose = () => {
    setStep("choose");
    setMessage(defaultMessage || "");
    onClose();
  };

  const handleSendInstant = () => {
    const remarks = message.trim();
    if (!remarks) {
      return;
    }
    onSelectInstant(remarks);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "instant-message"
              ? "Instant Request Remarks"
              : "Send Refurbishment Notification"}
          </DialogTitle>
          <DialogDescription>
            {step === "instant-message"
              ? "Add a custom message / remarks before sending this instant request"
              : "Choose how you want to send the notification to partners"}
          </DialogDescription>
        </DialogHeader>

        {step === "choose" ? (
          <>
            <div className="grid grid-cols-2 gap-3 py-4">
              {/* Instant Notification Option */}
              <Button
                onClick={() => setStep("instant-message")}
                variant="outline"
                className="h-auto py-6 px-4 flex flex-col items-center text-center whitespace-normal"
              >
                <Zap className="h-8 w-8 mb-2 flex-shrink-0" />
                <div className="font-semibold mb-1 w-full">Instant Request</div>
                <div className="text-xs text-gray-600 font-normal w-full break-words">
                  Send immediately with all packages
                </div>
              </Button>

              {/* Scheduled Notification Option */}
              <Button
                onClick={onSelectSchedule}
                variant="outline"
                className="h-auto py-6 px-4 flex flex-col items-center text-center whitespace-normal"
              >
                <Clock className="h-8 w-8 mb-2 flex-shrink-0" />
                <div className="font-semibold mb-1 w-full">Scheduled Request</div>
                <div className="text-xs text-gray-600 font-normal w-full break-words">
                  Schedule with custom date and packages
                </div>
              </Button>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label htmlFor="instant-remarks" className="text-sm font-medium">
                  Custom Message / Remarks{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="instant-remarks"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter remarks or a custom message for the partner…"
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  This message will be included with the instant refurbishment
                  request.
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep("choose")}
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSendInstant}
                  disabled={!message.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Send Instant Request
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NotificationTypeSelector;
