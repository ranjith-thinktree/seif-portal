import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronsUpDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import PackageSelector from "../PackageSelector";
import refurbishmentService from "@/services/refurbishment.service";

// ---------------------------------------------------------------------------
// Default shape for the form
// ---------------------------------------------------------------------------
const DEFAULT_FORM_DATA = {
  id: "",
  requestId: "",
  partnerId: "",
  partnerName: "",
  centerId: "",
  centerName: "",
  reminderDate: "",
  reminderTime: "",
  frequency: "instant",
  customIntervalDays: 1,
  maxOccurrences: null,
  message: "",
  packages: [],
  upgradation_packages: [],
  organization_name: "",
  isManualRequest: false,
  isInstantMode: false,
};

// ---------------------------------------------------------------------------
// ScheduleNotificationForm
// ---------------------------------------------------------------------------
// ALL form state lives in this inner component which is rendered INSIDE
// DialogContent.  This is the critical architectural choice:
//
//   ScheduleNotificationModal (React.memo, zero local state)
//     Dialog  <-- NEVER re-renders due to form changes
//       DialogContent
//         ScheduleNotificationForm  <-- re-renders freely
//
// When form state changes, ONLY ScheduleNotificationForm and its subtree
// re-render.  Dialog / DialogOverlay / RemoveScroll / Presence are untouched,
// so @radix-ui/react-presence never receives a new ref while mounted.
// This eliminates the "Maximum update depth exceeded" infinite loop.
// ---------------------------------------------------------------------------
function ScheduleNotificationForm({
  initialData,
  uniquePartners,
  allCenters,
  packages,
  loading,
  onSubmit,
  onClose,
}) {
  const [formData, setFormData] = React.useState({
    ...DEFAULT_FORM_DATA,
    ...initialData,
  });
  const [openPartnerCombo, setOpenPartnerCombo] = React.useState(false);
  const [openCenterCombo, setOpenCenterCombo] = React.useState(false);
  const [upgradationPackages, setUpgradationPackages] = React.useState([]);

  // Fetch upgradation packages once on mount; auto-select all when creating new
  React.useEffect(() => {
    refurbishmentService
      .getPackages({ category: "upgradation" })
      .then((res) => {
        const pkgs = res?.data?.packages || [];
        setUpgradationPackages(pkgs);
        // Auto-select all when not editing (initialData has no existing selection)
        const hasExistingSelection =
          Array.isArray(initialData?.upgradation_packages) &&
          initialData.upgradation_packages.length > 0;
        if (!hasExistingSelection && pkgs.length > 0) {
          setFormData((prev) => ({
            ...prev,
            upgradation_packages: pkgs.map((p) => p.id),
          }));
        }
      })
      .catch(() => setUpgradationPackages([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute filtered centers locally (no parent dependency)
  const filteredCenters = React.useMemo(() => {
    if (!formData.partnerId) return [];
    return allCenters
      .filter((c) => c.partner_id === formData.partnerId)
      .map((c) => ({ value: c.id, label: c.center_name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allCenters, formData.partnerId]);

  // Stable package selection callback (empty deps - setFormData is always stable)
  const handlePackageSelectionChange = React.useCallback((selectedIds) => {
    setFormData((prev) => ({ ...prev, packages: selectedIds }));
  }, []);

  const handleUpgradationSelectionChange = React.useCallback((selectedIds) => {
    setFormData((prev) => ({ ...prev, upgradation_packages: selectedIds }));
  }, []);

  const handlePartnerSelect = (partnerId, partnerLabel) => {
    setFormData((prev) => ({
      ...prev,
      partnerId,
      partnerName: partnerLabel,
      centerId: "",
      centerName: "",
    }));
    setOpenPartnerCombo(false);
  };

  const handleCenterSelect = (centerId, centerLabel) => {
    setFormData((prev) => ({ ...prev, centerId, centerName: centerLabel }));
    setOpenCenterCombo(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getTitle = () => {
    if (formData.id) return "Edit Scheduled Notification";
    if (formData.isInstantMode)
      return "Send Instant Refurbishment Notification";
    if (formData.isManualRequest) return "Create Manual Refurbishment Request";
    return "Schedule Notification Reminder";
  };

  const getDescription = () => {
    if (formData.id) return "Update the scheduled notification details";
    if (formData.isInstantMode)
      return "Select partner and center, then the notification will be sent immediately with all packages.";
    if (formData.isManualRequest)
      return "Create a manual refurbishment request for a specific partner and center. You can send the notification later.";
    return "Set up a notification reminder for partners about refurbishment requests.";
  };

  const getSubmitButtonText = () => {
    if (loading) return "Processing...";
    if (formData.isInstantMode) return "Send Now";
    if (formData.isManualRequest) return "Create Request";
    if (formData.id) return "Update Notification";
    return "Schedule Reminder";
  };

  return (
    <>
      <DialogHeader className="flex-shrink-0">
        <DialogTitle className="text-xl font-semibold">
          {getTitle()}
        </DialogTitle>
        <DialogDescription>{getDescription()}</DialogDescription>
      </DialogHeader>

      <form
        id="schedule-notif-form"
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto px-1"
      >
        <div className="space-y-4 pb-4">
          {/* Partner & Center */}
          {formData.partnerId && formData.centerId ? (
            <div className="p-4 bg-gray-50 rounded-md border flex gap-5">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Partner
                </Label>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formData.partnerName || formData.organization_name}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Center
                </Label>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formData.centerName}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Partner Selection */}
              <div>
                <Label htmlFor="partner">Partner *</Label>
                <Popover
                  open={openPartnerCombo}
                  onOpenChange={setOpenPartnerCombo}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={openPartnerCombo}
                      className="w-full justify-between"
                    >
                      {formData.partnerId
                        ? uniquePartners.find(
                            (p) => p.value === formData.partnerId,
                          )?.label
                        : "Select partner..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search partner..." />
                      <CommandList>
                        <CommandEmpty>No partner found.</CommandEmpty>
                        <CommandGroup>
                          {uniquePartners.map((partner) => (
                            <CommandItem
                              key={partner.value}
                              value={partner.label}
                              onSelect={() =>
                                handlePartnerSelect(
                                  partner.value,
                                  partner.label,
                                )
                              }
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.partnerId === partner.value
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {partner.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Center Selection */}
              <div>
                <Label htmlFor="center">Center *</Label>
                <Popover
                  open={openCenterCombo}
                  onOpenChange={setOpenCenterCombo}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCenterCombo}
                      className="w-full justify-between"
                      disabled={!formData.partnerId}
                    >
                      {formData.centerId
                        ? filteredCenters.find(
                            (c) => c.value === formData.centerId,
                          )?.label
                        : formData.partnerId
                          ? "Select center..."
                          : "Select partner first..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search center..." />
                      <CommandList>
                        <CommandEmpty>No center found.</CommandEmpty>
                        <CommandGroup>
                          {filteredCenters.map((center) => (
                            <CommandItem
                              key={center.value}
                              value={center.label}
                              onSelect={() =>
                                handleCenterSelect(center.value, center.label)
                              }
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.centerId === center.value
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {center.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          {/* Date / Time / Frequency - hidden for instant mode */}
          {!formData.isInstantMode && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label
                    htmlFor="reminderDate"
                    className="text-sm font-medium mb-2 block"
                  >
                    Reminder Date *
                  </Label>
                  <Input
                    id="reminderDate"
                    type="date"
                    value={formData.reminderDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        reminderDate: e.target.value,
                      }))
                    }
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="h-11 px-3 bg-white border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="reminderTime"
                    className="text-sm font-medium mb-2 block"
                  >
                    Time *
                  </Label>
                  <Input
                    id="reminderTime"
                    type="time"
                    value={formData.reminderTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        reminderTime: e.target.value,
                      }))
                    }
                    required
                    className="h-11 px-3 bg-white border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  />
                </div>
                <div>
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, frequency: value }))
                    }
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">
                        Instant (One-time)
                      </SelectItem>
                      <SelectItem value="custom">
                        Custom (Every X days)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.frequency === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customIntervalDays">
                      Interval (Days) *
                    </Label>
                    <Input
                      id="customIntervalDays"
                      type="number"
                      min="1"
                      max="365"
                      value={formData.customIntervalDays}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          customIntervalDays: Math.max(
                            1,
                            parseInt(e.target.value) || 1,
                          ),
                        }))
                      }
                      placeholder="Enter days (e.g., 5)"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      First request sent today, next after{" "}
                      {formData.customIntervalDays} day
                      {formData.customIntervalDays !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="maxOccurrences">
                      Max Occurrences (Optional)
                    </Label>
                    <Input
                      id="maxOccurrences"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.maxOccurrences || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          maxOccurrences: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        }))
                      }
                      placeholder="Leave empty for unlimited"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Stop after sending this many times (or when partner
                      responds)
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Package Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Select *
            </Label>
            <PackageSelector
              packages={packages}
              selectedPackages={formData.packages}
              onSelectionChange={handlePackageSelectionChange}
              loading={loading}
            />
            {formData.packages.length === 0 && (
              <p className="text-sm text-red-500 mt-2">
                At least one package must be selected
              </p>
            )}
          </div>

          {/* Upgradation Package Selection */}
          <div>
            <Label className="text-base font-semibold mb-1 flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-600" />
              Upgradation Packages
              <span className="text-xs font-normal text-gray-500 ml-1">
                (Optional)
              </span>
            </Label>
            <p className="text-xs text-gray-500 mb-3">
              Select upgradation packages to offer the partner. These will
              appear in the Upgradation step of the partner's response flow.
            </p>
            <PackageSelector
              packages={upgradationPackages}
              selectedPackages={formData.upgradation_packages}
              onSelectionChange={handleUpgradationSelectionChange}
              loading={false}
            />
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="notifMessage">Custom Message</Label>
            <Textarea
              id="notifMessage"
              value={formData.message}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, message: e.target.value }))
              }
              placeholder="Enter custom reminder message..."
              rows={4}
            />
          </div>
        </div>
      </form>

      <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
        <Button type="button" variant="outline" onClick={() => onClose(false)}>
          Cancel
        </Button>
        <Button type="submit" form="schedule-notif-form" disabled={loading}>
          {getSubmitButtonText()}
        </Button>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------------------------
// ScheduleNotificationModal (public API)
// ---------------------------------------------------------------------------
// This component is a THIN wrapper that renders only the Dialog shell.
// It is wrapped in React.memo with strict prop comparison so it NEVER
// re-renders unless isOpen or onClose actually changes.
//
// All interactive state (form fields, package selection) lives in
// ScheduleNotificationForm which is a CHILD of DialogContent, not an
// ancestor. This is the key architectural fix: state changes inside the
// dialog content never propagate upward to Dialog / DialogOverlay /
// RemoveScroll / Presence, preventing the setRef infinite loop.
// ---------------------------------------------------------------------------
const ScheduleNotificationModal = React.memo(
  function ScheduleNotificationModal({
    isOpen = false,
    onClose,
    onSubmit,
    initialData = {},
    uniquePartners = [],
    allCenters = [],
    packages = [],
    loading = false,
  }) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          {isOpen && (
            <ScheduleNotificationForm
              key={isOpen ? "open" : "closed"}
              initialData={initialData}
              uniquePartners={uniquePartners}
              allCenters={allCenters}
              packages={packages}
              loading={loading}
              onSubmit={onSubmit}
              onClose={onClose}
            />
          )}
        </DialogContent>
      </Dialog>
    );
  },
  // Custom comparison: only re-render the Dialog wrapper when these change
  (prev, next) =>
    prev.isOpen === next.isOpen &&
    prev.onClose === next.onClose &&
    prev.onSubmit === next.onSubmit &&
    prev.packages === next.packages &&
    prev.uniquePartners === next.uniquePartners &&
    prev.allCenters === next.allCenters &&
    // Allow re-render when modal opens to pick up fresh initialData
    (prev.isOpen === false || prev.initialData === next.initialData),
);

export default ScheduleNotificationModal;
