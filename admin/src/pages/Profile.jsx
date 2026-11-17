import { useEffect, useState } from "react";
import axios from "axios";
import { useAdminContext } from "../context/adminContext";

// ---------- Styles ----------

const inputClass = `
  w-full
  rounded-lg
  border
  border-blue-200
  bg-blue-50
  px-3
  py-2
  text-base
  text-blue-950
  outline-none
  transition
  focus:border-blue-600
  focus:bg-white
  focus:outline-2
  focus:outline-blue-600/30
  disabled:opacity-60
`;

const labelClass = "text-sm font-semibold text-blue-400";
const valueClass = "text-base text-blue-950/80";
const sectionTitleClass =
  "text-sm font-bold uppercase tracking-wide text-blue-600";

const primaryButtonClass = `
  rounded-full
  bg-linear-to-br
  from-blue-600
  to-blue-900
  px-7
  py-2.5
  text-sm
  font-semibold
  text-white
  shadow-lg
  shadow-blue-900/20
  transition
  hover:-translate-y-px
  hover:brightness-105
  focus-visible:outline-2
  focus-visible:outline-blue-600
  focus-visible:outline-offset-2
  disabled:cursor-not-allowed
  disabled:opacity-60
  disabled:hover:translate-y-0
  max-sm:w-full
`;

const secondaryButtonClass = `
  rounded-full
  border
  border-blue-200
  bg-white
  px-7
  py-2.5
  text-sm
  font-semibold
  text-blue-600
  transition
  hover:bg-blue-50
  focus-visible:outline-2
  focus-visible:outline-blue-600
  focus-visible:outline-offset-2
  disabled:cursor-not-allowed
  disabled:opacity-60
  max-sm:w-full
`;

// ---------- Helpers ----------

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB
const ROLE_LABELS = { admin: "admin", doctor: "doctor" };

// The only fields this page edits (all live in the People table)
const toDraft = (person) => ({
  name: person?.name ?? "",
  phone: person?.phone ?? "",
  gender: person?.gender ?? "Not Selected",
  birthdate: person?.birthdate ? person.birthdate.split("T")[0] : "",
});

const getErrorMessage = (error) => {
  const data = error.response?.data;
  return (
    data?.message ||
    data?.errors?.[0]?.message ||
    error.message ||
    "Something went wrong"
  );
};

// Doctor-only data (read-only here). Adjust the key names to what your API returns.
const getDoctorProfile = (user) =>
  user.role === "doctor" ? (user.Doctor ?? user.doctor ?? null) : null;

// ---------- Small components ----------

// One field = label + (input while editing | value while viewing)
const Field = ({
  label,
  htmlFor,
  isEditing,
  value,
  children,
  centered = false,
  valueStyle,
}) => (
  <div className={`flex flex-col gap-1.5 ${centered ? "text-center" : ""}`}>
    {isEditing ? (
      <label className={labelClass} htmlFor={htmlFor}>
        {label}
      </label>
    ) : (
      <span className={labelClass}>{label}</span>
    )}

    {isEditing ? (
      children
    ) : (
      <p className={valueStyle ?? valueClass}>{value || "—"}</p>
    )}
  </div>
);

const Avatar = ({ src, name }) => {
  const initials = (name || "U")
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const shared =
    "h-35 w-35 rounded-full border-4 border-blue-50 shadow-[0_0_0_3px_#bcdcff]";

  return src ? (
    <img
      className={`${shared} object-cover`}
      src={src}
      alt={`${name ?? "User"}'s profile picture`}
    />
  ) : (
    <div
      className={`${shared} flex items-center justify-center bg-blue-600 text-4xl font-semibold text-white`}
      role="img"
      aria-label={`${name ?? "User"}'s profile picture`}
    >
      {initials}
    </div>
  );
};

const DoctorDetails = ({ doctor }) => {
  const rows = [
    [
      "Specialization",
      doctor.Specialization?.name ?? doctor.specialization?.name,
    ],
    ["Degree", doctor.degree],
    [
      "Experience",
      doctor.experience != null ? `${doctor.experience} years` : null,
    ],
    ["Fee", doctor.fee],
  ].filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  if (rows.length === 0 && !doctor.about) return null;

  return (
    <>
      <hr className="border-0 border-t border-blue-100" />

      <div className="flex flex-col gap-4">
        <h2 className={sectionTitleClass}>Professional information</h2>

        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1.5">
            <span className={labelClass}>{label}</span>
            <p className={valueClass}>{value}</p>
          </div>
        ))}

        {doctor.about && (
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>About</span>
            <p className={`${valueClass} whitespace-pre-line`}>
              {doctor.about}
            </p>
          </div>
        )}
      </div>
    </>
  );
};

// ---------- Shared profile form (admin + doctor) ----------

export const ProfileForm = ({ user, setUser, backendUrl }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [draft, setDraft] = useState(() => toDraft(user.People));
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [status, setStatus] = useState({
    saving: false,
    error: "",
    success: "",
  });

  const person = user.People ?? {};
  const doctor = getDoctorProfile(user);
  const { saving } = status;

  // Free the temporary blob URL when it changes or the page unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Hide the success message after a few seconds
  useEffect(() => {
    if (!status.success) return;
    const timer = setTimeout(
      () => setStatus((s) => ({ ...s, success: "" })),
      3000,
    );
    return () => clearTimeout(timer);
  }, [status.success]);

  const resetImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allows picking the same file again
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus({
        saving: false,
        error: "Please choose an image file.",
        success: "",
      });
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setStatus({
        saving: false,
        error: "Image must be 2 MB or smaller.",
        success: "",
      });
      return;
    }

    setStatus((s) => ({ ...s, error: "" }));
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleFieldChange = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleEdit = () => {
    setDraft(toDraft(user.People));
    resetImage();
    setStatus({ saving: false, error: "", success: "" });
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setDraft(toDraft(user.People));
    resetImage();
    setStatus({ saving: false, error: "", success: "" });
    setIsEditMode(false);
  };

  const validate = () => {
    if (!draft.name.trim()) return "Name is required.";
    if (draft.birthdate && new Date(draft.birthdate) > new Date()) {
      return "Date of birth cannot be in the future.";
    }
    return "";
  };

  // Send only what actually changed
  const getChanges = () => {
    const initial = toDraft(user.People);
    const changes = {};

    for (const key of Object.keys(initial)) {
      const value =
        typeof draft[key] === "string" ? draft[key].trim() : draft[key];
      if (value === initial[key]) continue;
      if (key === "birthdate" && !value) continue; // an empty date is not a valid update
      changes[key] = value;
    }
    return changes;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setStatus({ saving: false, error: validationError, success: "" });
      return;
    }

    const changes = getChanges();
    if (Object.keys(changes).length === 0 && !imageFile) {
      handleCancel(); // nothing changed
      return;
    }

    // multipart body: the API reads nested keys like person[name]
    const formData = new FormData();
    Object.entries(changes).forEach(([key, value]) => {
      formData.append(`person[${key}]`, value);
    });
    if (imageFile) {
      formData.append("person[image]", imageFile, "image");
    }

    setStatus({ saving: true, error: "", success: "" });

    try {
      // Don't set Content-Type: axios adds it together with the multipart boundary
      const { data } = await axios.patch(`${backendUrl}auth/me`, formData, {
        withCredentials: true,
      });

      // Use the server's answer, but keep data it may not return (e.g. doctor profile)
      setUser({ ...user, ...data.user });

      resetImage();
      setIsEditMode(false);
      setStatus({
        saving: false,
        error: "",
        success: "Profile updated successfully.",
      });
    } catch (error) {
      // Stay in edit mode so nothing the user typed is lost
      setStatus({ saving: false, error: getErrorMessage(error), success: "" });
    }
  };

  const displayName = isEditMode ? draft.name : person.name;

  return (
    <section
      className="w-full max-w-180 mx-auto px-4 pt-8 pb-16 bg-blue-50/60"
      aria-labelledby="profile-heading"
    >
      <h1
        id="profile-heading"
        className="
          relative
          mb-6
          pb-2.5
          text-3xl
          font-bold
          text-blue-900
          after:absolute
          after:bottom-0
          after:left-0
          after:h-1
          after:w-12
          after:rounded-full
          after:bg-blue-600
        "
      >
        My Profile
      </h1>

      <div
        className="
          flex
          flex-col
          gap-6
          rounded-2xl
          border
          border-blue-100
          bg-white
          p-8
          shadow-lg
          shadow-blue-900/10
          max-sm:p-6
        "
      >
        {/* Avatar + role */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-fit">
            <Avatar src={imagePreview || person.image} name={displayName} />

            {isEditMode && (
              <label
                className="
                  absolute
                  right-1
                  bottom-1
                  flex
                  h-8.5
                  w-8.5
                  cursor-pointer
                  items-center
                  justify-center
                  rounded-full
                  bg-blue-700
                  text-xl
                  leading-none
                  text-white
                  shadow-md
                  transition
                  hover:bg-blue-800
                  focus-within:outline-2
                  focus-within:outline-blue-600
                  focus-within:outline-offset-2
                "
                htmlFor="profile-image-input"
              >
                <span aria-hidden="true">+</span>
                <span className="sr-only">Change photo</span>
                <input
                  id="profile-image-input"
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  disabled={saving}
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>

          <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-blue-700">
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
        </div>

        {/* Fields (disabled while saving) */}
        <fieldset className="flex flex-col gap-6" disabled={saving}>
          <legend className="sr-only">Personal details</legend>

          <Field
            label="Name"
            htmlFor="profile-name"
            isEditing={isEditMode}
            value={person.name}
            centered
            valueStyle="text-2xl font-bold text-blue-900"
          >
            <input
              id="profile-name"
              className={`${inputClass} text-center text-xl font-semibold`}
              type="text"
              value={draft.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
            />
          </Field>

          <hr className="border-0 border-t border-blue-100" />

          <div className="flex flex-col gap-4">
            <h2 className={sectionTitleClass}>Contact information</h2>

            {/* Email stays read-only */}
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Email</span>
              <p className={valueClass}>{user.email}</p>
            </div>

            <Field
              label="Phone number"
              htmlFor="profile-phone"
              isEditing={isEditMode}
              value={person.phone}
            >
              <input
                id="profile-phone"
                className={inputClass}
                type="tel"
                value={draft.phone}
                onChange={(e) => handleFieldChange("phone", e.target.value)}
              />
            </Field>
          </div>

          <hr className="border-0 border-t border-blue-100" />

          <div className="flex flex-col gap-4">
            <h2 className={sectionTitleClass}>Basic information</h2>

            <Field
              label="Gender"
              htmlFor="profile-gender"
              isEditing={isEditMode}
              value={person.gender}
            >
              <select
                id="profile-gender"
                className={inputClass}
                value={draft.gender}
                onChange={(e) => handleFieldChange("gender", e.target.value)}
              >
                <option value="Not Selected">Not Selected</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </Field>

            <Field
              label="Date of birth"
              htmlFor="profile-dob"
              isEditing={isEditMode}
              value={person.birthdate?.split("T")[0]}
            >
              <input
                id="profile-dob"
                className={inputClass}
                type="date"
                max={new Date().toISOString().split("T")[0]}
                value={draft.birthdate}
                onChange={(e) => handleFieldChange("birthdate", e.target.value)}
              />
            </Field>
          </div>

          {/* Only rendered for doctors */}
          {doctor && <DoctorDetails doctor={doctor} />}
        </fieldset>

        {/* Messages */}
        {status.error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {status.error}
          </div>
        )}
        {status.success && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
          >
            {status.success}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-3 max-sm:flex-col">
          {isEditMode ? (
            <>
              <button
                type="button"
                className={primaryButtonClass}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>

              <button
                type="button"
                className={secondaryButtonClass}
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className={primaryButtonClass}
              onClick={handleEdit}
            >
              Edit profile
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

// ---------- Admin page (default export keeps your current import working) ----------

const Profile = () => {
  const { user, setUser, backendUrl } = useAdminContext();

  if (!user) return null;

  return <ProfileForm user={user} setUser={setUser} backendUrl={backendUrl} />;
};

export default Profile;

// ---------- Doctor page: same form, different context ----------
// Put this in your doctor panel (swap in your doctor context hook):
//
//   import { ProfileForm } from "../components/Profile";
//   import { useDoctorContext } from "../context/doctorContext";
//
//   const DoctorProfile = () => {
//     const { user, setUser, backendUrl } = useDoctorContext();
//     if (!user) return null;
//     return <ProfileForm user={user} setUser={setUser} backendUrl={backendUrl} />;
//   };
//   export default DoctorProfile;
