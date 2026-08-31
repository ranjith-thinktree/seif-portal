import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { MultiSelect } from "../ui/multi-select";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../hooks/useAuth";
import { STORAGE_KEYS } from "../../constants";
import {
  getPartners,
  getCourses,
  getCountries,
  getStatesByCountry,
  getCitiesByStateAndCountry,
} from "../../services/data.service";

/**
 * Comprehensive Center Form - 15 Fields
 * With dependent dropdowns and course multi-select
 */
const CenterForm = ({
  center = null,
  onSubmit,
  onCancel,
  isLoading = false,
  preselectedPartnerId = null,
}) => {
  const { user: authUser, role, partnerId } = useAuth();
  let storedUser = {};
  try {
    storedUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || "{}");
  } catch {
    storedUser = {};
  }
  const user = authUser || storedUser;
  const userRole = user?.role || role;
  const isPartner = userRole === "PARTNER";
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);
  const resolvedPartnerId =
    preselectedPartnerId || partnerId || user?.partner_id || "";

  const [formData, setFormData] = useState({
    partner_id: resolvedPartnerId,
    center_name: "",
    center_type: "Short term",
    course_ids: [],
    region: "N",
    country_id: "",
    state_id: "",
    city_id: "",
    country: "",
    state: "",
    city: "",
    address: "",
    year_of_establishment: "",
    status: "active",
    center_head: "",
    mobile_number: "",
    email: "",
  });

  const [partners, setPartners] = useState([]);
  const [courses, setCourses] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [citySearch, setCitySearch] = useState("");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [errors, setErrors] = useState({});

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

  const fetchCourses = useCallback(async () => {
    try {
      const response = await getCourses();
      console.log("Full API response:", response);

      // Response structure: { success: true, data: [...courses] or {course} }
      const coursesData = response?.data || response || [];

      // Handle both array and single object
      let coursesArray = [];
      if (Array.isArray(coursesData)) {
        coursesArray = coursesData;
      } else if (coursesData && typeof coursesData === "object") {
        // Single object returned - wrap in array
        coursesArray = [coursesData];
      }

      setCourses(coursesArray);
      console.log("Courses set:", coursesArray.length, "courses");
    } catch (error) {
      console.error("Error fetching courses:", error);
      setCourses([]);
    }
  }, []);

  const fetchCountries = useCallback(async () => {
    try {
      const response = await getCountries();
      setCountries(response.data || []);
      if (!center) {
        const india = (response.data || []).find((c) => c.code === "IN");
        if (india) {
          setFormData((prev) => ({ ...prev, country_id: india.id.toString() }));
        }
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  }, [center]);

  const fetchStates = useCallback(async (countryId) => {
    try {
      const response = await getStatesByCountry(countryId);
      setStates(response.data || []);
      setCities([]);
      setFilteredCities([]);
    } catch (error) {
      console.error("Error fetching states:", error);
      setStates([]);
    }
  }, []);

  const fetchCities = useCallback(async (stateId, countryId) => {
    try {
      const response = await getCitiesByStateAndCountry(stateId, countryId);
      const cityData = response.data || [];
      setCities(cityData);
      setFilteredCities(cityData.slice(0, 100));
      setCitySearch("");
    } catch (error) {
      console.error("Error fetching cities:", error);
      setCities([]);
      setFilteredCities([]);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchPartners();
    fetchCourses();
    fetchCountries();
  }, [isAdmin, fetchPartners, fetchCourses, fetchCountries]);

  useEffect(() => {
    if (!isPartner || !resolvedPartnerId) return;
    setFormData((prev) =>
      prev.partner_id === resolvedPartnerId
        ? prev
        : { ...prev, partner_id: resolvedPartnerId },
    );
  }, [isPartner, resolvedPartnerId]);

  useEffect(() => {
    if (formData.country_id) {
      fetchStates(formData.country_id);
      const selectedCountry = countries.find(
        (c) => c.id === parseInt(formData.country_id)
      );
      if (selectedCountry) {
        setFormData((prev) => ({ ...prev, country: selectedCountry.name }));
      }
    } else {
      setStates([]);
      setCities([]);
    }
  }, [formData.country_id, fetchStates, countries]);

  useEffect(() => {
    if (formData.country_id) {
      if (states.length === 0 && formData.state_id === "") {
        fetchCities(null, formData.country_id);
      } else if (formData.state_id) {
        fetchCities(formData.state_id, formData.country_id);
        const selectedState = states.find(
          (s) => s.id === parseInt(formData.state_id)
        );
        if (selectedState) {
          setFormData((prev) => ({ ...prev, state: selectedState.name }));
        }
      } else {
        setCities([]);
      }
    }
  }, [
    formData.state_id,
    formData.country_id,
    states.length,
    fetchCities,
    states,
  ]);

  useEffect(() => {
    if (citySearch.trim() === "") {
      setFilteredCities(cities.slice(0, 100));
    } else {
      const filtered = cities.filter((city) =>
        city.name.toLowerCase().includes(citySearch.toLowerCase())
      );
      setFilteredCities(filtered.slice(0, 100));
    }
  }, [citySearch, cities]);

  useEffect(() => {
    if (center) {
      setFormData({
        partner_id: center.partner_id || "",
        center_name: center.center_name || "",
        center_type: center.center_type || "Short term",
        course_ids: center.courses ? center.courses.map((c) => c.id) : [],
        region: center.region || "N",
        country_id: center.country_id ? center.country_id.toString() : "",
        state_id: center.state_id ? center.state_id.toString() : "",
        city_id: center.city_id ? center.city_id.toString() : "",
        country: center.country || "",
        state: center.state || "",
        city: center.city || "",
        address: center.address || "",
        year_of_establishment: center.year_of_establishment || "",
        status: center.status || "active",
        center_head: center.center_head || "",
        mobile_number: center.mobile_number || "",
        email: center.email || "",
      });
    }
  }, [center]);

  const validateForm = () => {
    const newErrors = {};
    const partnerIdValue = formData.partner_id || resolvedPartnerId;
    if (!isPartner && !partnerIdValue)
      newErrors.partner_id = "Partner is required";
    if (!formData.center_name.trim())
      newErrors.center_name = "Center name is required";
    if (!formData.country_id) newErrors.country_id = "Country is required";
    if (states.length > 0 && !formData.state_id)
      newErrors.state_id = "State is required";
    if (!formData.city_id) newErrors.city_id = "City is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (formData.mobile_number && !/^\d{10}$/.test(formData.mobile_number)) {
      newErrors.mobile_number = "Mobile must be exactly 10 digits";
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
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));

    if (name === "country_id") {
      setFormData((prev) => ({
        ...prev,
        state_id: "",
        city_id: "",
        state: "",
        city: "",
      }));
      setCitySearch("");
      setIsCityDropdownOpen(false);
    } else if (name === "state_id") {
      setFormData((prev) => ({ ...prev, city_id: "", city: "" }));
      setCitySearch("");
      setIsCityDropdownOpen(false);
    } else if (name === "city_id") {
      const selectedCity = cities.find((c) => c.id === parseInt(value));
      if (selectedCity) {
        setFormData((prev) => ({ ...prev, city: selectedCity.name }));
      }
    }
  };

  const handleCoursesChange = (selectedCourseIds) => {
    setFormData((prev) => ({ ...prev, course_ids: selectedCourseIds }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please complete the required fields highlighted in red.");
      return;
    }
    const submissionData = {
      ...formData,
      partner_id: formData.partner_id || resolvedPartnerId,
      country_id: formData.country_id ? parseInt(formData.country_id, 10) : null,
      state_id: formData.state_id ? parseInt(formData.state_id, 10) : null,
      city_id: formData.city_id ? parseInt(formData.city_id, 10) : null,
      year_of_establishment: formData.year_of_establishment
        ? parseInt(formData.year_of_establishment, 10)
        : null,
    };
    onSubmit(submissionData);
  };

  return (
    <Card className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          {center ? "Edit Center" : "Create New Center"}
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
        {isPartner && !resolvedPartnerId && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Your login is not linked to a partner organisation, so a center
            cannot be created. Please contact an admin to attach your user to
            Think Tree (or your organisation) and then try again.
          </div>
        )}
        {/* Basic Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isAdmin && (
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
                  } bg-background px-3 py-2 text-sm`}
                >
                  <option value="">Select Partner</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
                {errors.partner_id && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.partner_id}
                  </p>
                )}
              </div>
            )}

            <div>
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
                <p className="text-red-500 text-xs mt-1">
                  {errors.center_name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Center Type
              </label>
              <select
                name="center_type"
                value={formData.center_type}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Short term">Short term</option>
                <option value="ITI">ITI</option>
                <option value="Polytechnic">Polytechnic</option>
                <option value="COE">COE</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Courses (Multiple Selection)
              </label>
              <MultiSelect
                options={courses.map((course) => ({
                  value: course.id,
                  label: course.course_name,
                }))}
                selected={formData.course_ids}
                onChange={handleCoursesChange}
                placeholder="Select courses..."
                searchPlaceholder="Search courses..."
                emptyMessage="No courses found."
                maxDisplay={3}
              />
              <p className="text-xs text-gray-500 mt-2">
                {formData.course_ids.length > 0
                  ? `${formData.course_ids.length} course(s) selected`
                  : "Select courses offered"}
              </p>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Location Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region
              </label>
              <select
                name="region"
                value={formData.region}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="N">North (N)</option>
                <option value="S">South (S)</option>
                <option value="E">East (E)</option>
                <option value="W">West (W)</option>
                <option value="UT">Union Territory (UT)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                name="country_id"
                value={formData.country_id}
                onChange={handleChange}
                className={`flex h-10 w-full rounded-md border ${
                  errors.country_id ? "border-red-500" : "border-input"
                } bg-background px-3 py-2 text-sm`}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State{" "}
                {states.length > 0 && <span className="text-red-500">*</span>}
              </label>
              <select
                name="state_id"
                value={formData.state_id}
                onChange={handleChange}
                disabled={!formData.country_id || states.length === 0}
                className={`flex h-10 w-full rounded-md border ${
                  errors.state_id ? "border-red-500" : "border-input"
                } bg-background px-3 py-2 text-sm ${
                  !formData.country_id || states.length === 0
                    ? "bg-gray-100"
                    : ""
                }`}
              >
                <option value="">
                  {states.length === 0 ? "No states available" : "Select State"}
                </option>
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
                  {formData.city || "Select City"}
                </button>
                {isCityDropdownOpen && (
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
                                city: city.name,
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Center Address
              </label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address, building name, etc."
              />
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status of the Centre
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Center Head Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Center Head Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Center Head Name
              </label>
              <Input
                name="center_head"
                value={formData.center_head}
                onChange={handleChange}
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Center Head Mobile No
              </label>
              <Input
                name="mobile_number"
                value={formData.mobile_number}
                onChange={handleChange}
                placeholder="10-digit mobile"
                maxLength={10}
                className={errors.mobile_number ? "border-red-500" : ""}
              />
              {errors.mobile_number && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.mobile_number}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Center Head Email ID
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
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
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-[#009530] text-white hover:bg-[#007a28]"
          >
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
