import { Link } from "react-router-dom";
import { EmptyState, Icon, PageHeader, StatusBadge } from "../components/ui";
import { useAdminContext } from "../context/adminContext";
import { formatDate, formatTime } from "../utils/formatDate";
import { useEffect, useState } from "react";
import axios from "axios";

function StatCard({ label, value, icon }) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Icon name={icon} />
      </span>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const context = useAdminContext();
  const user = context?.user ?? null;
  const [dashboardData, setDashboardData] = useState({});
  const STATUSES = [
    { status: "pending", count: dashboardData?.pendingCount },
    { status: "confirmed", count: dashboardData?.confirmedCount },
    { status: "completed", count: dashboardData?.completedCount },
    { status: "cancelled", count: dashboardData?.cancelledCount },
  ];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isAdmin = user?.role === "admin" ? true : false;

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data } = await axios.get(
          `${context.backendUrl}${user?.role === "admin" ? "admin" : "doctors"}/dashboard`,
          { withCredentials: true },
        );

        setDashboardData(data.data);
      } catch (error) {
        setError(error.response?.data?.message || error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [context.backendUrl]);
  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.People?.name}`}
        subtitle={
          isAdmin
            ? "Overview of the whole clinic"
            : "Overview of your appointments"
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total appointments"
          value={dashboardData?.appointmentsCount}
          icon="calendar"
        />
        <StatCard
          label="Confirmed"
          value={dashboardData?.confirmedCount}
          icon="check"
        />
        <StatCard
          label="Pending"
          value={dashboardData?.pendingCount}
          icon="clock"
        />
        <StatCard
          label="Completed"
          value={dashboardData?.completedCount}
          icon="check"
        />
        <StatCard
          label="Cancelled"
          value={dashboardData?.cancelledCount}
          icon="check"
        />
        {isAdmin && (
          <>
            <StatCard
              label="Doctors"
              value={dashboardData?.doctorsCount}
              icon="doctors"
            />
            <StatCard
              label="Patients"
              value={dashboardData?.patientsCount}
              icon="patients"
            />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Upcoming appointments
            </h2>
            <Link
              to="/appointments"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              View all
            </Link>
          </div>
          {dashboardData?.latestAppointments?.length === 0 ? (
            <EmptyState text="No upcoming appointments" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {dashboardData?.latestAppointments?.slice(0, 5).map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {a.Patient?.People?.name}
                    </p>

                    <p className="truncate text-xs text-gray-500">
                      {formatDate(a.appointment_date)} ·{" "}
                      {formatTime(a.start_time)}
                      {isAdmin && ` · ${a.Doctor?.People?.name}`}
                    </p>
                  </div>

                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 font-semibold text-gray-900">By status</h2>
          <ul className="space-y-3">
            {STATUSES.map((s) => {
              const percentage = dashboardData?.appointmentsCount
                ? (s.count / dashboardData?.appointmentsCount) * 100
                : 0;

              return (
                <li key={s.status}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="capitalize text-gray-600">{s.status}</span>

                    <span className="font-medium text-gray-900">{s.count}</span>
                  </div>

                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
