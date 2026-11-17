import { Navigate } from "react-router-dom";
import { Icon, PageHeader, inputClass } from "../components/ui";
import { useAdminContext } from "../context/adminContext";
import { useState, useMemo } from "react";

export default function Patients() {
  const { patients, user, deletePatient } = useAdminContext();
  const [search, setSearch] = useState("");
  // Admin-only page: if the preview is switched to Doctor while here, go back home.
  // if (user?.role !== "admin") return <Navigate to="/" replace />;

  const handleDelete = async (patient) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${patient?.person?.name}?`,
      )
    ) {
      return;
    }

    const success = await deletePatient(patient.id);

    if (success) {
      setSearch(""); // Clear search to refresh the list after deletion
    }
  };

  const filterPatients = useMemo(() => {
    const searchTerm = search.toLowerCase();
    // Implement search functionality here, e.g., filter patients based on the search term.

    return patients.filter((p) => {
      const name = p?.person?.name?.toLowerCase() || "";
      const phone = p?.person?.phone?.toLowerCase() || "";
      const email = p?.person?.email?.toLowerCase() || "";
      return (
        name.includes(searchTerm) ||
        phone.includes(searchTerm) ||
        email.includes(searchTerm)
      );
    });
  }, [search, patients]);

  return (
    <>
      <PageHeader title="Patients" subtitle="All registered patients" />

      <div className="relative mb-4 max-w-md">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400"
        />
        <input
          className={`${inputClass} pl-9`}
          placeholder="Search by name, phone or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 md:block">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-blue-600 text-left text-xs font-semibold uppercase tracking-wide text-white">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Date of Birth</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filterPatients.map((p) => (
              <tr key={p.id} className="hover:bg-blue-50/40">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {p?.person?.name}
                </td>
                <td className="px-4 py-3 text-gray-600">{p?.person?.phone}</td>
                <td className="px-4 py-3 text-gray-600">{p?.person?.email}</td>
                <td className="px-4 py-3 text-gray-600">{p?.person?.gender}</td>
                <td className="px-4 py-3 text-gray-600">
                  {p?.person?.birthdate}
                </td>
                <td className="px-4 py-3">
                  <button
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${p?.person?.name}`}
                    onClick={() => handleDelete(p)}
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {filterPatients.map((p) => (
          <li
            key={p.id}
            className="flex items-start justify-between gap-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200"
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{p?.person?.name}</p>
              <p className="text-sm text-gray-600">{p?.person?.phone}</p>
              <p className="truncate text-xs text-gray-500">
                {p?.person?.email}
              </p>
              <p className="mt-1 text-xs text-blue-600">{p?.person?.gender}</p>
              <p className="text-xs text-gray-500">{p?.person?.birthdate}</p>
            </div>
            <button
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              aria-label={`Delete ${p?.person?.name}`}
              onClick={() => handleDelete(p)}
            >
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
