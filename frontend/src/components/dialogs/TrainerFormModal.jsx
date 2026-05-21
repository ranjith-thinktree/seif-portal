import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { SearchableSelect } from "../../components/ui/searchable-select";
import { toast } from "react-toastify";
import { createTrainer, updateTrainer } from "../../services/trainer.service";

const TrainerFormModal = ({
  isOpen,
  mode,
  trainer,
  filterOptions,
  availableCenters,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    partner_id: "",
    center_id: "",
    trainer_name: "",
    email: "",
    mobile_no: "",
    course_name: "",
    qualification: "",
    date_of_joining: "",
    training_partner: "",
    training_centre_name: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState({
    resume: null,
    qualificationCertificate: null,
    idProof: null,
  });
  const isViewMode = mode === "view";

  const getFileUrl = (fileUrl) => {
    if (!fileUrl) return "";
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      return fileUrl;
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
    const backendBaseUrl = apiBaseUrl.replace(/\/api\/v1\/?$/, "");

    if (!backendBaseUrl) return fileUrl;
    return `${backendBaseUrl}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
  };

  const existingDocuments = {
    resume: {
      url: getFileUrl(trainer?.resume_file_url),
      name: trainer?.resume_file_name || "Resume",
    },
    qualificationCertificate: {
      url: getFileUrl(trainer?.qualification_certificate_url),
      name:
        trainer?.qualification_certificate_name || "Qualification Certificate",
    },
    idProof: {
      url: getFileUrl(trainer?.id_proof_file_url),
      name: trainer?.id_proof_file_name || "ID Proof",
    },
  };

  // Initialize form with trainer data when editing
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && trainer) {
      setFormData({
        partner_id: trainer.partner_id || "",
        center_id: trainer.center_id || "",
        trainer_name: trainer.trainer_name || "",
        email: trainer.email || "",
        mobile_no: trainer.mobile_no || "",
        course_name: trainer.course_name || "",
        qualification: trainer.qualification || "",
        date_of_joining: trainer.date_of_joining || "",
        training_partner: trainer.training_partner || "",
        training_centre_name: trainer.training_centre_name || "",
      });
    } else {
      setFormData({
        partner_id: "",
        center_id: "",
        trainer_name: "",
        email: "",
        mobile_no: "",
        course_name: "",
        qualification: "",
        date_of_joining: "",
        training_partner: "",
        training_centre_name: "",
      });
    }
    setErrors({});
    setDocuments({
      resume: null,
      qualificationCertificate: null,
      idProof: null,
    });
  }, [mode, trainer, isOpen, filterOptions]);

  // Auto-populate training_partner when partner is selected
  useEffect(() => {
    if (formData.partner_id) {
      const partner = filterOptions.partners.find(
        (p) => p.id === formData.partner_id,
      );
      setFormData((prev) => ({
        ...prev,
        training_partner: partner?.name || "",
      }));
    }
  }, [formData.partner_id, filterOptions.partners]);

  // Auto-populate training_centre_name when center is selected
  useEffect(() => {
    if (formData.center_id) {
      const center = filterOptions.centers.find(
        (c) => c.id === formData.center_id,
      );
      setFormData((prev) => ({
        ...prev,
        training_centre_name: center?.name || "",
      }));
    }
  }, [formData.center_id, filterOptions.centers]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.partner_id) {
      newErrors.partner_id = "Partner is required";
    }
    if (!formData.center_id) {
      newErrors.center_id = "Center is required";
    }
    if (!formData.trainer_name.trim()) {
      newErrors.trainer_name = "Trainer name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.mobile_no.trim()) {
      newErrors.mobile_no = "Mobile number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isViewMode) {
      onClose();
      return;
    }

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      let response;
      const payload = {
        ...formData,
        ...documents,
      };

      if (mode === "create") {
        response = await createTrainer(payload);
      } else {
        response = await updateTrainer(trainer.id, payload);
      }

      if (response.success) {
        toast.success(
          mode === "create"
            ? "Trainer created successfully"
            : "Trainer updated successfully",
        );
        onSubmit();
        onClose();
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(error.message || "Failed to save trainer");
    } finally {
      setLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleFileChange = (name, file) => {
    setDocuments((prev) => ({
      ...prev,
      [name]: file || null,
    }));
  };

  // Get available centers for selected partner
  const availableCentersForPartner = formData.partner_id
    ? filterOptions.centers.filter((c) => c.partner_id === formData.partner_id)
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "Create New Trainer"
              : mode === "view"
                ? "Trainer Profile"
                : "Edit Trainer"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new trainer to the system"
              : mode === "view"
                ? "View trainer information"
                : "Update trainer information"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Partner Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="partner_id" className="text-sm font-medium">
                Partner <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                options={filterOptions.partners.map((partner) => ({
                  value: partner.id,
                  label: partner.name,
                }))}
                value={formData.partner_id}
                onChange={(value) =>
                  handleInputChange({ target: { name: "partner_id", value } })
                }
                placeholder="Select partner"
                searchPlaceholder="Search partners..."
                disabled={isViewMode}
              />
              {errors.partner_id && (
                <p className="text-red-500 text-xs mt-1">{errors.partner_id}</p>
              )}
            </div>

            {/* Center Selection */}
            <div>
              <Label htmlFor="center_id" className="text-sm font-medium">
                Center <span className="text-red-500">*</span>
              </Label>
              <SearchableSelect
                options={availableCentersForPartner.map((center) => ({
                  value: center.id,
                  label: center.name,
                }))}
                value={formData.center_id}
                onChange={(value) =>
                  handleInputChange({ target: { name: "center_id", value } })
                }
                placeholder={
                  formData.partner_id ? "Select center" : "Select partner first"
                }
                searchPlaceholder="Search centers..."
                disabled={isViewMode || !formData.partner_id}
              />
              {errors.center_id && (
                <p className="text-red-500 text-xs mt-1">{errors.center_id}</p>
              )}
            </div>
          </div>

          {/* Trainer Name */}
          <div>
            <Label htmlFor="trainer_name" className="text-sm font-medium">
              Trainer Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="trainer_name"
              name="trainer_name"
              value={formData.trainer_name}
              onChange={handleInputChange}
              placeholder="Enter trainer name"
              disabled={isViewMode}
              readOnly={isViewMode}
              className={errors.trainer_name ? "border-red-500" : ""}
            />
            {errors.trainer_name && (
              <p className="text-red-500 text-xs mt-1">{errors.trainer_name}</p>
            )}
          </div>

          {/* Email and Mobile */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email"
                disabled={isViewMode}
                readOnly={isViewMode}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="mobile_no" className="text-sm font-medium">
                Mobile Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="mobile_no"
                name="mobile_no"
                value={formData.mobile_no}
                onChange={handleInputChange}
                placeholder="Enter mobile number"
                disabled={isViewMode}
                readOnly={isViewMode}
                className={errors.mobile_no ? "border-red-500" : ""}
              />
              {errors.mobile_no && (
                <p className="text-red-500 text-xs mt-1">{errors.mobile_no}</p>
              )}
            </div>
          </div>

          {/* Course Name and Qualification */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="course_name" className="text-sm font-medium">
                Course Name
              </Label>
              <Input
                id="course_name"
                name="course_name"
                value={formData.course_name}
                onChange={handleInputChange}
                placeholder="Enter course name"
                disabled={isViewMode}
                readOnly={isViewMode}
              />
            </div>

            <div>
              <Label htmlFor="qualification" className="text-sm font-medium">
                Qualification
              </Label>
              <Input
                id="qualification"
                name="qualification"
                value={formData.qualification}
                onChange={handleInputChange}
                placeholder="Enter qualification"
                disabled={isViewMode}
                readOnly={isViewMode}
              />
            </div>
          </div>

          {/* Date of Joining */}
          <div>
            <Label htmlFor="date_of_joining" className="text-sm font-medium">
              Date of Joining
            </Label>
            <Input
              id="date_of_joining"
              name="date_of_joining"
              type="date"
              value={formData.date_of_joining}
              onChange={handleInputChange}
              disabled={isViewMode}
              readOnly={isViewMode}
            />
          </div>

          {/* Trainer Documents */}
          <div className="space-y-3 border rounded-md p-4 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">
              Trainer Documents
            </h3>

            <div>
              <Label htmlFor="resume" className="text-sm font-medium">
                Resume
              </Label>
              {!isViewMode && (
                <Input
                  id="resume"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) =>
                    handleFileChange("resume", e.target.files?.[0] || null)
                  }
                />
              )}
              {existingDocuments.resume.url && (
                <a
                  href={existingDocuments.resume.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline inline-block mt-1"
                >
                  View current: {existingDocuments.resume.name}
                </a>
              )}
            </div>

            <div>
              <Label
                htmlFor="qualificationCertificate"
                className="text-sm font-medium"
              >
                Qualification Certificate
              </Label>
              {!isViewMode && (
                <Input
                  id="qualificationCertificate"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) =>
                    handleFileChange(
                      "qualificationCertificate",
                      e.target.files?.[0] || null,
                    )
                  }
                />
              )}
              {existingDocuments.qualificationCertificate.url && (
                <a
                  href={existingDocuments.qualificationCertificate.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline inline-block mt-1"
                >
                  View current:{" "}
                  {existingDocuments.qualificationCertificate.name}
                </a>
              )}
            </div>

            <div>
              <Label htmlFor="idProof" className="text-sm font-medium">
                ID Proof
              </Label>
              {!isViewMode && (
                <Input
                  id="idProof"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) =>
                    handleFileChange("idProof", e.target.files?.[0] || null)
                  }
                />
              )}
              {existingDocuments.idProof.url && (
                <a
                  href={existingDocuments.idProof.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline inline-block mt-1"
                >
                  View current: {existingDocuments.idProof.name}
                </a>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {isViewMode ? "Close" : "Cancel"}
            </Button>
            {!isViewMode && (
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary-500 hover:bg-primary-600"
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⚙️</span>
                    {mode === "create" ? "Creating..." : "Updating..."}
                  </>
                ) : mode === "create" ? (
                  "Create Trainer"
                ) : (
                  "Update Trainer"
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TrainerFormModal;
