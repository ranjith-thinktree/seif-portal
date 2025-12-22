import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { getPartners } from "../../services/data.service";

/**
 * Center Form Component
 * Used for both create and edit operations
 */
const CenterForm = ({
  center = null,
  onSubmit,
  onCancel,
  isLoading = false,
  preselectedPartnerId = null,
}) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isPartner = user.role === "PARTNER";

  const [formData, setFormData] = useState({
    partner_id: preselectedPartnerId || "",
    center_name: "",
    center_type: "Short Term",
    region: "North",
    address: "",
    city: "",
    state: "",
    pincode: "",
    year_of_establishment: "",
    latitude: "",
    longitude: "",
    contact_person_name: "",
    contact_person_mobile: "",
    contact_person_email: "",
    seating_capacity: "",
    status: "active",
  });

  const [partners, setPartners] = useState([]);
  const [errors, setErrors] = useState({});

  // Fetch partners for dropdown (if admin)
  const fetchPartners = useCallback(async () => {
    try {
      const response = await getPartners({
        limit: 1000,
        approval_status: "approved",
      });
      setPartners(response.data.data);
    } catch (error) {
      console.error("Error fetching partners:", error);
    }
  }, []);

  useEffect(() => {
    if (!isPartner) {
      fetchPartners();
    }
  }, [isPartner, fetchPartners]);

  useEffect(() => {
    if (center) {
      setFormData({
        partner_id: center.partner_id || "",
        center_name: center.center_name || "",
        center_type: center.center_type || "Short Term",
        region: center.region || "North",
        address: center.address || "",
        city: center.city || "",
        state: center.state || "",
        pincode: center.pincode || "",
        year_of_establishment: center.year_of_establishment || "",
        latitude: center.latitude || "",
        longitude: center.longitude || "",
        contact_person_name: center.contact_person_name || "",
        contact_person_mobile: center.contact_person_mobile || "",
        contact_person_email: center.contact_person_email || "",
        seating_capacity: center.seating_capacity || "",
        status: center.status || "active",
      });
    } else if (isPartner) {
      setFormData((prev) => ({ ...prev, partner_id: user.partner_id }));
    }
  }, [center, isPartner, user.partner_id]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.partner_id) {
      newErrors.partner_id = "Partner is required";
    }

    if (!formData.center_name.trim()) {
      newErrors.center_name = "Center name is required";
    }

    if (
      formData.contact_person_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_person_email)
    ) {
      newErrors.contact_person_email = "Invalid email format";
    }

    if (
      formData.contact_person_mobile &&
      !/^\d{10}$/.test(formData.contact_person_mobile)
    ) {
      newErrors.contact_person_mobile = "Mobile must be exactly 10 digits";
    }

    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Pincode must be exactly 6 digits";
    }

    if (
      formData.year_of_establishment &&
      !/^\d{4}$/.test(formData.year_of_establishment)
    ) {
      newErrors.year_of_establishment = "Year must be 4 digits";
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
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          {center ? "Edit Center" : "Create New Center"}
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
          {/* Partner */}
          {!isPartner && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Partner <span className="text-red-500">*</span>
              </label>
              <select
                name="partner_id"
                value={formData.partner_id}
                onChange={handleChange}
                className={`flex h-10 w-full rounded-md border ${
                  errors.partner_id ? "border-red-500" : "border-input"
                } bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <option value="">Select Partner</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
              {errors.partner_id && (
                <p className="text-red-500 text-xs mt-1">{errors.partner_id}</p>
              )}
            </div>
          )}

          {/* Center Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Center Name <span className="text-red-500">*</span>
            </label>
            <Input
              name="center_name"
              value={formData.center_name}
              onChange={handleChange}
              placeholder="Enter center name"
              className={errors.center_name ? "border-red-500" : ""}
            />
            {errors.center_name && (
              <p className="text-red-500 text-xs mt-1">{errors.center_name}</p>
            )}
          </div>

          {/* Center Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Center Type
            </label>
            <select
              name="center_type"
              value={formData.center_type}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="Short Term">Short Term</option>
              <option value="Long Term">Long Term</option>
              <option value="ITI">ITI</option>
              <option value="Polytechnic">Polytechnic</option>
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Region
            </label>
            <select
              name="region"
              value={formData.region}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="Central">Central</option>
            </select>
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <Input
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Street address"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <Input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <Input
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="State"
            />
          </div>

          {/* Pincode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pincode
            </label>
            <Input
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              placeholder="123456"
              maxLength={6}
              className={errors.pincode ? "border-red-500" : ""}
            />
            {errors.pincode && (
              <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>
            )}
          </div>

          {/* Year of Establishment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year of Establishment
            </label>
            <Input
              name="year_of_establishment"
              value={formData.year_of_establishment}
              onChange={handleChange}
              placeholder="2020"
              maxLength={4}
              className={errors.year_of_establishment ? "border-red-500" : ""}
            />
            {errors.year_of_establishment && (
              <p className="text-red-500 text-xs mt-1">
                {errors.year_of_establishment}
              </p>
            )}
          </div>

          {/* Latitude */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Latitude
            </label>
            <Input
              name="latitude"
              type="number"
              step="any"
              value={formData.latitude}
              onChange={handleChange}
              placeholder="28.7041"
            />
          </div>

          {/* Longitude */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Longitude
            </label>
            <Input
              name="longitude"
              type="number"
              step="any"
              value={formData.longitude}
              onChange={handleChange}
              placeholder="77.1025"
            />
          </div>

          {/* Contact Person Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person Name
            </label>
            <Input
              name="contact_person_name"
              value={formData.contact_person_name}
              onChange={handleChange}
              placeholder="John Doe"
            />
          </div>

          {/* Contact Person Mobile */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person Mobile
            </label>
            <Input
              name="contact_person_mobile"
              value={formData.contact_person_mobile}
              onChange={handleChange}
              placeholder="1234567890"
              maxLength={10}
              className={errors.contact_person_mobile ? "border-red-500" : ""}
            />
            {errors.contact_person_mobile && (
              <p className="text-red-500 text-xs mt-1">
                {errors.contact_person_mobile}
              </p>
            )}
          </div>

          {/* Contact Person Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person Email
            </label>
            <Input
              type="email"
              name="contact_person_email"
              value={formData.contact_person_email}
              onChange={handleChange}
              placeholder="contact@example.com"
              className={errors.contact_person_email ? "border-red-500" : ""}
            />
            {errors.contact_person_email && (
              <p className="text-red-500 text-xs mt-1">
                {errors.contact_person_email}
              </p>
            )}
          </div>

          {/* Seating Capacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seating Capacity
            </label>
            <Input
              name="seating_capacity"
              type="number"
              value={formData.seating_capacity}
              onChange={handleChange}
              placeholder="50"
            />
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
              <option value="inactive">Inactive</option>
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
                {center ? "Updating..." : "Creating..."}
              </span>
            ) : (
              <span>{center ? "Update Center" : "Create Center"}</span>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default CenterForm;
