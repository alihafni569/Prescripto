import { useEffect, useState } from "react";
import {
  Button,
  Field,
  Icon,
  Modal,
  PageHeader,
  inputClass,
} from "../components/ui";
import { useAdminContext } from "../context/adminContext";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const stripTitle = (name) => (name || "").replace(/^Dr\.\s*/i, "").trim();

const getErrorMessage = (err) =>
  err?.response?.data?.message ||
  err?.message ||
  "Something went wrong. Please try again.";

const getInitialForm = (doctor) => ({
  name: doctor?.person?.name || "",
  email: doctor?.person?.email || "",
  phone: doctor?.person?.phone || "",
  gender: doctor?.person?.gender || "male",
  birthdate: (doctor?.person?.birthdate || "").slice(0, 10),
  image: doctor?.person?.image || "",
  specialization_id: Number(doctor?.specialization_id) || 0,
  fee: doctor?.fee ?? 0,
  active: doctor ? doctor.active : true,
  experience: doctor?.experience ?? 0,
  about: doctor?.about || "",
  degree: doctor?.degree || "",
});

// Creates a preview URL for a File and revokes it when no longer needed
function useImagePreview(image) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (image instanceof File) {
      const url = URL.createObjectURL(image);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(image || "");
  }, [image]);

  return preview;
}

// Shared avatar: shows the image, falls back to the name's initial
function Avatar({ src, name, className = "h-12 w-12 text-lg" }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const initial = stripTitle(name).charAt(0).toUpperCase() || "?";
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-semibold text-blue-700 ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={name ? `${stripTitle(name)}'s photo` : "Doctor photo"}
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}

function DoctorForm({ doctor, onClose }) {
  const isEdit = Boolean(doctor);
  const { addDoctor, specialties, updateDoctor } = useAdminContext();
  const [doctorForm, setDoctorForm] = useState(() => getInitialForm(doctor));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const imagePreview = useImagePreview(doctorForm.image);

  const setField = (key, value) =>
    setDoctorForm((prev) => ({ ...prev, [key]: value }));

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
    } else if (file.size > MAX_IMAGE_SIZE) {
      setError("Image must be smaller than 5 MB.");
    } else {
      setError("");
      setField("image", file);
    }

    // Allow re-selecting the same file after an error
    e.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    const payload = {
      ...doctorForm,
      fee: parseFloat(doctorForm.fee) || 0,
      experience: parseInt(doctorForm.experience, 10) || 0,
      specialization_id: Number(doctorForm.specialization_id),
    };

    console.log(payload);

    try {
      if (isEdit) {
        await updateDoctor({ ...payload, id: doctor.id });
      } else {
        await addDoctor(payload);
      }
    } catch (err) {
      console.error("Failed to save doctor:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Avatar */}
      <div className="relative mx-auto w-fit">
        <Avatar
          src={imagePreview}
          name={doctorForm.name}
          className="h-34 w-34 border-4 border-blue-50 text-3xl shadow-[0_0_0_3px_#bcdcff]"
        />

        <label
          htmlFor="doctor-image-input"
          className="absolute right-1 bottom-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-blue-700 text-xl leading-none text-white shadow-md transition hover:bg-blue-800 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600"
        >
          <span aria-hidden="true">+</span>
          <span className="sr-only">Change photo</span>
          <input
            id="doctor-image-input"
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
        </label>
      </div>

      <Field label="Full name">
        <input
          required
          className={inputClass}
          value={doctorForm.name}
          onChange={(e) => setField("name", e.target.value)}
        />
      </Field>

      <Field label="Email">
        <input
          required
          type="email"
          className={inputClass}
          value={doctorForm.email}
          onChange={(e) => setField("email", e.target.value)}
        />
      </Field>

      <Field label="Phone number">
        <input
          type="tel"
          className={inputClass}
          value={doctorForm.phone}
          onChange={(e) => setField("phone", e.target.value)}
        />
      </Field>

      <Field label="Gender">
        <select
          className={inputClass}
          value={doctorForm.gender}
          onChange={(e) => setField("gender", e.target.value)}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </Field>

      <Field label="Birthdate">
        <input
          type="date"
          className={inputClass}
          value={doctorForm.birthdate}
          onChange={(e) => setField("birthdate", e.target.value)}
        />
      </Field>

      <Field label="Specialty">
        <select
          required
          className={inputClass}
          value={doctorForm.specialization_id || ""}
          onChange={(e) =>
            setField("specialization_id", Number(e.target.value))
          }
        >
          <option value="">Select a specialty</option>
          {specialties.map((specialty) => (
            <option key={specialty.id} value={specialty.id}>
              {specialty.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Experience (years)">
        <input
          type="number"
          min="0"
          className={inputClass}
          value={doctorForm.experience}
          onChange={(e) => setField("experience", e.target.value)}
        />
      </Field>

      <Field label="About">
        <textarea
          rows={3}
          className={inputClass}
          value={doctorForm.about}
          onChange={(e) => setField("about", e.target.value)}
        />
      </Field>

      <Field label="Degree">
        <input
          className={inputClass}
          value={doctorForm.degree}
          onChange={(e) => setField("degree", e.target.value)}
        />
      </Field>

      <Field label="Consultation fee (EGP)">
        <input
          type="number"
          min="0"
          className={inputClass}
          value={doctorForm.fee}
          onChange={(e) => setField("fee", e.target.value)}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
          checked={doctorForm.active}
          onChange={(e) => setField("active", e.target.checked)}
        />
        Active (available for booking)
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

export default function Doctors() {
  const { doctors, user, deleteDoctor } = useAdminContext();
  const [editing, setEditing] = useState(null); // null | "new" | doctor object
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (doctor) => {
    const name = stripTitle(doctor.person?.name);
    if (!window.confirm(`Are you sure you want to delete Dr. ${name}?`)) {
      return;
    }

    setDeletingId(doctor.id);
    try {
      await deleteDoctor(doctor.id);
    } finally {
      setDeletingId(null);
    }
  };

  // // Admin-only page: if the preview is switched to Doctor while here, go back home.
  // if (user?.role !== "admin") return <Navigate to="/" replace />;

  return (
    <>
      <PageHeader
        title="Doctors"
        subtitle="Add, edit and manage clinic doctors"
        action={
          <Button onClick={() => setEditing("new")}>
            <Icon name="plus" className="h-4 w-4" /> Add doctor
          </Button>
        }
      />

      {doctors.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-200">
          No doctors yet. Click "Add doctor" to create the first one.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {doctors.map((d) => {
            const name = stripTitle(d.person?.name);

            return (
              <div
                key={d.id}
                className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200"
              >
                <div className="flex items-start gap-3">
                  <Avatar src={d.person?.image} name={d.person?.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">
                      Dr. {name}
                    </p>
                    <p className="text-sm text-blue-600">
                      {d.specialization?.name}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {d.person?.email}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      d.active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {d.active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                  <p className="text-sm text-gray-600">
                    Fee:{" "}
                    <span className="font-semibold text-gray-900">
                      {d.fee} EGP
                    </span>
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(d)}
                      className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                      aria-label={`Edit ${name}`}
                    >
                      <Icon name="edit" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === d.id}
                      onClick={() => handleDelete(d)}
                      className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Delete ${name}`}
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal
          title={editing === "new" ? "Add doctor" : "Edit doctor"}
          onClose={() => setEditing(null)}
        >
          <DoctorForm
            key={editing === "new" ? "new" : editing.id}
            doctor={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}
