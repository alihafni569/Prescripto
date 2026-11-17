import { useEffect, useMemo, useState } from "react";
import {
  Button,
  EmptyState,
  Field,
  Icon,
  Modal,
  PageHeader,
  StatusBadge,
  inputClass,
} from "../components/ui";
import { useAdminContext } from "../context/adminContext";

const STATUSES = ["pending", "confirmed", "completed", "cancelled"];

/* ---------- Helpers: one place that knows the data shape ---------- */

const formatDate = (a) =>
  String(a?.appointment_date ?? a?.date ?? "").slice(0, 10);

/* ---------- Form ---------- */
function AppointmentForm({ onClose }) {
  const { patients, doctors, addAppointment } = useAdminContext();

  const [form, setForm] = useState({
    patient_id: "",
    doctor_id: "",
    appointment_date: "",
    notes: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const success = await addAppointment?.(form);

    if (success) {
      onClose();
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Field label="Patient">
        <select
          name="patient_id"
          value={form.patient_id}
          onChange={handleChange}
          className={inputClass}
          required
        >
          <option value="" disabled>
            Select patient
          </option>
          {patients.map((p) => (
            <option key={p?.id} value={p?.id}>
              {p?.person?.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Doctor">
        <select
          name="doctor_id"
          value={form.doctor_id}
          onChange={handleChange}
          className={inputClass}
          required
        >
          <option value="" disabled>
            Select doctor
          </option>
          {doctors.map((d) => (
            <option key={d?.id} value={d?.id}>
              {d?.person?.name} — {d?.specialization?.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Date">
        <input
          type="date"
          name="appointment_date"
          value={form.appointment_date}
          onChange={handleChange}
          className={inputClass}
          required
        />
      </Field>

      <Field label="Notes">
        <textarea
          rows={2}
          name="notes"
          value={form.notes}
          onChange={handleChange}
          className={inputClass}
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Create</Button>
      </div>
    </form>
  );
}

/* ---------- Row actions ---------- */
function StatusActions({ status, onChangeStatus }) {
  if (status === "completed" || status === "cancelled")
    return <span className="text-xs text-gray-400">—</span>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "pending" && (
        <Button
          className="!px-2.5 !py-1 text-xs cursor-pointer"
          onClick={() => onChangeStatus("confirmed")}
        >
          Confirm
        </Button>
      )}
      {status === "confirmed" && (
        <Button
          className="!px-2.5 !py-1 text-xs cursor-pointer"
          onClick={() => onChangeStatus("completed")}
        >
          Complete
        </Button>
      )}
      <Button
        variant="secondary"
        className="!px-2.5 !py-1 text-xs cursor-pointer"
        onClick={() => onChangeStatus("cancelled")}
      >
        Cancel
      </Button>
    </div>
  );
}

function DeleteButton({ onClick, className = "p-1" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded ${className} text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer`}
      aria-label="Delete appointment"
    >
      <Icon name="trash" className="h-4 w-4" />
    </button>
  );
}

/* ---------- Page ---------- */
export default function Appointments() {
  // TODO: replace with the real logged-in user data (e.g. from AuthContext)

  const {
    appointments,
    fetchAppointments,
    updateAppointmentStatus,
    deleteAppointment,
    fetchDoctorAppointments,
    user,
  } = useAdminContext();
  const ROLE = user?.role;
  const isAdmin = ROLE === "admin";

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");

  const handleChangeStatus = (id, status) =>
    updateAppointmentStatus?.(id, status);

  const handleDelete = (id) => {
    if (window.confirm("Delete this appointment?")) deleteAppointment?.(id);
  };

  const filteredRows = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return appointments.filter((a) => {
      const matchesSearch =
        !searchText ||
        a.patient?.name?.toLowerCase().includes(searchText) ||
        (isAdmin && a.doctor?.name?.toLowerCase().includes(searchText));

      const matchesStatus =
        selectedStatus === "all" || a.status === selectedStatus;

      const matchesDate = !selectedDate || formatDate(a) === selectedDate;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [appointments, isAdmin, search, selectedStatus, selectedDate]);

  useEffect(() => {
    if (!isAdmin) {
      fetchDoctorAppointments();
    } else {
      fetchAppointments();
    }
  }, []);

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle={
          isAdmin ? "Manage all clinic appointments" : "Your appointments"
        }
        action={
          isAdmin && (
            <Button onClick={() => setShowForm(true)}>
              <Icon name="plus" className="h-4 w-4" /> New appointment
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400"
          />
          <input
            className={`${inputClass} pl-9`}
            placeholder={
              isAdmin ? "Search patient or doctor…" : "Search patient…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search appointments"
          />
        </div>

        <select
          className={`${inputClass} capitalize`}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <input
          type="date"
          className={inputClass}
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          aria-label="Filter by date"
        />
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState text="No appointments found" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 md:block">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-blue-600 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  {isAdmin && <th className="px-4 py-3">Doctor</th>}
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                  {isAdmin && (
                    <th className="w-10 px-4 py-3">
                      <span className="sr-only">Delete</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map((a) => (
                  <tr key={a.id} className="hover:bg-blue-50/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {a.patient?.name}
                      </p>
                      {a.notes && (
                        <p className="text-xs text-gray-500">{a.notes}</p>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-gray-600">
                        {a.doctor?.name}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {formatDate(a)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusActions
                        status={a.status}
                        onChangeStatus={(s) => handleChangeStatus(a.id, s)}
                      />
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <DeleteButton onClick={() => handleDelete(a.id)} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {filteredRows.map((a) => (
              <li
                key={a.id}
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {a.patient?.name}
                    </p>
                    {isAdmin && (
                      <p className="truncate text-xs text-gray-500">
                        {a.doctor?.name}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-2 text-sm text-gray-600">{formatDate(a)}</p>
                {a.notes && (
                  <p className="mt-1 text-xs text-gray-500">{a.notes}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <StatusActions
                    status={a.status}
                    onChangeStatus={(s) => handleChangeStatus(a.id, s)}
                  />
                  {isAdmin && (
                    <DeleteButton
                      className="p-1.5"
                      onClick={() => handleDelete(a.id)}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {showForm && (
        <Modal title="New appointment" onClose={() => setShowForm(false)}>
          <AppointmentForm onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </>
  );
}
