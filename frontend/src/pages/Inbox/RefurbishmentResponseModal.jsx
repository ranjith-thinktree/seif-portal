import React, { useState } from "react";
import { Dialog } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import apiClient from "../../api/client";
import refurbishmentService from "../../services/refurbishment.service";
import { toast } from "react-toastify";
import {
  isPartnerImageFile,
  resolvePartnerFileUrl,
} from "../../utils/refurbishmentUtils";

const PreviewUploadThumb = ({ file, label, accent = "green" }) => {
  const [previewUrl, setPreviewUrl] = React.useState(null);
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    if (!file) return undefined;
    if (file instanceof File && isPartnerImageFile(file)) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    const remoteUrl = resolvePartnerFileUrl(file.url || file.file_url);
    if (remoteUrl && isPartnerImageFile({ ...file, url: remoteUrl })) {
      setPreviewUrl(remoteUrl);
    }
    return undefined;
  }, [file]);

  if (!file) return null;

  const name = file.name || file.file_name || "Document";
  const borderCls =
    accent === "purple"
      ? "border-purple-200 bg-purple-50/40"
      : "border-green-200 bg-green-50/40";
  const showImage = previewUrl && isPartnerImageFile(file) && !imageFailed;

  if (showImage) {
    return (
      <div
        className={`w-[148px] border rounded-xl overflow-hidden bg-white ${borderCls}`}
      >
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          title={`Open ${name}`}
        >
          <div className="aspect-square bg-gray-50 overflow-hidden">
            <img
              src={previewUrl}
              alt={name}
              className="w-full h-full object-cover"
              onError={() => setImageFailed(true)}
            />
          </div>
        </a>
        <div className="px-2.5 py-2 border-t border-gray-100">
          <p className="text-[10px] font-semibold text-gray-700 truncate">
            {label}
          </p>
          <p className="text-[10px] text-gray-500 truncate" title={name}>
            {name}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-xl p-4 ${borderCls} min-w-[200px]`}>
      <p className="text-xs font-semibold text-gray-700">{label}</p>
      <p className="text-sm text-gray-800 mt-1 truncate" title={name}>
        {name}
      </p>
    </div>
  );
};

const PackagePreviewThumb = ({ file, variant = "new" }) => {
  const [previewUrl, setPreviewUrl] = React.useState(null);
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    if (!file) return undefined;
    if (file instanceof File) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    const remoteUrl = resolvePartnerFileUrl(file.url || file.file_url);
    setPreviewUrl(remoteUrl || null);
    return undefined;
  }, [file]);

  if (!file || !previewUrl || imageFailed) {
    const name = file?.name || file?.file_name || "Image";
    return (
      <span className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded text-xs text-gray-700">
        {name}
      </span>
    );
  }

  const name = file.name || file.file_name || "Image";
  const chipCls =
    variant === "existing"
      ? "border-blue-100 bg-blue-50"
      : "border-gray-200 bg-gray-100";

  return (
    <a
      href={previewUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block w-20 h-20 rounded-lg overflow-hidden border ${chipCls}`}
      title={name}
    >
      <img
        src={previewUrl}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setImageFailed(true)}
      />
    </a>
  );
};

/**
 * RefurbishmentResponseModal Component
 * Optimized UI with horizontal course stepper, individual package justifications, and multiple images per package
 *
 * @param {boolean} isOpen - Modal open state
 * @param {Function} onClose - Callback to close modal
 * @param {Object} details - Refurbishment details from API
 * @param {string} notificationId - Notification ID
 */
const RefurbishmentResponseModal = ({
  isOpen,
  onClose,
  details,
  notificationId,
}) => {
  const [currentCourseIndex, setCurrentCourseIndex] = useState(0);
  const [selections, setSelections] = useState({});
  const [justifications, setJustifications] = useState({}); // Per package justification
  const [imageFiles, setImageFiles] = useState({}); // Per package image files
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false); // Show package preview step
  const [activePackageId, setActivePackageId] = useState(null); // Currently focused package for right panel (selection step)
  const [_previewCourseIndex, _setPreviewCourseIndex] = useState(0); // Active course tab in preview
  const [previewActivePackageId, setPreviewActivePackageId] = useState(null); // Focused package in preview detail panel
  const [previewTab, setPreviewTab] = useState(0); // Active tab in preview: course index or 'upgradation'

  // Upgradation flow state
  const [upgradationStep, setUpgradationStep] = useState(null); // null | 'prompt' | 'room' | 'packages'
  const [isFinalPreview, setIsFinalPreview] = useState(false); // false = refurbishment-only preview, true = final combined preview
  const [upgradationRequested, setUpgradationRequested] = useState(false);
  const [upgradationDetails, setUpgradationDetails] = useState({
    length_feet: "",
    breadth_feet: "",
    height_feet: "",
    justification: "",
  });
  const [upgradationPhotoFiles, setUpgradationPhotoFiles] = useState([]);
  const [upgradationSelections, setUpgradationSelections] = useState({}); // packageId -> boolean
  const [upgradationJustifications, setUpgradationJustifications] = useState(
    {},
  ); // packageId -> text
  const [upgradationImageFiles, setUpgradationImageFiles] = useState({}); // packageId -> File[]
  const [activeUpgradationPackageId, setActiveUpgradationPackageId] =
    useState(null);

  // Document upload state – shown in the final preview step
  const [refurbishmentDoc, setRefurbishmentDoc] = useState(null); // File | null
  const [upgradationDoc, setUpgradationDoc] = useState(null); // File | null

  // Pre-populated data from previous submission (when admin sends back for revision)
  const [existingImageUrls, setExistingImageUrls] = useState({}); // packageId -> [{url, name, type}]
  const [existingRefurbishmentDocUrl, setExistingRefurbishmentDocUrl] = useState(null); // {url, name}
  const [existingUpgradationDocUrl, setExistingUpgradationDocUrl] = useState(null); // {url, name}

  const currentCourse = details.courses[currentCourseIndex];
  const totalCourses = details.courses.length;
  const hasUpgradationFlow = details.has_upgradation_packages;
  const packagePreviewStepNum = totalCourses + 1;
  const upgradationStepNum = totalCourses + 2;
  const finalReviewStepNum = hasUpgradationFlow
    ? totalCourses + 3
    : totalCourses + 2;

  const renderFlowConnector = (completed) => (
    <div className="flex-1 mx-3 max-w-[60px]">
      <div
        className={`border-t-2 border-dotted ${completed ? "border-green-400" : "border-gray-300"}`}
      />
    </div>
  );

  /**
   * Shared stepper: courses → package preview → [upgradation] → final review
   * @param {'course-selection'|'package-preview'|'upgradation'|'final-review'} activeStep
   */
  const renderFlowStepper = (activeStep) => {
    const isCourseActive = activeStep === "course-selection";
    const isPackagePreviewActive = activeStep === "package-preview";
    const isUpgradationActive = activeStep === "upgradation";
    const isFinalReviewActive = activeStep === "final-review";

    const packagePreviewDone =
      isUpgradationActive || isFinalReviewActive;
    const upgradationDone =
      isFinalReviewActive && upgradationRequested;

    const stepCircle = (num, { active, done, idleClass, activeClass, doneClass }) => (
      <div
        className={`flex items-center justify-center w-9 h-9 rounded-full border-2 font-semibold text-sm ${
          active ? activeClass : done ? doneClass : idleClass
        }`}
      >
        {num}
      </div>
    );

    const stepLabel = (text, { active, done, activeClass, doneClass, idleClass }) => (
      <span
        className={`ml-2 text-sm font-medium ${active ? `${activeClass} font-semibold` : done ? doneClass : idleClass}`}
      >
        {text}
      </span>
    );

    return (
      <div className="px-8 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center">
          {details.courses.map((course, index) => (
            <React.Fragment key={course.course_id}>
              <div className="flex items-center">
                {stepCircle(index + 1, {
                  active: isCourseActive && index === currentCourseIndex,
                  done: isCourseActive
                    ? index < currentCourseIndex
                    : !isCourseActive,
                  idleClass: "bg-white text-gray-400 border-gray-300",
                  activeClass: "bg-green-600 text-white border-green-600",
                  doneClass: "bg-green-100 text-green-600 border-green-500",
                })}
                {stepLabel(course.course_name, {
                  active: isCourseActive && index === currentCourseIndex,
                  done: isCourseActive
                    ? index < currentCourseIndex
                    : !isCourseActive,
                  idleClass: "text-gray-400",
                  activeClass: "text-gray-900",
                  doneClass: "text-green-600",
                })}
              </div>
              {renderFlowConnector(
                isCourseActive
                  ? index < currentCourseIndex
                  : !isCourseActive,
              )}
            </React.Fragment>
          ))}

          <div className="flex items-center">
            {stepCircle(packagePreviewStepNum, {
              active: isPackagePreviewActive,
              done: packagePreviewDone,
              idleClass: "bg-white text-gray-400 border-gray-300",
              activeClass: "bg-green-600 text-white border-green-600",
              doneClass: "bg-green-100 text-green-600 border-green-500",
            })}
            {stepLabel("Package preview", {
              active: isPackagePreviewActive,
              done: packagePreviewDone,
              idleClass: "text-gray-400",
              activeClass: "text-gray-900",
              doneClass: "text-green-600",
            })}
          </div>

          {hasUpgradationFlow && (
            <>
              {renderFlowConnector(packagePreviewDone)}
              <div className="flex items-center">
                {stepCircle(upgradationStepNum, {
                  active: isUpgradationActive,
                  done: upgradationDone,
                  idleClass: "bg-white text-gray-400 border-gray-300",
                  activeClass: "bg-purple-600 text-white border-purple-600",
                  doneClass: "bg-purple-100 text-purple-600 border-purple-500",
                })}
                {stepLabel("Upgradation", {
                  active: isUpgradationActive,
                  done: upgradationDone,
                  idleClass: "text-gray-400",
                  activeClass: "text-purple-700",
                  doneClass: "text-purple-600",
                })}
              </div>
            </>
          )}

          {renderFlowConnector(
            isFinalReviewActive ||
              (hasUpgradationFlow ? upgradationDone : packagePreviewDone),
          )}
          <div className="flex items-center">
            {stepCircle(finalReviewStepNum, {
              active: isFinalReviewActive,
              done: false,
              idleClass: "bg-white text-gray-400 border-gray-300",
              activeClass: "bg-green-600 text-white border-green-600",
              doneClass: "bg-green-100 text-green-600 border-green-500",
            })}
            {stepLabel("Final review", {
              active: isFinalReviewActive,
              done: false,
              idleClass: "text-gray-400",
              activeClass: "text-gray-900",
              doneClass: "text-green-600",
            })}
          </div>
        </div>
      </div>
    );
  };

  // Safe JSON parse helper
  const safeJSONParse = (jsonString) => {
    if (!jsonString || jsonString === "" || jsonString === "null") {
      return [];
    }
    try {
      return JSON.parse(jsonString);
    } catch {
      console.warn("Failed to parse images JSON:", jsonString);
      return [];
    }
  };

  // Handle package selection toggle
  const togglePackageSelection = (packageId) => {
    setSelections((prev) => ({
      ...prev,
      [packageId]: !prev[packageId],
    }));
    // Set as active package to show in right panel
    setActivePackageId(packageId);
  };

  // Handle justification change per package
  const handleJustificationChange = (packageId, value) => {
    setJustifications((prev) => ({
      ...prev,
      [packageId]: value,
    }));
  };

  // Handle multiple image upload per package
  const handleImageUpload = (packageId, e) => {
    const files = Array.from(e.target.files);

    // Validate: max 5 images
    const existing = imageFiles[packageId] || [];
    if (existing.length + files.length > 5) {
      toast.error("Maximum 5 images allowed per package");
      return;
    }

    // Validate: images only, max 5MB each
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        return;
      }
      if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
        toast.error("Only JPG and PNG images are allowed");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        return;
      }
    }

    setImageFiles((prev) => ({
      ...prev,
      [packageId]: [...(prev[packageId] || []), ...files],
    }));

    toast.success(`${files.length} image(s) added`);
  };

  // Remove image from package
  const removeImage = (packageId, imageIndex) => {
    setImageFiles((prev) => {
      const updated = { ...prev };
      updated[packageId] = updated[packageId].filter(
        (_, idx) => idx !== imageIndex,
      );
      if (updated[packageId].length === 0) {
        delete updated[packageId];
      }
      return updated;
    });
  };

  const handleUpgradationJustificationChange = (packageId, value) => {
    setUpgradationJustifications((prev) => ({
      ...prev,
      [packageId]: value,
    }));
  };

  const handleUpgradationImageUpload = (packageId, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const existing = upgradationImageFiles[packageId] || [];
    if (existing.length + files.length > 5) {
      toast.error("Maximum 5 images allowed per upgradation package");
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        return;
      }
      if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
        toast.error("Only JPG and PNG images are allowed");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        return;
      }
    }

    setUpgradationImageFiles((prev) => ({
      ...prev,
      [packageId]: [...existing, ...files],
    }));
    toast.success(`${files.length} image(s) added`);
  };

  const removeUpgradationImage = (packageId, imageIndex) => {
    setUpgradationImageFiles((prev) => {
      const updated = { ...prev };
      updated[packageId] = updated[packageId].filter(
        (_, idx) => idx !== imageIndex,
      );
      if (updated[packageId].length === 0) {
        delete updated[packageId];
      }
      return updated;
    });
  };

  // Document upload handlers — Excel templates only (.xlsx / .csv)
  const handleRefurbishmentDocUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = (file.name || "").toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".csv")) {
      toast.error("Please upload an Excel file (.xlsx or .csv)");
      e.target.value = "";
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Document must be under 20MB");
      return;
    }
    setRefurbishmentDoc(file);
    toast.success(`${file.name} attached as refurbishment document`);
  };

  const handleUpgradationDocUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = (file.name || "").toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".csv")) {
      toast.error("Please upload an Excel file (.xlsx or .csv)");
      e.target.value = "";
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Document must be under 20MB");
      return;
    }
    setUpgradationDoc(file);
    toast.success(`${file.name} attached as upgradation document`);
  };

  // Navigate to next course, then show refurbishment-only preview first
  const handleNext = () => {
    if (!currentCourse?.packages?.length) {
      toast.error("No packages available for this course");
      return;
    }

    const selectedPkgs = currentCourse.packages.filter(
      (pkg) => selections[pkg.package_id],
    );

    if (selectedPkgs.length === 0) {
      toast.error("Please select at least one package for this course");
      return;
    }

    for (const pkg of selectedPkgs) {
      const justification = (justifications[pkg.package_id] || "").trim();
      const newImages = imageFiles[pkg.package_id] || [];
      const existingImages = existingImageUrls[pkg.package_id] || [];
      if (!justification) {
        toast.error(
          `Please add a justification for "${pkg.package_name}"`,
        );
        setActivePackageId(pkg.package_id);
        return;
      }
      if (newImages.length === 0 && existingImages.length === 0) {
        toast.error(
          `Please upload images of the existing lab for "${pkg.package_name}"`,
        );
        setActivePackageId(pkg.package_id);
        return;
      }
    }

    if (currentCourseIndex < totalCourses - 1) {
      setCurrentCourseIndex((prev) => prev + 1);
    } else {
      // Last course — always show refurbishment preview first
      setPreviewTab(0);
      setPreviewActivePackageId(null);
      setIsFinalPreview(false);
      setShowPreview(true);
    }
  };

  // Navigate to previous course
  const handleBack = () => {
    if (currentCourseIndex > 0) {
      setCurrentCourseIndex((prev) => prev - 1);
    }
  };

  // Go back from preview to editing
  const handleBackFromPreview = () => {
    if (isFinalPreview) {
      if (upgradationRequested) {
        setShowPreview(false);
        setUpgradationStep("packages");
      } else if (hasUpgradationFlow) {
        setShowPreview(false);
        setIsFinalPreview(false);
        setUpgradationStep("prompt");
      } else {
        setIsFinalPreview(false);
      }
      return;
    }

    setShowPreview(false);
    setCurrentCourseIndex(totalCourses - 1);
  };

  // Keep an active upgradation package selected for the right-side panel.
  // Pre-populate state from previous submission when admin sends the request back
  React.useEffect(() => {
    const prev = details.previous_submission;
    if (!prev || !prev.packages || prev.packages.length === 0) return;

    const newSelections = {};
    const newJustifications = {};
    const newExistingImages = {};

    prev.packages.forEach((pkg) => {
      newSelections[pkg.package_id] = true;
      if (pkg.justification) newJustifications[pkg.package_id] = pkg.justification;
      if (pkg.existing_images && pkg.existing_images.length > 0) {
        newExistingImages[pkg.package_id] = pkg.existing_images;
      }
    });

    setSelections(newSelections);
    setJustifications(newJustifications);
    setExistingImageUrls(newExistingImages);

    if (prev.supporting_docs?.refurbishment) {
      setExistingRefurbishmentDocUrl(prev.supporting_docs.refurbishment);
    }
    if (prev.supporting_docs?.upgradation) {
      setExistingUpgradationDocUrl(prev.supporting_docs.upgradation);
    }

    if (prev.upgradation) {
      setUpgradationDetails({
        length_feet: String(prev.upgradation.length_feet || ""),
        breadth_feet: String(prev.upgradation.breadth_feet || ""),
        height_feet: String(prev.upgradation.height_feet || ""),
        justification: prev.upgradation.justification || "",
      });
      if (prev.upgradation.package_ids?.length > 0) {
        const upgSel = {};
        prev.upgradation.package_ids.forEach((id) => { upgSel[id] = true; });
        setUpgradationSelections(upgSel);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (upgradationStep !== "packages") return;
    const firstPkg = details.upgradation_packages?.[0];
    const firstPkgId = firstPkg?.package_id || firstPkg?.id || null;
    if (!activeUpgradationPackageId && firstPkgId) {
      setActiveUpgradationPackageId(firstPkgId);
    }
  }, [
    upgradationStep,
    details.upgradation_packages,
    activeUpgradationPackageId,
  ]);

  // Jump to specific course from preview (for editing)
  const _jumpToCourse = (courseIndex) => {
    setShowPreview(false);
    setCurrentCourseIndex(courseIndex);
  };

  // Count selected packages (across all courses)
  const selectedCount = Object.values(selections).filter(Boolean).length;
  const hasRefurbishmentDocument = Boolean(
    refurbishmentDoc || existingRefurbishmentDocUrl,
  );

  // Count total packages (across all courses)
  const totalPackages = details.courses.reduce(
    (sum, course) => sum + course.packages.length,
    0,
  );

  // Get all selected packages with their data
  const _getSelectedPackages = () => {
    const selected = [];
    details.courses.forEach((course) => {
      course.packages.forEach((pkg) => {
        if (selections[pkg.package_id]) {
          selected.push({
            ...pkg,
            course_name: course.course_name,
            course_id: course.course_id,
            justification: justifications[pkg.package_id] || "",
            images: imageFiles[pkg.package_id] || [],
          });
        }
      });
    });
    return selected;
  };

  // Upload a single file: S3 presigned PUT or local backend POST
  const uploadFileToS3 = async (file, folder = "refurbishment/uploads") => {
    const result = await refurbishmentService.generateUploadUrl({
      fileName: file.name,
      fileType: file.type,
      folder,
    });

    let fileUrl;
    if (result.storageType === "local") {
      // S3 not configured — POST multipart to local backend endpoint
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await apiClient.post(
        "/partner/refurbishment/upload-local",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      fileUrl = uploadRes.data?.data?.fileUrl;
    } else {
      // S3: PUT directly to presigned URL
      const { uploadUrl, fileUrl: s3FileUrl } = result;
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok)
        throw new Error(`S3 upload failed: ${res.status} ${res.statusText}`);
      fileUrl = s3FileUrl;
    }

    return { url: fileUrl, name: file.name, size: file.size, type: file.type };
  };

  // Upload an array of File objects to S3 and return [{url, name, size, type}]
  const uploadImagesToS3 = async (files, folder = "refurbishment/images") => {
    if (!files || files.length === 0) return [];
    return Promise.all(files.map((f) => uploadFileToS3(f, folder)));
  };

  // Validate and submit response
  const handleSubmit = async () => {
    // Get all selected packages
    const selectedPackages = Object.keys(selections).filter(
      (pkgId) => selections[pkgId],
    );

    if (selectedPackages.length === 0) {
      toast.error("Please select at least one package");
      return;
    }

    if (!hasRefurbishmentDocument) {
      toast.error("Refurbishment document is required before submitting");
      return;
    }

    try {
      setSubmitting(true);

      // Upload all images to S3 and build submission data
      const submissionData = [];

      for (const pkgId of selectedPackages) {
        let imageUrls = [];

        // Include already-uploaded images from previous submission
        const prevImages = existingImageUrls[pkgId] || [];
        imageUrls = [...prevImages];

        // Upload NEW images for this package if any
        if (imageFiles[pkgId] && imageFiles[pkgId].length > 0) {
          const newUrls = await uploadImagesToS3(imageFiles[pkgId]);
          imageUrls = [...imageUrls, ...newUrls];
        }

        submissionData.push({
          package_id: pkgId,
          justification: justifications[pkgId] || "", // Optional
          image_urls: imageUrls, // Array of uploaded image URLs
        });
      }

      // Upload upgradation photos if requested
      let upgradationPhotoUrls = [];
      if (upgradationRequested && upgradationPhotoFiles.length > 0) {
        upgradationPhotoUrls = await uploadImagesToS3(
          upgradationPhotoFiles,
          "refurbishment/upgradation",
        );
      }

      let upgradationSelectedPackages = [];
      if (upgradationRequested) {
        const selectedUpgradationIds = Object.keys(
          upgradationSelections,
        ).filter((id) => upgradationSelections[id]);

        upgradationSelectedPackages = await Promise.all(
          selectedUpgradationIds.map(async (packageId) => {
            const pkgFiles = upgradationImageFiles[packageId] || [];
            const pkgImageUrls =
              pkgFiles.length > 0
                ? await uploadImagesToS3(pkgFiles, "refurbishment/upgradation")
                : [];

            return {
              package_id: packageId,
              justification: upgradationJustifications[packageId] || "",
              image_urls: pkgImageUrls,
            };
          }),
        );
      }

      await apiClient.post(
        `/notifications/${notificationId}/refurbishment-response`,
        {
          selected_packages: submissionData,
          // Document attachments: upload new file if provided, else reuse existing URL
          refurbishment_document: refurbishmentDoc
            ? await uploadFileToS3(refurbishmentDoc, "refurbishment/documents")
            : existingRefurbishmentDocUrl || null,
          upgradation_document: upgradationDoc
            ? await uploadFileToS3(upgradationDoc, "refurbishment/documents")
            : existingUpgradationDocUrl || null,
          upgradation: upgradationRequested
            ? {
                length_feet: upgradationDetails.length_feet,
                breadth_feet: upgradationDetails.breadth_feet,
                height_feet: upgradationDetails.height_feet,
                justification: upgradationDetails.justification,
                photos: upgradationPhotoUrls,
                selected_packages: upgradationSelectedPackages,
                package_ids: Object.keys(upgradationSelections).filter(
                  (id) => upgradationSelections[id],
                ),
              }
            : null,
        },
      );

      toast.success("Response submitted successfully!");
      setSubmitSuccess(true);
    } catch (error) {
      console.error("Error submitting response:", error);
      toast.error(error.response?.data?.message || "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            onClose();
            window.location.reload();
          }
        }}
      >
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => {
            onClose();
            window.location.reload();
          }}
        />
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-10 flex flex-col items-center gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Green verified badge icon */}
            <div className="flex items-center justify-center">
              <svg
                className="w-16 h-16"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M32 4L37.5 10.5L46 8L47 17L55.5 20L52 28L58 35L50.5 40L50.5 49L42 48L37.5 56L32 51L26.5 56L22 48L13.5 49L13.5 40L6 35L12 28L8.5 20L17 17L18 8L26.5 10.5Z"
                  fill="#16a34a"
                />
                <path
                  d="M21 32l7 7 15-15"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Request submitted successfully!
              </h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                We’ve received your request.
                <br />
                You’ll be notified once it’s reviewed by the admin.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                window.location.reload();
              }}
              className="mt-2 w-full py-3 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </Dialog>
    );
  }

  if (!currentCourse && !showPreview && !upgradationStep) {
    return null;
  }

  // ============================================================
  // Upgradation Prompt Step — "Do you need upgradation?"
  // ============================================================
  if (upgradationStep === "prompt") {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}></div>
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-10 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            {renderFlowStepper("upgradation")}

            {/* Prompt content */}
            <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8 py-12">
              <div className="text-center">
                <div className="flex items-center justify-center mb-6">
                  <svg
                    className="w-20 h-20"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M32 4L37.5 10.5L46 8L47 17L55.5 20L52 28L58 35L50.5 40L50.5 49L42 48L37.5 56L32 51L26.5 56L22 48L13.5 49L13.5 40L6 35L12 28L8.5 20L17 17L18 8L26.5 10.5Z"
                      fill="#16a34a"
                    />
                    <path
                      d="M21 32l7 7 15-15"
                      stroke="white"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  Do you need upgradation?
                </h2>
              </div>
              <div className="flex items-center gap-4 w-full max-w-md">
                <button
                  onClick={() => {
                    setUpgradationRequested(true);
                    setUpgradationStep("room");
                  }}
                  className="flex-1 px-10 py-3.5 rounded-2xl text-green-600 border border-green-600 text-sm font-bold transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => {
                    setUpgradationRequested(false);
                    setPreviewTab(0);
                    setPreviewActivePackageId(null);
                    setUpgradationStep(null);
                    setIsFinalPreview(true);
                    setShowPreview(true);
                  }}
                  className="flex-1 px-10 py-3.5 rounded-2xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors"
                >
                  No, Thanks.
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400"></span>
                <button
                  onClick={() => {
                    setUpgradationStep(null);
                    setIsFinalPreview(false);
                    setPreviewTab(0);
                    setShowPreview(true);
                  }}
                  className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    );
  }

  // ============================================================
  // Upgradation Room Dimension Step — collect room details
  // ============================================================
  if (upgradationStep === "room") {
    const handleRoomContinue = () => {
      const { length_feet, breadth_feet, height_feet, justification } =
        upgradationDetails;
      if (!length_feet || !breadth_feet || !height_feet) {
        toast.error("Please fill in all new room dimensions");
        return;
      }
      if (!(justification || "").trim()) {
        toast.error("Please add a justification for the new room");
        return;
      }
      if (upgradationPhotoFiles.length === 0) {
        toast.error("Please upload images of the existing lab for the new room");
        return;
      }
      setUpgradationStep("packages");
    };

    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}></div>
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-10 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            {renderFlowStepper("upgradation")}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
                NEW ROOM DIMENSION (IN FEET)
              </p>
              <div className="flex gap-4 mb-6">
                <input
                  type="number"
                  placeholder="LENGTH"
                  value={upgradationDetails.length_feet}
                  onChange={(e) =>
                    setUpgradationDetails((prev) => ({
                      ...prev,
                      length_feet: e.target.value,
                    }))
                  }
                  className="border rounded-lg px-3 py-2 text-sm w-1/3"
                />
                <input
                  type="number"
                  placeholder="BREADTH"
                  value={upgradationDetails.breadth_feet}
                  onChange={(e) =>
                    setUpgradationDetails((prev) => ({
                      ...prev,
                      breadth_feet: e.target.value,
                    }))
                  }
                  className="border rounded-lg px-3 py-2 text-sm w-1/3"
                />
                <input
                  type="number"
                  placeholder="AREA"
                  value={upgradationDetails.height_feet}
                  onChange={(e) =>
                    setUpgradationDetails((prev) => ({
                      ...prev,
                      height_feet: e.target.value,
                    }))
                  }
                  className="border rounded-lg px-3 py-2 text-sm w-1/3"
                />
              </div>

              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                JUSTIFICATION
              </p>
              <textarea
                placeholder="WRITE HERE"
                value={upgradationDetails.justification}
                onChange={(e) =>
                  setUpgradationDetails((prev) => ({
                    ...prev,
                    justification: e.target.value,
                  }))
                }
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm mb-6 resize-none"
              />

              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                UPLOAD NEW ROOM PICTURES
              </p>
              <label className="cursor-pointer inline-flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 hover:border-green-400">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    for (const file of files) {
                      if (!file.type.startsWith("image/")) {
                        toast.error(`${file.name} is not an image file`);
                        e.target.value = "";
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error(`${file.name} exceeds 5MB limit`);
                        e.target.value = "";
                        return;
                      }
                    }
                    setUpgradationPhotoFiles((prev) => [...prev, ...files]);
                    toast.success(`${files.length} image(s) added`);
                    e.target.value = "";
                  }}
                />
                <ArrowUpTrayIcon className="h-5 w-5 text-gray-700" />
                Upload images of the existing lab
              </label>
              {upgradationPhotoFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {upgradationPhotoFiles.map((file, imgIdx) => (
                    <div
                      key={`${file.name}-${imgIdx}`}
                      className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <span className="text-xs text-gray-700 truncate flex-1">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setUpgradationPhotoFiles((prev) =>
                            prev.filter((_, i) => i !== imgIdx),
                          )
                        }
                        className="text-red-500 hover:text-red-700"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
              <button
                onClick={() => setUpgradationStep("prompt")}
                className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleRoomContinue}
                className="px-8 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    );
  }

  // ============================================================
  // Upgradation Packages Step — select upgradation packages
  // ============================================================
  if (upgradationStep === "packages") {
    const upgradationPkgList = details.upgradation_packages || [];
    const selectedUpgradationCount = Object.values(
      upgradationSelections,
    ).filter(Boolean).length;
    const activeUpgradationFiles = activeUpgradationPackageId
      ? upgradationImageFiles[activeUpgradationPackageId] || []
      : [];

    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}></div>
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-10 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            {renderFlowStepper("upgradation")}

            {/* Title */}
            <div className="px-8 pt-5 pb-3">
              <h2 className="text-2xl font-bold text-gray-900">
                Upgradation Packages
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Select the upgradation packages applicable to your center
              </p>
            </div>

            {/* Package List + Justification Panel */}
            <div className="flex-1 overflow-hidden px-8 pb-6 flex gap-6 min-h-0">
              <div className="w-[52%] overflow-y-auto scrollbar-subtle space-y-3 pr-2">
                {upgradationPkgList.length === 0 ? (
                  <p className="text-sm text-gray-400 mt-4 italic">
                    No upgradation packages available for this notification.
                  </p>
                ) : (
                  upgradationPkgList.map((pkg, idx) => {
                    const pkgId = pkg.package_id || pkg.id;
                    const isSelected = upgradationSelections[pkgId] || false;
                    const pkgImages = safeJSONParse(pkg.images || "[]");
                    const imageUrl = pkgImages.length > 0 ? pkgImages[0] : null;
                    const isFocused = activeUpgradationPackageId
                      ? activeUpgradationPackageId === pkgId
                      : idx === 0;

                    return (
                      <div
                        key={pkgId}
                        onClick={() => {
                          setActiveUpgradationPackageId(pkgId);
                          setUpgradationSelections((prev) => ({
                            ...prev,
                            [pkgId]: !prev[pkgId],
                          }));
                        }}
                        className={`flex items-start justify-between gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          isFocused
                            ? "border-purple-500 bg-purple-50/30 shadow-sm"
                            : "border-gray-200 bg-white hover:border-purple-300"
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              setActiveUpgradationPackageId(pkgId);
                              setUpgradationSelections((prev) => ({
                                ...prev,
                                [pkgId]: e.target.checked,
                              }));
                            }}
                            className="flex-shrink-0 mt-0.5 h-5 w-5 rounded cursor-pointer"
                            style={{ accentColor: "#7c3aed" }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 mb-0.5">
                              PKG ID:{" "}
                              <span className="font-medium text-gray-500">
                                UPG-{String(idx + 1).padStart(2, "0")}
                              </span>
                            </p>
                            <h4
                              className={`text-sm font-semibold mb-1 leading-snug ${isSelected ? "text-purple-700" : "text-gray-900"}`}
                            >
                              {pkg.package_name}
                            </h4>
                            {pkg.description && (
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {pkg.description}
                              </p>
                            )}
                          </div>
                        </div>
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt={pkg.package_name}
                            className="flex-shrink-0 w-20 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right — Justification + Attach Images panel */}
              <div className="flex-1 bg-gray-50 rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto scrollbar-subtle">
                <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                  Justification
                </p>
                <Textarea
                  value={
                    activeUpgradationPackageId
                      ? upgradationJustifications[activeUpgradationPackageId] ||
                        ""
                      : ""
                  }
                  onChange={(e) =>
                    activeUpgradationPackageId &&
                    handleUpgradationJustificationChange(
                      activeUpgradationPackageId,
                      e.target.value,
                    )
                  }
                  placeholder="Write here"
                  rows={10}
                  disabled={!activeUpgradationPackageId}
                  className="flex-1 resize-none bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400 disabled:opacity-60 disabled:cursor-default"
                />

                <div>
                  <label
                    htmlFor={
                      activeUpgradationPackageId
                        ? `upgradation-image-upload-${activeUpgradationPackageId}`
                        : undefined
                    }
                    className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-800 transition-colors ${
                      activeUpgradationPackageId
                        ? "cursor-pointer hover:border-purple-400 hover:bg-purple-50 hover:text-purple-800"
                        : "cursor-default opacity-50"
                    }`}
                  >
                    <ArrowUpTrayIcon className="h-5 w-5 text-gray-700" />
                    <span className="text-gray-800">
                      {activeUpgradationPackageId &&
                      activeUpgradationFiles.length > 0
                        ? `${activeUpgradationFiles.length} image(s) attached`
                        : "Upload images of the existing lab"}
                    </span>
                  </label>

                  {activeUpgradationPackageId && (
                    <input
                      id={`upgradation-image-upload-${activeUpgradationPackageId}`}
                      type="file"
                      multiple
                      accept="image/jpeg,image/jpg,image/png"
                      className="hidden"
                      onChange={(e) => {
                        handleUpgradationImageUpload(
                          activeUpgradationPackageId,
                          e,
                        );
                        e.target.value = "";
                      }}
                      disabled={activeUpgradationFiles.length >= 5}
                    />
                  )}

                  {activeUpgradationPackageId &&
                    activeUpgradationFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {activeUpgradationFiles.map((file, imgIdx) => (
                          <div
                            key={`${file.name}-${imgIdx}`}
                            className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-200"
                          >
                            <span className="text-xs text-gray-700 truncate pr-2">
                              {file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                removeUpgradationImage(
                                  activeUpgradationPackageId,
                                  imgIdx,
                                )
                              }
                              className="text-red-500 hover:text-red-700"
                              title="Remove image"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-600 tracking-wide">
                  {selectedUpgradationCount} OF {upgradationPkgList.length}{" "}
                  SELECTED
                </p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setUpgradationStep("prompt")}
                    className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      const selectedUpgPkgs = upgradationPkgList.filter(
                        (pkg) =>
                          upgradationSelections[pkg.package_id || pkg.id],
                      );
                      if (selectedUpgPkgs.length === 0) {
                        toast.error(
                          "Please select at least one upgradation package",
                        );
                        return;
                      }
                      for (const pkg of selectedUpgPkgs) {
                        const pkgId = pkg.package_id || pkg.id;
                        const justification = (
                          upgradationJustifications[pkgId] || ""
                        ).trim();
                        const files = upgradationImageFiles[pkgId] || [];
                        if (!justification) {
                          toast.error(
                            `Please add a justification for "${pkg.package_name}"`,
                          );
                          setActiveUpgradationPackageId(pkgId);
                          return;
                        }
                        if (files.length === 0) {
                          toast.error(
                            `Please upload images of the existing lab for "${pkg.package_name}"`,
                          );
                          setActiveUpgradationPackageId(pkgId);
                          return;
                        }
                      }
                      setUpgradationStep(null);
                      setPreviewTab("upgradation");
                      setPreviewActivePackageId(null);
                      setIsFinalPreview(true);
                      setShowPreview(true);
                    }}
                    className="px-8 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-full transition-colors"
                  >
                    Continue to Final Review →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    );
  }

  // Render Package Preview Step
  if (showPreview) {
    // Only courses that have at least one selected package
    const coursesWithSelections = details.courses.filter((course) =>
      course.packages.some((pkg) => selections[pkg.package_id]),
    );

    // Active preview tab: could be a course index or 'upgradation'
    // isUpgradationTab is true when showing upgradation details tab
    const isUpgradationTab = previewTab === "upgradation";

    // Find which course/packages to show in detail panel
    let activeCourse = null;
    let activeCoursePkgs = [];

    if (!isUpgradationTab) {
      activeCourse =
        coursesWithSelections[previewTab] || coursesWithSelections[0];
      activeCoursePkgs = activeCourse
        ? activeCourse.packages.filter((pkg) => selections[pkg.package_id])
        : [];
    }

    const focusedPkg =
      !isUpgradationTab && previewActivePackageId
        ? activeCoursePkgs.find((p) => p.package_id === previewActivePackageId)
        : !isUpgradationTab
          ? activeCoursePkgs[0] || null
          : null;

    const _focusedImages = focusedPkg ? safeJSONParse(focusedPkg.images) : [];
    const focusedUploads = focusedPkg
      ? imageFiles[focusedPkg.package_id] || []
      : [];
    const focusedJustification = focusedPkg
      ? justifications[focusedPkg.package_id] || ""
      : "";

    const submittedDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // Upgradation preview data
    const selectedUpgradationPkgs = (details.upgradation_packages || []).filter(
      (pkg) => upgradationSelections[pkg.package_id || pkg.id],
    );

    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}></div>
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-10 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            {renderFlowStepper(
              isFinalPreview ? "final-review" : "package-preview",
            )}

            {/* Title */}
            <div className="px-8 pt-5 pb-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {isFinalPreview ? "Confirm & submit" : "Refurbishment preview"}
              </h2>
              {isFinalPreview ? (
                <p className="text-sm text-gray-500 mt-1">
                  Review your submission documents and package details before submitting.
                </p>
              ) : (
                details.has_upgradation_packages && (
                  <p className="text-sm text-gray-500 mt-1">
                    Review your selected refurbishment packages, then continue to
                    the upgradation step.
                  </p>
                )
              )}
            </div>

            {isFinalPreview ? (
              <div className="flex-1 overflow-y-auto px-8 pb-6 space-y-6 scrollbar-subtle min-h-0">
                <section className="space-y-3">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                    Submission documents
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {refurbishmentDoc || existingRefurbishmentDocUrl ? (
                      <PreviewUploadThumb
                        file={refurbishmentDoc || existingRefurbishmentDocUrl}
                        label="Refurbishment document"
                      />
                    ) : (
                      <div className="border border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-400 min-w-[200px]">
                        Refurbishment document — attach below before submitting.
                      </div>
                    )}
                    {upgradationRequested &&
                      (upgradationDoc || existingUpgradationDocUrl ? (
                        <PreviewUploadThumb
                          file={upgradationDoc || existingUpgradationDocUrl}
                          label="Upgradation document"
                          accent="purple"
                        />
                      ) : (
                        <div className="border border-dashed border-gray-200 rounded-xl p-4 text-sm text-gray-400 min-w-[200px]">
                          Upgradation document — optional, attach below if needed.
                        </div>
                      ))}
                  </div>
                </section>

                {coursesWithSelections.map((course) => {
                  const selectedPkgs = course.packages.filter(
                    (pkg) => selections[pkg.package_id],
                  );
                  if (selectedPkgs.length === 0) return null;

                  return (
                    <section key={course.course_id} className="space-y-3">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                        {course.course_name}
                      </p>
                      {selectedPkgs.map((pkg) => {
                        const pkgId = pkg.package_id;
                        const pkgJustification = justifications[pkgId] || "";
                        const newUploads = imageFiles[pkgId] || [];
                        const priorUploads = existingImageUrls[pkgId] || [];

                        return (
                          <div
                            key={pkgId}
                            className="border border-gray-200 rounded-xl p-4 bg-white space-y-3"
                          >
                            <p className="text-sm font-bold text-gray-900">
                              {pkg.package_name}
                            </p>
                            {pkgJustification.trim() && (
                              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2">
                                {pkgJustification.trim()}
                              </p>
                            )}
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                                Package uploads
                                {(newUploads.length + priorUploads.length) > 0 &&
                                  ` (${newUploads.length + priorUploads.length})`}
                              </p>
                              {newUploads.length === 0 && priorUploads.length === 0 ? (
                                <p className="text-sm text-gray-400">
                                  No images attached for this package.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {priorUploads.map((img, idx) => (
                                    <PackagePreviewThumb
                                      key={`existing-${pkgId}-${idx}`}
                                      file={img}
                                      variant="existing"
                                    />
                                  ))}
                                  {newUploads.map((file, idx) => (
                                    <PackagePreviewThumb
                                      key={`new-${pkgId}-${idx}`}
                                      file={file}
                                      variant="new"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </section>
                  );
                })}

                {upgradationRequested && (
                  <section className="space-y-3">
                    <p className="text-[11px] font-semibold text-purple-500 uppercase tracking-widest">
                      Upgradation
                    </p>
                    {selectedUpgradationPkgs.length > 0 ? (
                      selectedUpgradationPkgs.map((pkg) => {
                        const pkgId = pkg.package_id || pkg.id;
                        const pkgJustification =
                          upgradationJustifications[pkgId] || "";
                        const pkgFiles = upgradationImageFiles[pkgId] || [];

                        return (
                          <div
                            key={pkgId}
                            className="border border-purple-200 rounded-xl p-4 bg-purple-50/20 space-y-3"
                          >
                            <p className="text-sm font-bold text-purple-800">
                              {pkg.package_name}
                            </p>
                            {pkgJustification.trim() && (
                              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-white/70 rounded-lg px-3 py-2">
                                {pkgJustification.trim()}
                              </p>
                            )}
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                                Package uploads
                                {pkgFiles.length > 0 && ` (${pkgFiles.length})`}
                              </p>
                              {pkgFiles.length === 0 ? (
                                <p className="text-sm text-gray-400">
                                  No images attached for this package.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {pkgFiles.map((file, idx) => (
                                    <span
                                      key={`${pkgId}-${idx}`}
                                      className="px-2.5 py-1 bg-white border border-purple-100 rounded text-xs text-gray-700"
                                    >
                                      {file.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-400">
                        No upgradation packages selected.
                      </p>
                    )}
                  </section>
                )}
              </div>
            ) : (
              <>
            {/* Course Filter Tabs (pill style) */}
            <div className="px-8 pb-3">
              <div className="inline-flex border border-gray-200 rounded-full p-0.5 bg-gray-50">
                {coursesWithSelections.map((course, idx) => (
                  <button
                    key={course.course_id}
                    onClick={() => {
                      setPreviewTab(idx);
                      setPreviewActivePackageId(null);
                    }}
                    className={`px-5 py-1.5 text-sm font-medium rounded-full transition-colors ${
                      previewTab === idx
                        ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {course.course_name}
                  </button>
                ))}
                {upgradationRequested && (
                  <button
                    onClick={() => setPreviewTab("upgradation")}
                    className={`px-5 py-1.5 text-sm font-medium rounded-full transition-colors ${
                      previewTab === "upgradation"
                        ? "bg-white text-purple-700 shadow-sm border border-purple-200"
                        : "text-gray-500 hover:text-purple-600"
                    }`}
                  >
                    Upgradation
                  </button>
                )}
              </div>
            </div>

            {/* PACKAGE SELECTED label */}
            <div className="px-8 pb-2">
              <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
                {isUpgradationTab ? "Upgradation Details" : "Package Selected"}
              </p>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden px-8 pb-6 flex gap-6 min-h-0">
              {isUpgradationTab ? (
                /* ── Upgradation Preview ── */
                <div className="w-full overflow-y-auto scrollbar-subtle space-y-5">
                  {/* Selected Upgradation Packages */}
                  {selectedUpgradationPkgs.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Selected Upgradation Packages (
                        {selectedUpgradationPkgs.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedUpgradationPkgs.map((pkg, idx) => {
                          const pkgId = pkg.package_id || pkg.id;
                          const pkgJustification =
                            upgradationJustifications[pkgId] || "";
                          const pkgFiles = upgradationImageFiles[pkgId] || [];

                          return (
                            <div
                              key={pkgId}
                              className="p-3 rounded-xl border border-purple-200 bg-purple-50/20"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600 flex-shrink-0">
                                  {idx + 1}
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-purple-700">
                                    {pkg.package_name}
                                  </h4>
                                  {pkg.description && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {pkg.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2 pl-10 space-y-2">
                                <div>
                                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
                                    Justification
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {pkgJustification ||
                                      "No justification provided."}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
                                    Image Uploads
                                  </p>
                                  {pkgFiles.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {pkgFiles.map((file, fileIdx) => (
                                        <span
                                          key={`${file.name}-${fileIdx}`}
                                          className="px-2 py-1 bg-white border border-purple-100 rounded text-[11px] text-gray-700"
                                        >
                                          {file.name}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-400">
                                      No images attached.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedUpgradationPkgs.length === 0 && (
                    <p className="text-sm text-gray-400 italic">
                      No upgradation packages selected.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Left — package list */}
                  <div className="w-[48%] overflow-y-auto scrollbar-subtle space-y-3 pr-2">
                    {activeCoursePkgs.length === 0 ? (
                      <p className="text-sm text-gray-400 mt-4">
                        No packages selected for this course.
                      </p>
                    ) : (
                      activeCoursePkgs.map((pkg, idx) => {
                        const pkgImages = safeJSONParse(pkg.images);
                        const pkgImageUrl =
                          pkgImages.length > 0 ? pkgImages[0] : null;
                        const isFocused = previewActivePackageId
                          ? previewActivePackageId === pkg.package_id
                          : idx === 0;

                        return (
                          <div
                            key={pkg.package_id}
                            onClick={() =>
                              setPreviewActivePackageId(pkg.package_id)
                            }
                            className={`flex items-start justify-between gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                              isFocused
                                ? "border-green-500 bg-white shadow-sm"
                                : "border-gray-200 bg-gray-50 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-400 mb-0.5">
                                PKG ID:{" "}
                                <span className="font-medium text-gray-500">
                                  PKG-{String(idx + 1).padStart(2, "0")}
                                </span>
                              </p>
                              <h4 className="text-sm font-semibold text-green-600 mb-1 leading-snug">
                                {pkg.package_name}
                              </h4>
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {pkg.description}
                              </p>
                            </div>
                            {pkgImageUrl && (
                              <img
                                src={pkgImageUrl}
                                alt={pkg.package_name}
                                className="flex-shrink-0 w-20 h-16 object-cover rounded-lg border border-gray-200"
                              />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Right — detail panel */}
                  <div className="flex-1 overflow-y-auto scrollbar-subtle">
                    {focusedPkg ? (
                      <div className="border border-gray-200 rounded-xl p-6 h-full flex flex-col gap-5">
                        {/* Date + Center row */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
                              Date Submitted
                            </p>
                            <p className="text-sm text-gray-800 font-medium">
                              {submittedDate}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
                              Center Name
                            </p>
                            <p className="text-sm text-gray-800 font-medium">
                              {details.center_name}
                            </p>
                          </div>
                        </div>

                        {/* Description / Justification */}
                        <div>
                          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
                            Description
                          </p>
                          <div className="border border-gray-200 rounded-lg px-4 py-3 bg-white min-h-[80px]">
                            {focusedJustification ? (
                              <p className="text-sm text-gray-700 italic">
                                &ldquo;{focusedJustification}&rdquo;
                              </p>
                            ) : (
                              <p className="text-sm text-gray-400 italic">
                                No description provided.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* File Uploaded */}
                        <div>
                          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">
                            File Uploaded
                          </p>
                          {focusedUploads.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {focusedUploads.map((file, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-700 font-medium"
                                >
                                  {file.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">
                              No files uploaded.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-xl h-full flex items-center justify-center">
                        <p className="text-sm text-gray-400">
                          Select a package to view details
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
              </>
            )}

            {/* Document Upload Section — only shown on final preview before submit */}
            {isFinalPreview && (
              <div className="px-8 py-3 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  Attach Supporting Documents
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Refurbishment Document */}
                  <div>
                    <label className="block text-xs text-gray-600 font-medium mb-1">
                      Refurbishment Document{" "}
                      <span className="text-red-500">*</span>{" "}
                      <span className="text-gray-400 font-normal">
                        (.xlsx or .csv)
                      </span>
                    </label>
                    {refurbishmentDoc ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-xs text-green-700 font-medium truncate flex-1">
                          {refurbishmentDoc.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRefurbishmentDoc(null)}
                          className="text-red-400 hover:text-red-600 text-xs flex-shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ) : existingRefurbishmentDocUrl ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="text-xs text-blue-700 font-medium truncate flex-1">
                          {existingRefurbishmentDocUrl.name || "Previously uploaded document"}
                        </span>
                        <a
                          href={existingRefurbishmentDocUrl.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 text-xs flex-shrink-0"
                        >
                          View
                        </a>
                        <label className="text-green-600 hover:text-green-700 text-xs flex-shrink-0 cursor-pointer">
                          Replace
                          <input
                            type="file"
                            className="hidden"
                            accept=".xlsx,.csv"
                            onChange={handleRefurbishmentDocUpload}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-colors">
                        <ArrowUpTrayIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-500">
                          Click to upload
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".xlsx,.csv"
                          onChange={handleRefurbishmentDocUpload}
                        />
                      </label>
                    )}
                  </div>

                  {/* Upgradation Document — only shown if partner chose upgradation */}
                  {upgradationRequested && (
                    <div>
                      <label className="block text-xs text-gray-600 font-medium mb-1">
                        Upgradation Document{" "}
                        <span className="text-gray-400 font-normal">
                          (.xlsx or .csv)
                        </span>
                      </label>
                      {upgradationDoc ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                          <span className="text-xs text-purple-700 font-medium truncate flex-1">
                            {upgradationDoc.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setUpgradationDoc(null)}
                            className="text-red-400 hover:text-red-600 text-xs flex-shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      ) : existingUpgradationDocUrl ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <span className="text-xs text-blue-700 font-medium truncate flex-1">
                            {existingUpgradationDocUrl.name || "Previously uploaded document"}
                          </span>
                          <a
                            href={existingUpgradationDocUrl.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 text-xs flex-shrink-0"
                          >
                            View
                          </a>
                          <label className="text-green-600 hover:text-green-700 text-xs flex-shrink-0 cursor-pointer">
                            Replace
                            <input
                              type="file"
                              className="hidden"
                              accept=".xlsx,.csv"
                              onChange={handleUpgradationDocUpload}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-purple-200 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-colors">
                          <ArrowUpTrayIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-500">
                            Click to upload
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".xlsx,.csv"
                            onChange={handleUpgradationDocUpload}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-8 py-4 border-t border-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-600 tracking-wide">
                  {selectedCount} OF {totalPackages} SELECTED
                </p>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleBackFromPreview}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Back
                  </button>
                  {!isFinalPreview && details.has_upgradation_packages ? (
                    <button
                      onClick={() => {
                        setShowPreview(false);
                        setPreviewTab(0);
                        setUpgradationStep("prompt");
                      }}
                      className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-full transition-colors"
                    >
                      Continue to Upgradation →
                    </button>
                  ) : !isFinalPreview ? (
                    <button
                      onClick={() => {
                        setIsFinalPreview(true);
                        setPreviewTab(0);
                      }}
                      className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-full transition-colors"
                    >
                      Continue to Final Review →
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !hasRefurbishmentDocument}
                      title={
                        hasRefurbishmentDocument
                          ? undefined
                          : "Upload a refurbishment document to submit"
                      }
                      className="px-8 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-full transition-colors"
                    >
                      {submitting ? "Submitting..." : "Submit"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    );
  }

  // Render Course Selection Steps
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-10 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {renderFlowStepper("course-selection")}

          {/* Title */}
          <div className="px-8 pt-5 pb-3">
            <h2 className="text-2xl font-bold text-gray-900">
              Refurbishment package
            </h2>
            {details.previous_submission?.admin_remarks && (
              <div className="mt-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <span className="font-semibold">Admin remarks: </span>
                {details.previous_submission.admin_remarks}
              </div>
            )}
          </div>

          {/* Main Content — left list + right justification panel */}
          <div className="flex-1 overflow-hidden px-8 pb-6 flex gap-6 min-h-0">
            {/* Left — Package List (~55%) */}
            <div className="w-[55%] overflow-y-auto scrollbar-subtle space-y-3 pr-1">
              {currentCourse.packages.map((pkg, index) => {
                const images = safeJSONParse(pkg.images);
                const imageUrl = images.length > 0 ? images[0] : null;
                const isSelected = selections[pkg.package_id] || false;
                const isActive = activePackageId === pkg.package_id;

                return (
                  <div
                    key={pkg.package_id}
                    onClick={() => {
                      setActivePackageId(pkg.package_id);
                      togglePackageSelection(pkg.package_id);
                    }}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all bg-white ${
                      isActive
                        ? "border-green-500 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelections((prev) => ({
                          ...prev,
                          [pkg.package_id]: e.target.checked,
                        }));
                        setActivePackageId(pkg.package_id);
                      }}
                      className="flex-shrink-0 h-5 w-5 rounded border-gray-400 focus:ring-green-500 cursor-pointer"
                      style={{ accentColor: "#1f2937" }}
                    />

                    {/* Package Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">
                        PKG ID:{" "}
                        <span className="font-medium text-gray-500">
                          PKG-{String(index + 1).padStart(2, "0")}
                        </span>
                      </p>
                      <h4 className="text-sm font-semibold text-green-600 mb-1 leading-snug">
                        {pkg.package_name}
                      </h4>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {pkg.description}
                      </p>
                    </div>

                    {/* Package Image */}
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={pkg.package_name}
                        className="flex-shrink-0 w-24 h-[72px] object-cover rounded-lg border border-gray-200"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right — Justification Panel */}
            <div className="flex-1 bg-gray-50 rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto scrollbar-subtle">
              <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                Justification
              </p>

              {/* Textarea — always visible, disabled until a package is active */}
              <Textarea
                value={
                  activePackageId ? justifications[activePackageId] || "" : ""
                }
                onChange={(e) =>
                  activePackageId &&
                  handleJustificationChange(activePackageId, e.target.value)
                }
                placeholder="Write here"
                rows={10}
                disabled={!activePackageId}
                className="flex-1 resize-none bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:border-green-400 focus:ring-green-400 disabled:opacity-60 disabled:cursor-default"
              />

              {/* Upload images of the existing lab */}
              <div>
                <label
                  htmlFor={
                    activePackageId
                      ? `image-upload-${activePackageId}`
                      : undefined
                  }
                  className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-800 transition-colors ${
                    activePackageId
                      ? "cursor-pointer hover:border-green-400 hover:bg-green-50 hover:text-green-800"
                      : "cursor-default opacity-50"
                  }`}
                >
                  <ArrowUpTrayIcon className="h-5 w-5 text-gray-700" />
                  <span className="text-gray-800">
                    {activePackageId &&
                    (imageFiles[activePackageId] || []).length > 0
                      ? `${(imageFiles[activePackageId] || []).length} image(s) attached`
                      : "Upload images of the existing lab"}
                  </span>
                </label>
                {activePackageId && (
                  <input
                    id={`image-upload-${activePackageId}`}
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      handleImageUpload(activePackageId, e);
                      e.target.value = "";
                    }}
                    disabled={(imageFiles[activePackageId] || []).length >= 5}
                  />
                )}

                {/* Uploaded thumbnails */}
                {activePackageId &&
                  (imageFiles[activePackageId] || []).length > 0 && (
                    <div className="mt-3 space-y-2">
                      {(imageFiles[activePackageId] || []).map(
                        (file, imgIdx) => (
                          <div
                            key={imgIdx}
                            className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white"
                          >
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-700 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                removeImage(activePackageId, imgIdx)
                              }
                              className="text-red-400 hover:text-red-600"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                {/* Previously uploaded images (from prior submission) */}
                {activePackageId &&
                  (existingImageUrls[activePackageId] || []).length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-400 font-medium">Previously uploaded:</p>
                      {(existingImageUrls[activePackageId] || []).map(
                        (img, imgIdx) => (
                          <div
                            key={`existing-${imgIdx}`}
                            className="flex items-center gap-2 p-2 rounded-lg border border-blue-200 bg-blue-50"
                          >
                            <img
                              src={img.url}
                              alt={img.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-blue-700 truncate">
                                {img.name}
                              </p>
                              <p className="text-xs text-blue-400">
                                Previously uploaded
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                setExistingImageUrls((prev) => {
                                  const updated = { ...prev };
                                  updated[activePackageId] = (updated[activePackageId] || []).filter((_, i) => i !== imgIdx);
                                  if (updated[activePackageId].length === 0) delete updated[activePackageId];
                                  return updated;
                                })
                              }
                              className="text-red-400 hover:text-red-600"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-gray-100 bg-white">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-600 tracking-wide">
                {selectedCount} OF {totalPackages} SELECTED
              </p>
              <div className="flex items-center gap-4">
                {currentCourseIndex > 0 && (
                  <button
                    onClick={handleBack}
                    className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-full transition-colors"
                >
                  {currentCourseIndex < totalCourses - 1
                    ? "Next"
                    : "Package preview"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default RefurbishmentResponseModal;
