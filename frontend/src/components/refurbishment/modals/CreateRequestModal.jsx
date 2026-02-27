import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PackageSelector from "../PackageSelector";

/**
 * CreateRequestModal - Modal for creating new refurbishment requests
 * Uses PackageSelector component with auto-select functionality
 */
const CreateRequestModal = ({
  isOpen = false,
  onClose,
  onSubmit,
  formData = {
    partnerId: "",
    centerId: "",
    reason: "",
    description: "",
    packages: [],
  },
  onFormChange,
  onPackagesChange,
  packages = [],
  loading = false,
}) => {
  /**
   * Handle form submission
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create Refurbishment Request</DialogTitle>
          <DialogDescription>
            Submit a new refurbishment request for a center with selected
            packages.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-1">
          <div className="space-y-6 pb-4">
            {/* Partner & Center Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="partnerId">Partner *</Label>
                <Input
                  id="partnerId"
                  value={formData.partnerId}
                  onChange={(e) =>
                    onFormChange({ ...formData, partnerId: e.target.value })
                  }
                  placeholder="Partner UUID"
                  required
                />
              </div>
              <div>
                <Label htmlFor="centerId">Center *</Label>
                <Input
                  id="centerId"
                  value={formData.centerId}
                  onChange={(e) =>
                    onFormChange({ ...formData, centerId: e.target.value })
                  }
                  placeholder="Center UUID"
                  required
                />
              </div>
            </div>

            {/* Reason & Description */}
            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) =>
                  onFormChange({ ...formData, reason: e.target.value })
                }
                placeholder="Equipment outdated, facility needs upgrade"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  onFormChange({ ...formData, description: e.target.value })
                }
                placeholder="Additional details..."
                rows={3}
              />
            </div>

            {/* Package Selection with Auto-Select */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Select Packages *
              </Label>
              <PackageSelector
                packages={packages}
                selectedPackages={formData.packages}
                onSelectionChange={onPackagesChange}
                loading={loading}
              />
            </div>
          </div>
        </form>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onClose(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} onClick={handleSubmit}>
            Create Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRequestModal;
