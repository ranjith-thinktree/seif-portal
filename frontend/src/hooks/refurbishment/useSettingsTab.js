import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import refurbishmentService from "../../services/refurbishment.service";

export default function useSettingsTab({ refurbishmentRefresh }) {
  const [refurbishmentSettings, setRefurbishmentSettings] = useState({
    defaultCustomMessage: "Custom Message",
    firstCycleYears: 5,
    repeatCycleYears: 3,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    const loadRefurbishmentSettings = async () => {
      try {
        const response = await refurbishmentService.getSettings();
        if (response?.success && response?.data) {
          setRefurbishmentSettings(response.data);
        }
      } catch (error) {
        console.error("Error loading refurbishment settings:", error);
      }
    };

    loadRefurbishmentSettings();
  }, []);

  const handleSaveSettings = async (newSettings) => {
    try {
      setSettingsSaving(true);
      const response = await refurbishmentService.updateSettings(newSettings);
      if (response?.success && response?.data) {
        setRefurbishmentSettings(response.data);
        toast.success("Refurbishment settings updated successfully");
        refurbishmentRefresh.eligibleCenters();
        refurbishmentRefresh.allCentersData();
      } else {
        toast.error("Failed to update settings");
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error(error.response?.data?.message || "Failed to update settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  return {
    refurbishmentSettings,
    setRefurbishmentSettings,
    settingsSaving,
    handleSaveSettings,
  };
}
