import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Clock } from "lucide-react";

/**
 * NotificationTypeSelector - Modal for choosing between Instant or Scheduled notification
 * First step when admin clicks bell icon
 */
const NotificationTypeSelector = ({
  isOpen = false,
  onClose,
  onSelectInstant,
  onSelectSchedule,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Refurbishment Notification</DialogTitle>
          <DialogDescription>
            Choose how you want to send the notification to partners
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          {/* Instant Notification Option */}
          <Button
            onClick={onSelectInstant}
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
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationTypeSelector;
