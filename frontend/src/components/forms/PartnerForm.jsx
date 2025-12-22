import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { MultiSelect } from "../ui/multi-select";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  getCountries,
  getStatesByCountry,
  getCitiesByStateAndCountry,
  getRegions,
  getRegisteredAsOptions,
  getOrganizationTypeOptions,
} from "../../services/data.service";

/**
 * Comprehensive Partner Onboarding Form Component
 * 18 fields with dependent dropdowns and validation
 */
const PartnerForm = ({
  partner = null,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    // Basic Information
    name: "",
    organization_type: "",
    partner_email: "",

    // Location Information
    country_id: "",
    state_id: "",
    city_id: "",
    region: "",
    address_line1: "",
    address_line2: "",
    postal_code: "",

    // Contact Information
    contact_person: "",
    contact_phone: "",
    contact_person_2_name: "",
    contact_person_2_mobile: "",

    // Legal Information
    date_of_incorporation: "",
    legal_status: "",
    registered_as: "",
    fcra_registration_number: "",
    years_of_experience: "",

    // State Presence (multi-select)
    state_presence: [],
  });

  const [errors, setErrors] = useState({});

  // Reference data
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [citySearch, setCitySearch] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [regions, setRegions] = useState([]);
  const [registeredAsOptions, setRegisteredAsOptions] = useState([]);
  const [organizationTypes, setOrganizationTypes] = useState([]);
  const [allStates, setAllStates] = useState([]); // For state presence multi-select

  // Load initial data
  useEffect(() => {
    loadReferenceData();
  }, []);

  // Load partner data for edit
  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name || "",
        organization_type: partner.organization_type || "",
        partner_email: partner.contact_email || "",
        country_id: partner.country_id || "",
        state_id: partner.state_id || "",
        city_id: partner.city_id || "",
        region: partner.region || "",
        address_line1: partner.address_line1 || "",
        address_line2: partner.address_line2 || "",
        postal_code: partner.postal_code || "",
        contact_person: partner.contact_person || "",
        contact_phone: partner.contact_phone || "",
        contact_person_2_name: partner.contact_person_2_name || "",
        contact_person_2_mobile: partner.contact_person_2_mobile || "",
        date_of_incorporation: partner.date_of_incorporation || "",
        legal_status: partner.legal_status || "",
        registered_as: partner.registered_as || "",
        fcra_registration_number: partner.fcra_registration_number || "",
        years_of_experience: partner.years_of_experience || "",
        state_presence: partner.state_presence || [],
      });
    }
  }, [partner]);

  // Load dependent data when country changes
  useEffect(() => {
    if (formData.country_id) {
      loadStates(formData.country_id);
      loadAllStatesForPresence(formData.country_id);
    } else {
      setStates([]);
      setCities([]);
      setAllStates([]);
    }
    // Reset state and city when country changes
    setFormData((prev) => ({
      ...prev,
      state_id: "",
      city_id: "",
    }));
    setCitySearch("");
    setIsCityDropdownOpen(false);
  }, [formData.country_id]);

  // Load cities when state changes OR when country selected (for countries without states)
  useEffect(() => {
    if (formData.country_id) {
      if (states.length === 0 && formData.state_id === "") {
        // Country has no states - load cities directly
        loadCities(null, formData.country_id);
      } else if (formData.state_id) {
        // Country has states and one is selected
        loadCities(formData.state_id, formData.country_id);
      } else {
        // Country has states but none selected yet
        setCities([]);
      }
    } else {
      setCities([]);
    }

    // Reset city when state changes (if not already reset)
    if (formData.city_id && formData.state_id === "") {
      setFormData((prev) => ({ ...prev, city_id: "" }));
    }
  }, [formData.state_id, formData.country_id, states.length]);

  const loadReferenceData = async () => {
    try {
      const [countriesRes, regionsRes, registeredAsRes, orgTypesRes] =
        await Promise.all([
          getCountries(),
          getRegions(),
          getRegisteredAsOptions(),
          getOrganizationTypeOptions(),
        ]);

      setCountries(countriesRes.data || []);
      setRegions(regionsRes.data || []);
      setRegisteredAsOptions(registeredAsRes.data || []);
      setOrganizationTypes(orgTypesRes.data || []);

      // Auto-detect country from IP (future enhancement)
      // For now, India as default for new partners only
      if (!partner) {
        const india = (countriesRes.data || []).find((c) => c.code === "IN");
        if (india) {
          setFormData((prev) => ({ ...prev, country_id: india.id.toString() }));
        }
      }
    } catch (error) {
      console.error("Error loading reference data:", error);
    }
  };

  const loadStates = async (countryId) => {
    try {
      const response = await getStatesByCountry(countryId);
      setStates(response.data || []);
    } catch (error) {
      console.error("Error loading states:", error);
      setStates([]);
    }
  };

  const loadAllStatesForPresence = async (countryId) => {
    try {
      const response = await getStatesByCountry(countryId);
      setAllStates(response.data || []);
    } catch (error) {
      console.error("Error loading states for presence:", error);
      setAllStates([]);
    }
  };

  const loadCities = async (stateId, countryId) => {
    try {
      const response = await getCitiesByStateAndCountry(stateId, countryId);
      const cityData = response.data || [];
      setCities(cityData);
      setFilteredCities(cityData.slice(0, 100)); // Show first 100 cities initially
      setCitySearch(""); // Reset search
    } catch (error) {
      console.error("Error loading cities:", error);
      setCities([]);
      setFilteredCities([]);
    }
  };

  // Filter cities based on search
  useEffect(() => {
    if (citySearch.trim() === "") {
      setFilteredCities(cities.slice(0, 100)); // Show first 100 when no search
    } else {
      const filtered = cities.filter((city) =>
        city.name.toLowerCase().includes(citySearch.toLowerCase())
      );
      setFilteredCities(filtered.slice(0, 100)); // Limit filtered results
    }
  }, [citySearch, cities]);

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = "Organization name is required";
    }

    if (!formData.organization_type) {
      newErrors.organization_type = "Organization type is required";
    }

    if (!formData.partner_email.trim()) {
      newErrors.partner_email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.partner_email)) {
      newErrors.partner_email = "Invalid email format";
    }

    if (!formData.country_id) {
      newErrors.country_id = "Country is required";
    }

    // State is required only if the country has states
    if (states.length > 0 && !formData.state_id) {
      newErrors.state_id = "State is required";
    }

    if (!formData.city_id) {
      newErrors.city_id = "City is required";
    }

    if (!formData.contact_person.trim()) {
      newErrors.contact_person = "Contact person name is required";
    }

    if (!formData.contact_phone.trim()) {
      newErrors.contact_phone = "Contact mobile is required";
    } else if (!/^\d{10}$/.test(formData.contact_phone)) {
      newErrors.contact_phone = "Mobile must be 10 digits";
    }

    // Optional fields validation
    if (
      formData.contact_person_2_mobile &&
      !/^\d{10}$/.test(formData.contact_person_2_mobile)
    ) {
      newErrors.contact_person_2_mobile = "Mobile must be 10 digits";
    }

    if (formData.postal_code && !/^\d{6}$/.test(formData.postal_code)) {
      newErrors.postal_code = "Postal code must be 6 digits";
    }

    if (
      formData.years_of_experience &&
      (isNaN(formData.years_of_experience) || formData.years_of_experience < 0)
    ) {
      newErrors.years_of_experience = "Must be a valid positive number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleStatePresenceChange = (selectedValues) => {
    setFormData((prev) => ({ ...prev, state_presence: selectedValues }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Card className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          {partner ? "Edit Partner" : "Create New Partner"}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target.type !== "submit") {
            e.preventDefault();
          }
        }}
        className="space-y-6"
      >
        {/* Basic Information Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Organization Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization/Partner Name{" "}
                <span className="text-red-500">*</span>
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter organization name"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Organization Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Type <span className="text-red-500">*</span>
              </label>
              <select
                name="organization_type"
                value={formData.organization_type}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.organization_type
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              >
                <option value="">Select Type</option>
                {organizationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.organization_type && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.organization_type}
                </p>
              )}
            </div>

            {/* Partner Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (for login) <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                name="partner_email"
                value={formData.partner_email}
                onChange={handleChange}
                placeholder="partner@example.com"
                className={errors.partner_email ? "border-red-500" : ""}
              />
              {errors.partner_email && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.partner_email}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Login credentials will be sent to this email
              </p>
            </div>
          </div>
        </div>

        {/* Location Information Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Location Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                name="country_id"
                value={formData.country_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.country_id ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select Country</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
              {errors.country_id && (
                <p className="text-red-500 text-xs mt-1">{errors.country_id}</p>
              )}
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <select
                name="state_id"
                value={formData.state_id}
                onChange={handleChange}
                disabled={!formData.country_id}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.state_id ? "border-red-500" : "border-gray-300"
                } ${!formData.country_id ? "bg-gray-100" : ""}`}
              >
                <option value="">Select State</option>
                {states.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.name}
                  </option>
                ))}
              </select>
              {errors.state_id && (
                <p className="text-red-500 text-xs mt-1">{errors.state_id}</p>
              )}
            </div>

            {/* City with Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (!(states.length > 0 && !formData.state_id)) {
                      setIsCityDropdownOpen(!isCityDropdownOpen);
                    }
                  }}
                  disabled={states.length > 0 && !formData.state_id}
                  className={`w-full px-3 py-2 text-left border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.city_id ? "border-red-500" : "border-gray-300"
                  } ${
                    states.length > 0 && !formData.state_id
                      ? "bg-gray-100 cursor-not-allowed"
                      : "bg-white cursor-pointer"
                  }`}
                >
                  {cities.find((c) => c.id === parseInt(formData.city_id))
                    ?.name || "Select City"}
                </button>
                {isCityDropdownOpen && cities.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    <div className="p-2 border-b">
                      <Input
                        type="text"
                        placeholder="Search cities..."
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") {
                            e.preventDefault();
                          }
                        }}
                        className="w-full"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredCities.length > 0 ? (
                        filteredCities.map((city) => (
                          <div
                            key={city.id}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                city_id: city.id.toString(),
                              }));
                              setIsCityDropdownOpen(false);
                              setCitySearch("");
                              if (errors.city_id) {
                                setErrors((prev) => ({ ...prev, city_id: "" }));
                              }
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          >
                            {city.name}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No cities found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {errors.city_id && (
                <p className="text-red-500 text-xs mt-1">{errors.city_id}</p>
              )}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Region</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.code}>
                    {region.name} ({region.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Address Line 1 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <Input
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                placeholder="Street address, building name, etc."
              />
            </div>

            {/* Address Line 2 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2 <span className="text-gray-400">(Optional)</span>
              </label>
              <Input
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
                placeholder="Apartment, suite, unit, floor, etc."
              />
            </div>

            {/* Postal Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <Input
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                placeholder="123456"
                maxLength={6}
                className={errors.postal_code ? "border-red-500" : ""}
              />
              {errors.postal_code && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.postal_code}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Person 1 Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person 1 - Name <span className="text-red-500">*</span>
              </label>
              <Input
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
                placeholder="Full name"
                className={errors.contact_person ? "border-red-500" : ""}
              />
              {errors.contact_person && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.contact_person}
                </p>
              )}
            </div>

            {/* Contact Person 1 Mobile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person 1 - Mobile{" "}
                <span className="text-red-500">*</span>
              </label>
              <Input
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                maxLength={10}
                className={errors.contact_phone ? "border-red-500" : ""}
              />
              {errors.contact_phone && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.contact_phone}
                </p>
              )}
            </div>

            {/* Contact Person 2 Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person 2 - Name{" "}
                <span className="text-gray-400">(Optional)</span>
              </label>
              <Input
                name="contact_person_2_name"
                value={formData.contact_person_2_name}
                onChange={handleChange}
                placeholder="Full name"
              />
            </div>

            {/* Contact Person 2 Mobile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person 2 - Mobile{" "}
                <span className="text-gray-400">(Optional)</span>
              </label>
              <Input
                name="contact_person_2_mobile"
                value={formData.contact_person_2_mobile}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                maxLength={10}
                className={
                  errors.contact_person_2_mobile ? "border-red-500" : ""
                }
              />
              {errors.contact_person_2_mobile && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.contact_person_2_mobile}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Legal Information Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Legal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date of Incorporation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Incorporation
              </label>
              <Input
                type="date"
                name="date_of_incorporation"
                value={formData.date_of_incorporation}
                onChange={handleChange}
              />
            </div>

            {/* Registered As */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registered As
              </label>
              <select
                name="registered_as"
                value={formData.registered_as}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Type</option>
                {registeredAsOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Legal Status */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Legal Status (ACT under which it is registered){" "}
                <span className="text-gray-400">(Optional)</span>
              </label>
              <Input
                name="legal_status"
                value={formData.legal_status}
                onChange={handleChange}
                placeholder="e.g., Societies Registration Act, 1860"
              />
            </div>

            {/* FCRA Registration Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FCRA Registration Number{" "}
                <span className="text-gray-400">(Optional)</span>
              </label>
              <Input
                name="fcra_registration_number"
                value={formData.fcra_registration_number}
                onChange={handleChange}
                placeholder="Enter FCRA registration number"
              />
            </div>

            {/* Years of Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Years of Experience in Skill Building{" "}
                <span className="text-gray-400">(Optional)</span>
              </label>
              <Input
                type="number"
                name="years_of_experience"
                value={formData.years_of_experience}
                onChange={handleChange}
                placeholder="Number of years"
                min="0"
                className={errors.years_of_experience ? "border-red-500" : ""}
              />
              {errors.years_of_experience && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.years_of_experience}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Operational Information Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Operational Information
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {/* Presence in States (Multi-select) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Presence in No. of States
              </label>
              <MultiSelect
                options={allStates.map((state) => ({
                  value: state.id,
                  label: state.name,
                }))}
                selected={formData.state_presence}
                onChange={handleStatePresenceChange}
                placeholder="Select states where partner operates..."
                searchPlaceholder="Search states..."
                emptyMessage="No states found."
                disabled={!formData.country_id}
                maxDisplay={2}
              />
              <p className="text-xs text-gray-500 mt-2">
                {formData.state_presence.length > 0
                  ? `${formData.state_presence.length} state(s) selected`
                  : "Select the states where this partner has operational presence"}
              </p>
            </div>
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
            {isLoading
              ? "Creating..."
              : partner
              ? "Update Partner"
              : "Create Partner"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default PartnerForm;
