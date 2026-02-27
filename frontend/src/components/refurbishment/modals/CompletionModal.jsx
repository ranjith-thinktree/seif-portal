import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { toast } from "react-toastify";
import refurbishmentService from "../../../services/refurbishment.service";
import { Upload, X, Image as ImageIcon } from "lucide-react";

/**
 * CompletionModal
 * Modal for admin to mark refurbishment as completed with images, statement, and date
 *
 * Props:
 * - open: boolean - Modal visibility
 * - onOpenChange: function - Handler for modal open/close
 * - requestId: string - Refurbishment request ID
 * - request: object - Request details (for display)
 * - onComplete: function - Callback after successful completion
 */
const CompletionModal = ({
  open,
  onOpenChange,
  requestId,
  request,
  onComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [completionStatement, setCompletionStatement] = useState("");
  const [completionDate, setCompletionDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [completionImages, setCompletionImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setCompletionStatement("");
      setCompletionDate(new Date().toISOString().split("T")[0]);
      setCompletionImages([]);
      setImagePreviews([]);
    }
  }, [open]);

  // Handle image file selection
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files || []);

    // Validate file count
    if (completionImages.length + files.length > 10) {
      toast.error("Maximum 10 images allowed");
      return;
    }

    // Validate file types and sizes
    const validFiles = [];
    const validPreviews = [];

    files.forEach((file) => {
      // Check file type
      if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
        toast.error(`${file.name}: Only JPG/PNG images allowed`);
        return;
      }

      // Check file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: File size exceeds 5MB`);
        return;
      }

      validFiles.push(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        validPreviews.push({
          file: file,
          url: e.target?.result,
          name: file.name,
          size: file.size,
        });

        if (validPreviews.length === validFiles.length) {
          setCompletionImages((prev) => [...prev, ...validFiles]);
          setImagePreviews((prev) => [...prev, ...validPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove image
  const handleRemoveImage = (index) => {
    setCompletionImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!completionStatement || completionStatement.trim() === "") {
      toast.error("Completion statement is required");
      return;
    }

    if (completionImages.length === 0) {
      toast.error("At least one completion image is required");
      return;
    }

    setLoading(true);
    try {
      // Upload images to S3 first
      const formData = new FormData();
      completionImages.forEach((file) => {
        formData.append("images", file);
      });

      // Upload to S3 and get URLs
      const uploadResponse = await refurbishmentService.uploadCompletionImages(
        requestId,
        formData,
      );

      if (!uploadResponse.success || !uploadResponse.data?.images) {
        throw new Error("Failed to upload images to S3");
      }

      const uploadedImages = uploadResponse.data.images;

      // Call API to mark as completed with S3 URLs
      await refurbishmentService.completeRefurbishment(requestId, {
        completion_statement: completionStatement,
        completion_date: completionDate,
        completion_images: uploadedImages, // Real S3 URLs from upload
      });

      toast.success("Refurbishment marked as completed");
      onComplete?.();
    } catch (error) {
      console.error("Error marking refurbishment as complete:", error);
      toast.error(
        error.response?.data?.message || "Failed to mark as completed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-green-700">
            Mark Refurbishment as Completed
          </DialogTitle>
          {request && (
            <div className="text-sm text-gray-600 space-y-1 pt-2">
              <p>
                <strong>Request:</strong> RQ-
                {String(request.request_number).padStart(6, "0")}
              </p>
              <p>
                <strong>Center:</strong> {request.center_name}
              </p>
              <p>
                <strong>Partner:</strong> {request.partner_name}
              </p>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Completion Date */}
          <div>
            <Label
              htmlFor="completion-date"
              className="text-sm font-semibold text-gray-700"
            >
              Completion Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="completion-date"
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Date when refurbishment work was completed
            </p>
          </div>

          {/* Completion Statement */}
          <div>
            <Label
              htmlFor="completion-statement"
              className="text-sm font-semibold text-gray-700"
            >
              Completion Statement <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="completion-statement"
              placeholder="Describe the refurbishment work completed, any challenges, and final status..."
              value={completionStatement}
              onChange={(e) => setCompletionStatement(e.target.value)}
              rows={5}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Provide detailed information about the completed refurbishment
            </p>
          </div>

          {/* Completion Images */}
          <div>
            <Label className="text-sm font-semibold text-gray-700">
              Completion Images <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-gray-500 mt-1 mb-2">
              Upload images showing completed refurbishment work (max 10 images,
              JPG/PNG only, 5MB each)
            </p>

            {/* Upload Button */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                id="completion-images-upload"
                multiple
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleImageUpload}
                className="hidden"
                disabled={loading || completionImages.length >= 10}
              />
              <label
                htmlFor="completion-images-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  Click to upload images ({completionImages.length}/10)
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  JPG or PNG, max 5MB each
                </span>
              </label>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-300">
                      <img
                        src={preview.url}
                        alt={preview.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {/* File name */}
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {preview.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(preview.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading || !completionStatement || completionImages.length === 0
            }
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? "Submitting..." : "Mark as Completed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompletionModal;
