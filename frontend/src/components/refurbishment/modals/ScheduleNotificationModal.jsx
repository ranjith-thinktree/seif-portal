import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Check,
  ChevronsUpDown,
  Package,
  CalendarDays,
  Clock,
  RefreshCw,
  Zap,
  ClipboardList,
  Bell,
  User,
  Building2,
  MessageSquare,
} from "lucide-react";
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
// Helpers
// ---------------------------------------------------------------------------

/** Parse "HH:MM" (24h) into { hour12, minute, ampm } */
function parse24h(timeStr) {
  if (!timeStr) return { hour12: "09", minute: "00", ampm: "AM" };
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h < 12 ? "AM" : "PM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { hour12: String(h).padStart(2, "0"), minute: m, ampm };
}

/** Combine 12h parts back to "HH:MM" (24h) */
function to24h(hour12, minute, ampm) {
  let h = parseInt(hour12, 10);
  if (ampm === "AM" && h === 12) h = 0;
  else if (ampm === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${minute}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
const MINUTES = [
  "00",
  "05",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
];

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function Section({ icon, title, children, accent }) {
  const Icon = icon;
  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 ${accent || "text-green-700"}`}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-widest">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScheduleNotificationForm
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
  const [openDatePicker, setOpenDatePicker] = React.useState(false);
  const [upgradationPackages, setUpgradationPackages] = React.useState([]);

  // 12-hour time state derived from formData.reminderTime
  const parsed = parse24h(formData.reminderTime);
  const [hour12, setHour12] = React.useState(parsed.hour12);
  const [minute, setMinute] = React.useState(parsed.minute);
  const [ampm, setAmpm] = React.useState(parsed.ampm);

  // Sync time parts → formData.reminderTime whenever they change
  React.useEffect(() => {
    const t = to24h(hour12, minute, ampm);
    setFormData((prev) => ({ ...prev, reminderTime: t }));
  }, [hour12, minute, ampm]);

  // Fetch upgradation packages on mount
  React.useEffect(() => {
    refurbishmentService
      .getPackages({ category: "upgradation" })
      .then((res) => {
        const pkgs = res?.data?.packages || [];
        setUpgradationPackages(pkgs);
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

  const filteredCenters = React.useMemo(() => {
    if (!formData.partnerId) return [];
    return allCenters
      .filter((c) => c.partner_id === formData.partnerId)
      .map((c) => ({ value: c.id, label: c.center_name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allCenters, formData.partnerId]);

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

  const handleDateSelect = (date) => {
    if (!date) return;
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    setFormData((prev) => ({ ...prev, reminderDate: iso }));
    setOpenDatePicker(false);
  };

  const selectedDateObj = formData.reminderDate
    ? new Date(formData.reminderDate + "T00:00:00")
    : null;

  const displayDate = selectedDateObj
    ? selectedDateObj.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Pick a date";

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getTitle = () => {
    if (formData.id) return "Edit Scheduled Notification";
    if (formData.isInstantMode) return "Send Instant Notification";
    if (formData.isManualRequest) return "Create Manual Request";
    return "Schedule Notification Reminder";
  };

  const getHeaderIcon = () => {
    if (formData.isInstantMode) return Zap;
    if (formData.isManualRequest) return ClipboardList;
    return Bell;
  };

  const getDescription = () => {
    if (formData.id) return "Update the scheduled notification details";
    if (formData.isInstantMode)
      return "Notification will be sent immediately with all packages.";
    if (formData.isManualRequest)
      return "Create a manual refurbishment request for a specific partner and center.";
    return "Set up a notification reminder for partners about refurbishment requests.";
  };

  const getSubmitButtonText = () => {
    if (loading) return "Processing...";
    if (formData.isInstantMode) return "Send Now";
    if (formData.isManualRequest) return "Create Request";
    if (formData.id) return "Update Notification";
    return "Schedule Reminder";
  };

  const HeaderIcon = getHeaderIcon();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Modal Header ─────────────────────────────────────────────── */}
      <div className="px-7 pt-7 pb-5 border-b border-gray-100 shrink-0">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
            <HeaderIcon className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-gray-900 leading-tight">
              {getTitle()}
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-0.5">{getDescription()}</p>
          </div>
        </div>
      </div>

      {/* ── Scrollable Body ───────────────────────────────────────────── */}
      <form
        id="schedule-notif-form"
        onSubmit={handleSubmit}
        className="flex-1 min-h-0 overflow-y-auto px-7 py-6 space-y-7"
      >
        {/* ── Partner & Center ── */}
        <Section
          icon={formData.partnerId && formData.centerId ? Building2 : User}
          title="Partner & Center"
        >
          {formData.partnerId && formData.centerId ? (
            <div className="flex items-center gap-4 p-4 bg-green-50/60 border border-green-100 rounded-2xl">
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
                  Partner
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {formData.partnerName || formData.organization_name}
                </p>
              </div>
              <div className="w-px h-8 bg-green-200" />
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
                  Center
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {formData.centerName}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-700" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Partner combobox */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Partner <span className="text-red-400">*</span>
                </Label>
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
                      className="w-full justify-between h-11 rounded-xl border-gray-200 bg-white text-sm font-normal"
                    >
                      <span
                        className={
                          formData.partnerId ? "text-gray-900" : "text-gray-400"
                        }
                      >
                        {formData.partnerId
                          ? uniquePartners.find(
                              (p) => p.value === formData.partnerId,
                            )?.label
                          : "Select partner…"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-72 p-0 rounded-xl shadow-lg"
                    align="start"
                  >
                    <Command>
                      <CommandInput
                        placeholder="Search partner…"
                        className="h-10 text-sm"
                      />
                      <CommandList className="max-h-56">
                        <CommandEmpty className="py-6 text-center text-sm text-gray-400">
                          No partner found.
                        </CommandEmpty>
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
                              className="text-sm"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 text-green-600",
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

              {/* Center combobox */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Center <span className="text-red-400">*</span>
                </Label>
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
                      className="w-full justify-between h-11 rounded-xl border-gray-200 bg-white text-sm font-normal"
                      disabled={!formData.partnerId}
                    >
                      <span
                        className={
                          formData.centerId ? "text-gray-900" : "text-gray-400"
                        }
                      >
                        {formData.centerId
                          ? filteredCenters.find(
                              (c) => c.value === formData.centerId,
                            )?.label
                          : formData.partnerId
                            ? "Select center…"
                            : "Select partner first"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-72 p-0 rounded-xl shadow-lg"
                    align="start"
                  >
                    <Command>
                      <CommandInput
                        placeholder="Search center…"
                        className="h-10 text-sm"
                      />
                      <CommandList className="max-h-56">
                        <CommandEmpty className="py-6 text-center text-sm text-gray-400">
                          No center found.
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredCenters.map((center) => (
                            <CommandItem
                              key={center.value}
                              value={center.label}
                              onSelect={() =>
                                handleCenterSelect(center.value, center.label)
                              }
                              className="text-sm"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 text-green-600",
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
            </div>
          )}
        </Section>

        {/* ── Date / Time / Frequency ── (hidden for instant mode) */}
        {!formData.isInstantMode && (
          <Section icon={CalendarDays} title="Schedule">
            {/* Date + Time row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Date picker */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Reminder Date <span className="text-red-400">*</span>
                </Label>
                <Popover open={openDatePicker} onOpenChange={setOpenDatePicker}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={`w-full h-11 px-4 rounded-xl border text-sm text-left flex items-center gap-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        selectedDateObj
                          ? "border-green-300 bg-green-50/50 text-gray-900"
                          : "border-gray-200 bg-white text-gray-400 hover:border-green-300"
                      }`}
                    >
                      <CalendarDays
                        className={`w-4 h-4 shrink-0 ${
                          selectedDateObj ? "text-green-600" : "text-gray-400"
                        }`}
                      />
                      <span className={selectedDateObj ? "font-medium" : ""}>
                        {displayDate}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 rounded-2xl shadow-xl border-0"
                    align="start"
                  >
                    <Calendar
                      selected={selectedDateObj}
                      onSelect={handleDateSelect}
                      minDate={new Date()}
                      className="rounded-2xl"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time picker */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Time <span className="text-red-400">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  {/* Clock icon */}
                  <div className="w-9 h-11 flex items-center justify-center shrink-0 rounded-xl border border-gray-200 bg-gray-50">
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                  {/* Hour */}
                  <Select value={hour12} onValueChange={setHour12}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white w-[72px] text-sm font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-52">
                      {HOURS.map((h) => (
                        <SelectItem
                          key={h}
                          value={h}
                          className="text-sm font-medium text-center"
                        >
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-gray-400 font-bold text-base shrink-0">
                    :
                  </span>
                  {/* Minute */}
                  <Select value={minute} onValueChange={setMinute}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white w-[72px] text-sm font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-52">
                      {MINUTES.map((m) => (
                        <SelectItem
                          key={m}
                          value={m}
                          className="text-sm font-medium text-center"
                        >
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* AM / PM toggle */}
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden h-11 shrink-0">
                    {["AM", "PM"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setAmpm(p)}
                        className={`px-4 text-sm font-semibold transition-colors ${
                          ampm === p
                            ? "bg-green-600 text-white"
                            : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Frequency */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Frequency <span className="text-red-400">*</span>
              </Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, frequency: value }))
                }
              >
                <SelectTrigger className="h-11 rounded-xl border-gray-200 bg-white text-sm">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                    <SelectValue placeholder="Select frequency" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="instant">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Instant (One-time)
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                      Custom (Every X days)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom interval */}
            {formData.frequency === "custom" && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Interval (Days) <span className="text-red-400">*</span>
                  </Label>
                  <Input
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
                    placeholder="e.g. 7"
                    required
                    className="h-11 rounded-xl border-blue-200 bg-white"
                  />
                  <p className="text-[11px] text-gray-500">
                    Repeats every {formData.customIntervalDays} day
                    {formData.customIntervalDays !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Max Occurrences
                    <span className="text-gray-400 font-normal ml-1">
                      (optional)
                    </span>
                  </Label>
                  <Input
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
                    placeholder="Leave empty = unlimited"
                    className="h-11 rounded-xl border-blue-200 bg-white"
                  />
                  <p className="text-[11px] text-gray-500">
                    Stops after sending this many times
                  </p>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* ── Refurbishment Packages ── */}
        <Section icon={Package} title="Refurbishment Packages">
          <PackageSelector
            packages={packages}
            selectedPackages={formData.packages}
            onSelectionChange={handlePackageSelectionChange}
            loading={loading}
          />
          {formData.packages.length === 0 && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />
              At least one package must be selected
            </p>
          )}
        </Section>

        {/* ── Upgradation Packages ── */}
        <Section
          icon={Package}
          title="Upgradation Packages"
          accent="text-purple-700"
        >
          <p className="text-xs text-gray-500 -mt-1">
            These will appear in the Upgradation step of the partner's response
            flow.
          </p>
          <PackageSelector
            packages={upgradationPackages}
            selectedPackages={formData.upgradation_packages}
            onSelectionChange={handleUpgradationSelectionChange}
            loading={false}
          />
        </Section>

        {/* ── Custom Message ── */}
        <Section icon={MessageSquare} title="Custom Message">
          <Textarea
            value={formData.message}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, message: e.target.value }))
            }
            placeholder="Enter a custom reminder message for the partner…"
            rows={3}
            className="rounded-xl border-gray-200 resize-none text-sm"
          />
        </Section>
      </form>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="px-7 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 shrink-0">
        <button
          type="button"
          onClick={() => onClose(false)}
          className="px-5 py-2.5 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="schedule-notif-form"
          disabled={loading || formData.packages.length === 0}
          className="px-7 py-2.5 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {getSubmitButtonText()}
        </button>
      </div>
    </div>
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
        <DialogContent
          className="max-w-2xl h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl gap-0"
          aria-describedby={undefined}
        >
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
