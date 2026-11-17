import { useContext, useEffect, useState } from "react";
import { AppContext } from "../Context/AppContect";
import axios from "axios";

const MyAppoiment = () => {
  const [myAppointments, setMyAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const { user, backendUrl } = useContext(AppContext);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchAppointments = async () => {
      try {
        setLoading(true);

        const response = await axios.get(
          `${backendUrl}appointments/patient-appointments`,
          { withCredentials: true },
        );

        if (!cancelled) {
          setMyAppointments(response.data.data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Failed to fetch appointments:",
            error.response?.data || error.message,
          );
          console.log("Status:", error.response?.status);
          console.log("Validation errors:", error.response?.data?.errors);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAppointments();

    return () => {
      cancelled = true;
    };
  }, [user, backendUrl]);

  const cancelButton = async (appointmentId) => {
    try {
      setCancellingId(appointmentId);

      await axios.patch(
        `${backendUrl}appointments/status/${appointmentId}`,
        { status: "cancelled" },
        { withCredentials: true },
      );

      setMyAppointments((prev) =>
        prev.map((appointment) =>
          appointment.id === appointmentId
            ? { ...appointment, status: "cancelled" }
            : appointment,
        ),
      );
    } catch (error) {
      console.error(
        "Failed to cancel appointment:",
        error.response?.data || error.message,
      );
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return <p className="mt-10 text-center">Loading appointments...</p>;
  }

  return (
    <div className="mt-10 max-w-5xl mx-auto px-4">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">
        My Appointments
      </h1>

      {myAppointments.length === 0 ? (
        <p className="text-gray-500">You have no appointments.</p>
      ) : (
        <ul className="space-y-5 list-none p-0 m-0">
          {myAppointments.map((item) => (
            <li
              key={item.id}
              className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 flex flex-col md:flex-row gap-5 shadow-sm"
            >
              <div className="shrink-0">
                <img
                  src={item.doctor?.image || "/default-doctor.png"}
                  alt={`Dr. ${item.doctor?.name || "Doctor"}`}
                  className="w-full h-72 sm:w-40 sm:h-40 md:w-36 md:h-36 object-cover rounded-lg bg-indigo-50"
                />
              </div>

              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-800">
                  {item.doctor?.name}
                </h2>

                <p className="text-indigo-600 text-sm font-medium mt-1">
                  {item.doctor?.specialization?.name}
                </p>

                <p className="mt-4 text-sm text-gray-700">
                  <span className="font-medium">Date:</span>{" "}
                  {item.appointment_date}
                </p>

                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-medium">Status:</span> {item.status}
                </p>
              </div>

              <div className="flex flex-col justify-end gap-2 md:w-52">
                <button
                  type="button"
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-medium border hover:bg-indigo-700 hover:text-white transition-colors"
                >
                  Pay Online
                </button>

                <button
                  type="button"
                  disabled={
                    item.status === "cancelled" ||
                    item.status === "completed" ||
                    cancellingId === item.id
                  }
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-medium border hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  onClick={() => cancelButton(item.id)}
                >
                  {cancellingId === item.id
                    ? "Cancelling..."
                    : item.status === "cancelled"
                      ? "Appointment Cancelled"
                      : "Cancel Appointment"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyAppoiment;
