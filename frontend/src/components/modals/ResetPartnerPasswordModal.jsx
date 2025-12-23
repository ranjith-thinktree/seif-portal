import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import {
  KeyIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import {
  getPartnerLoginDetails,
  resetPartnerPassword,
} from "../../services/data.service";
import { toast } from "react-toastify";

/**
 * ResetPartnerPasswordModal Component
 * Allows admins to reset partner passwords and view login status
 */
const ResetPartnerPasswordModal = ({ isOpen, onClose, partner }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginDetails, setLoginDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch login details when modal opens
  const fetchLoginDetails = useCallback(async () => {
    if (!partner) return;

    setLoadingDetails(true);
    try {
      const response = await getPartnerLoginDetails(partner.id);
      setLoginDetails(response.data);
    } catch (error) {
      console.error("Error fetching login details:", error);
      toast.error("Failed to load partner login details");
    } finally {
      setLoadingDetails(false);
    }
  }, [partner]);

  useEffect(() => {
    if (isOpen && partner) {
      fetchLoginDetails();
    }
    return () => {
      setResetResult(null);
      setCopied(false);
    };
  }, [isOpen, partner, fetchLoginDetails]);

  const handleResetPassword = async (sendEmail) => {
    setIsLoading(true);
    try {
      const response = await resetPartnerPassword(partner.id, sendEmail);
      setResetResult(response.data);

      if (response.data.tempPassword) {
        toast.success(
          sendEmail
            ? "Password reset! Email failed, copy credentials below."
            : "Password reset! Copy credentials below."
        );
      } else {
        toast.success("Password reset successfully and email sent to partner!");
      }

      // Refresh login details
      await fetchLoginDetails();
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(error.response?.data?.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (resetResult && loginDetails) {
      const text = `=== SEIF Portal Login Credentials ===

Partner Name: ${partner.name}
Partner ID: ${loginDetails.partnerId}
Email: ${resetResult.email}
Temporary Password: ${resetResult.tempPassword}

Portal URL: ${window.location.origin}/login

IMPORTANT:
- Please change your password after first login
- This is a temporary password for security
- Keep these credentials confidential

Generated on: ${new Date().toLocaleString()}`;

      // Try modern clipboard API first, fallback to execCommand for HTTP
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            toast.success("All credentials copied to clipboard!");
            setTimeout(() => setCopied(false), 3000);
          })
          .catch((err) => {
            console.error("Failed to copy:", err);
            toast.error("Failed to copy credentials");
          });
      } else {
        // Fallback for HTTP or older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand("copy");
          textArea.remove();
          setCopied(true);
          toast.success("All credentials copied to clipboard!");
          setTimeout(() => setCopied(false), 3000);
        } catch (err) {
          console.error("Failed to copy:", err);
          textArea.remove();
          toast.error("Failed to copy credentials");
        }
      }
    }
  };

  if (!partner) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <KeyIcon className="h-5 w-5 text-primary-600" />
            Reset Partner Password
          </DialogTitle>
          <DialogDescription>
            Manage login credentials for {partner.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-2">
          {/* Login Details Section */}
          {loadingDetails ? (
            <div className="text-center py-4 text-gray-500">
              Loading login details...
            </div>
          ) : loginDetails ? (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-gray-900">
                Current Login Status
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Partner ID:</span>
                  <p className="font-medium">{loginDetails.partnerId}</p>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <p className="font-medium">{loginDetails.email}</p>
                </div>
                <div>
                  <span className="text-gray-600">Account Status:</span>
                  <p className="font-medium capitalize">
                    {loginDetails.status}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Last Login:</span>
                  <p className="font-medium">
                    {loginDetails.lastLogin
                      ? new Date(loginDetails.lastLogin).toLocaleString()
                      : "Never logged in"}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Account Created:</span>
                  <p className="font-medium">
                    {new Date(loginDetails.accountCreated).toLocaleString()}
                  </p>
                </div>
              </div>

              {!loginDetails.hasLoggedInBefore && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertDescription className="text-yellow-800">
                    ⚠️ Partner has never logged in. They may need a password
                    reset.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : null}

          {/* Reset Result Section */}
          {resetResult && resetResult.tempPassword && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="space-y-3">
                <div className="space-y-3">
                  <p className="font-semibold text-blue-900">
                    🔑 New Credentials Generated
                  </p>
                  {resetResult.warning && (
                    <p className="text-sm text-orange-700">
                      {resetResult.warning}
                    </p>
                  )}
                  <div className="space-y-2 text-sm">
                    <div className="bg-white p-3 rounded border border-blue-200">
                      <span className="text-gray-600 block mb-1">
                        Partner ID:
                      </span>
                      <p className="font-mono font-medium text-base">
                        {loginDetails?.partnerId}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-200">
                      <span className="text-gray-600 block mb-1">Email:</span>
                      <p className="font-mono font-medium text-base break-all">
                        {resetResult.email}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-200">
                      <span className="text-gray-600 block mb-1">
                        Temporary Password:
                      </span>
                      <p className="font-mono font-medium text-base break-all">
                        {resetResult.tempPassword}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-200">
                      <span className="text-gray-600 block mb-1">
                        Portal URL:
                      </span>
                      <p className="font-mono font-medium text-sm break-all text-blue-600">
                        {window.location.origin}/login
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleCopyCredentials}
                    variant="outline"
                    size="default"
                    className="w-full bg-white hover:bg-blue-50 border-blue-300"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
                        Copy All Credentials
                      </>
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Warning Message */}
          <Alert>
            <AlertDescription className="text-sm text-gray-600">
              <p className="font-semibold mb-2">What happens when you reset?</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>A new temporary password will be generated</li>
                <li>
                  Partner's old password will be replaced (they cannot use it
                  anymore)
                </li>
                <li>Partner will receive credentials via email (if enabled)</li>
                <li>Partner must change password on first login</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-shrink-0 flex-row justify-between items-center gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleResetPassword(false)}
              disabled={isLoading}
            >
              {isLoading ? "Resetting..." : "Reset (No Email)"}
            </Button>
            <Button
              onClick={() => handleResetPassword(true)}
              disabled={isLoading}
            >
              {isLoading ? "Resetting..." : "Reset & Send Email"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPartnerPasswordModal;
