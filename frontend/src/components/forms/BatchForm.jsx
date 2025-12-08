import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { XMarkIcon } from "@heroicons/react/24/outline";

/**
 * Batch Form Component (Modal)
 * Used for both create and edit operations
 */
const BatchForm = ({
  batch = null,
  onSubmit,
  onCancel,
  isLoading = false,
  centerId,
  partnerId,
}) => {
  const [formData, setFormData] = useState({
    center_id: centerId || "",
    partner_id: partnerId || "",
    batch_number: "",
    batch_start_date: "",
    batch_complete_date: "",
    total_students: "",
    male_students: "",
    female_students: "",
    status: "active",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (batch) {
      setFormData({
        center_id: batch.center_id || centerId || "",
        partner_id: batch.partner_id || partnerId || "",
        batch_number: batch.batch_number || "",
        batch_start_date: batch.batch_start_date
          ? batch.batch_start_date.split("T")[0]
          : "",
        batch_complete_date: batch.batch_complete_date
          ? batch.batch_complete_date.split("T")[0]
          : "",
        total_students: batch.total_students || "",
        male_students: batch.male_students || "",
        female_students: batch.female_students || "",
        status: batch.status || "active",
      });
    }
  }, [batch, centerId, partnerId]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.batch_number.trim()) {
      newErrors.batch_number = "Batch number is required";
    }

    if (!formData.batch_start_date) {
      newErrors.batch_start_date = "Batch start date is required";
    }

    if (formData.total_students && parseInt(formData.total_students) < 0) {
      newErrors.total_students = "Total students cannot be negative";
    }

    if (formData.male_students && parseInt(formData.male_students) < 0) {
      newErrors.male_students = "Male students cannot be negative";
    }

    if (formData.female_students && parseInt(formData.female_students) < 0) {
      newErrors.female_students = "Female students cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {batch ? "Edit Batch" : "Create New Batch"}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Batch Number */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Number <span className="text-red-500">*</span>
              </label>
              <Input
                name="batch_number"
                value={formData.batch_number}
                onChange={handleChange}
                placeholder="BATCH-001"
                className={errors.batch_number ? "border-red-500" : ""}
              />
              {errors.batch_number && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.batch_number}
                </p>
              )}
            </div>

            {/* Batch Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Start Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                name="batch_start_date"
                value={formData.batch_start_date}
                onChange={handleChange}
                className={errors.batch_start_date ? "border-red-500" : ""}
              />
              {errors.batch_start_date && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.batch_start_date}
                </p>
              )}
            </div>

            {/* Batch Complete Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Complete Date
              </label>
              <Input
                type="date"
                name="batch_complete_date"
                value={formData.batch_complete_date}
                onChange={handleChange}
              />
            </div>

            {/* Total Students */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Students
              </label>
              <Input
                type="number"
                name="total_students"
                value={formData.total_students}
                onChange={handleChange}
                placeholder="30"
                min="0"
                className={errors.total_students ? "border-red-500" : ""}
              />
              {errors.total_students && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.total_students}
                </p>
              )}
            </div>

            {/* Male Students */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Male Students
              </label>
              <Input
                type="number"
                name="male_students"
                value={formData.male_students}
                onChange={handleChange}
                placeholder="18"
                min="0"
                className={errors.male_students ? "border-red-500" : ""}
              />
              {errors.male_students && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.male_students}
                </p>
              )}
            </div>

            {/* Female Students */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Female Students
              </label>
              <Input
                type="number"
                name="female_students"
                value={formData.female_students}
                onChange={handleChange}
                placeholder="12"
                min="0"
                className={errors.female_students ? "border-red-500" : ""}
              />
              {errors.female_students && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.female_students}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {batch ? "Updating..." : "Creating..."}
                </span>
              ) : (
                <span>{batch ? "Update Batch" : "Create Batch"}</span>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default BatchForm;
