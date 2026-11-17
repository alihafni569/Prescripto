import { useState, useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import { AppContext } from "../Context/AppContect";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MIN_PASSWORD = 8;

const initialForm = {
  firstName: "",
  lastName: "",
  phone: "",
  dob: "",
  gender: "",
  bloodType: "",
  email: "",
  password: "",
  confirmPassword: "",
  image: null,
};

// Today as YYYY-MM-DD (local time) for the date input's max attribute
const getToday = () => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

// Image preview hook
function useImagePreview(image) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(image);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [image]);

  return preview;
}

// Avatar component
function Avatar({ src, name, className = "h-12 w-12 text-lg" }) {
  const [failedSrc, setFailedSrc] = useState(null);

  const initial = name?.trim().charAt(0).toUpperCase() || "?";
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-semibold text-blue-700 ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={`${name || "Patient"}'s photo`}
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}

// Reusable input styles
const inputClass = (errors, name) =>
  `w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
    errors[name]
      ? "border-red-400 focus:ring-red-200"
      : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
  }`;

// Reusable field component
const Field = ({ label, name, error, children }) => (
  <div>
    <label
      htmlFor={name}
      className="mb-1 block text-sm font-medium text-gray-700"
    >
      {label}
    </label>

    {children}

    {error && (
      <p className="mt-1 text-xs text-red-500" role="alert">
        {error}
      </p>
    )}
  </div>
);

export default function PatientRegister() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [imageError, setImageError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { backendUrl, setUser } = useContext(AppContext);

  const imagePreview = useImagePreview(form.image);

  // Handle normal form changes
  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    // Keep phone digits only
    if (name === "phone") {
      value = value.replace(/\D/g, "");
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setServerError("");
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Please choose a valid image.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("Image must be smaller than 5 MB.");
      e.target.value = "";
      return;
    }

    setImageError("");

    setForm((prev) => ({
      ...prev,
      image: file,
    }));

    e.target.value = "";
  };

  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, image: null }));
    setImageError("");
  };

  // Validate form
  const validate = () => {
    const e = {};

    if (!form.firstName.trim()) {
      e.firstName = "First name is required";
    }

    if (!form.lastName.trim()) {
      e.lastName = "Last name is required";
    }

    if (!/^01[0-25]\d{8}$/.test(form.phone)) {
      e.phone = "Enter a valid Egyptian mobile number";
    }

    if (!form.dob) {
      e.dob = "Date of birth is required";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const birthDate = new Date(`${form.dob}T00:00:00`);

      if (birthDate > today) {
        e.dob = "Date of birth cannot be in the future";
      }
    }

    if (!form.gender) {
      e.gender = "Please select a gender";
    }

    if (!form.bloodType) {
      e.bloodType = "Please select a blood type";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = "Enter a valid email";
    }

    if (form.password.length < MIN_PASSWORD) {
      e.password = `Password must be at least ${MIN_PASSWORD} characters`;
    }

    if (form.confirmPassword !== form.password) {
      e.confirmPassword = "Passwords do not match";
    }

    setErrors(e);

    return Object.keys(e).length === 0;
  };

  // Submit registration
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading || !validate()) return;

    setLoading(true);
    setServerError("");

    // Normalize base URL so a missing trailing slash doesn't break the request
    const baseUrl = String(backendUrl || "").replace(/\/+$/, "");

    try {
      const email = form.email.trim().toLowerCase();

      // multipart/form-data: multer parses "person[name]" into nested objects
      const fd = new FormData();
      fd.append("role", "patient");
      fd.append("email", email);
      fd.append("password", form.password);

      fd.append(
        "person[name]",
        `${form.firstName.trim()} ${form.lastName.trim()}`,
      );
      fd.append("person[email]", email);
      fd.append("person[phone]", form.phone.trim());
      fd.append("person[gender]", form.gender);
      if (form.dob) fd.append("person[birthdate]", form.dob);

      fd.append("profile[bloodType]", form.bloodType);

      // The image goes in req.file (not in req.body.person)
      if (form.image) fd.append("person[image]", form.image, "image");

      // Don't set Content-Type manually: axios adds the multipart boundary
      const { data } = await axios.post(
        `${baseUrl}/auth/patient-register`,
        fd,
        {
          withCredentials: true,
        },
      );

      toast.success(data.message || "Account created successfully!");
      console.log(data);
      if (data.user) {
        setUser(data.user);
        navigate("/");
      }
    } catch (err) {
      setServerError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Create Patient Account
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Book appointments and manage your medical visits.
          </p>
        </div>

        {/* Server error */}
        {serverError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Avatar */}
          <div className="mx-auto w-fit">
            <div className="relative">
              <Avatar
                src={imagePreview}
                name={`${form.firstName} ${form.lastName}`}
                className="h-32 w-32 border-4 border-blue-50 text-3xl shadow-[0_0_0_3px_#bcdcff]"
              />

              <label
                htmlFor="patient-image-input"
                className="absolute right-1 bottom-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-blue-700 text-xl leading-none text-white shadow-md transition hover:bg-blue-800 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600"
              >
                <span aria-hidden="true">+</span>
                <span className="sr-only">Change photo</span>

                <input
                  id="patient-image-input"
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>

            {form.image && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="mt-2 block w-full text-center text-xs font-medium text-gray-500 hover:text-red-500"
              >
                Remove photo
              </button>
            )}

            {imageError && (
              <p className="mt-2 text-center text-xs text-red-500" role="alert">
                {imageError}
              </p>
            )}
          </div>

          {/* Personal information */}
          <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Personal Information
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First name" name="firstName" error={errors.firstName}>
              <input
                id="firstName"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                className={inputClass(errors, "firstName")}
                placeholder="First Name"
                autoComplete="given-name"
                required
              />
            </Field>

            <Field label="Last name" name="lastName" error={errors.lastName}>
              <input
                id="lastName"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                className={inputClass(errors, "lastName")}
                placeholder="Last Name"
                autoComplete="family-name"
                required
              />
            </Field>

            <Field label="Phone" name="phone" error={errors.phone}>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                maxLength={11}
                value={form.phone}
                onChange={handleChange}
                className={inputClass(errors, "phone")}
                placeholder="01012345678"
                autoComplete="tel"
                required
              />
            </Field>

            <Field label="Date of birth" name="dob" error={errors.dob}>
              <input
                id="dob"
                name="dob"
                type="date"
                max={getToday()}
                value={form.dob}
                onChange={handleChange}
                className={inputClass(errors, "dob")}
                required
              />
            </Field>

            <Field label="Gender" name="gender" error={errors.gender}>
              <select
                id="gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className={inputClass(errors, "gender")}
                required
              >
                <option value="">Select gender</option>

                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Medical information */}
          <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Medical Information
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Blood type" name="bloodType" error={errors.bloodType}>
              <select
                id="bloodType"
                name="bloodType"
                value={form.bloodType}
                onChange={handleChange}
                className={inputClass(errors, "bloodType")}
                required
              >
                <option value="">Select blood type</option>

                {BLOOD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Account */}
          <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            Account
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Email" name="email" error={errors.email}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className={inputClass(errors, "email")}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </Field>
            </div>

            <Field label="Password" name="password" error={errors.password}>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  className={`${inputClass(errors, "password")} pr-14`}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-3 text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>

            <Field
              label="Confirm password"
              name="confirmPassword"
              error={errors.confirmPassword}
            >
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange}
                className={inputClass(errors, "confirmPassword")}
                autoComplete="new-password"
                required
              />
            </Field>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
