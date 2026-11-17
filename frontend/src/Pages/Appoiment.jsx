import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../Context/AppContect";
import { assets } from "../assets/assets";
import RelatedDoctors from "../components/RelatedDoctors";
import axios from "axios";
import { toast } from "react-toastify";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Format YYYY-MM-DD using local calendar values.
// Avoids UTC date shifting when displaying a date.
const getDayName = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);

  return DAYS_OF_WEEK[new Date(year, month - 1, day).getDay()];
};

const getDayNumber = (dateString) => {
  return Number(dateString.split("-")[2]);
};

const Appointment = () => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { user, backendUrl, doctors } = useContext(AppContext);

  const [doctorInfo, setDoctorInfo] = useState(null);
  const [docDates, setDocDates] = useState([]);
  const [dateIndex, setDateIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  const [feedback, setFeedback] = useState(null);

  // Load the doctor: first from the shared list, then from the backend if
  // the list doesn't have the availability data (or isn't loaded yet).
  useEffect(() => {
    if (!docId) return;

    let isMounted = true;

    const loadDoctor = async () => {
      setIsLoading(true);
      setDateIndex(0);
      setFeedback(null);

      // URL params are strings, ids are numbers: compare as strings.
      // (find returns ONE doctor; and `===` compares, `=` would overwrite the id)
      const fromContext = doctors?.find(
        (doc) => String(doc.id) === String(docId),
      );

      if (fromContext?.availableDays) {
        setDoctorInfo(fromContext);
        setDocDates(fromContext.availableDays);
        setIsLoading(false);
        return;
      }

      try {
        // Adjust this endpoint to the one your API exposes for a single doctor
        const { data } = await axios.get(`${backendUrl}doctors/${docId}`, {
          withCredentials: true,
        });

        if (!isMounted) return;

        const fetched = data.doctor ?? data.data ?? data;
        setDoctorInfo(fetched);
        console.log(fetched);
        setDocDates(fetched?.availableDays ?? []);
      } catch (error) {
        if (!isMounted) return;

        console.error("Fetch doctor error:", error);
        setDoctorInfo(fromContext ?? null);
        setDocDates(fromContext?.availableDays ?? []);

        if (!fromContext) toast.error("Failed to load doctor information");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDoctor();

    return () => {
      isMounted = false;
    };
  }, [docId, backendUrl, doctors]);

  const handleDateSelect = (index) => {
    setDateIndex(index);
    setFeedback(null);
  };

  const selectedDate = docDates[dateIndex];

  // Book appointment.
  const handleBookAppointment = async () => {
    if (isBooking) return;

    if (!user) {
      navigate("/login");
      return;
    }

    if (!selectedDate?.date || !doctorInfo?.id) {
      setFeedback({
        type: "error",
        message: "Please select a valid date.",
      });
      return;
    }

    // Prevent booking if the selected day has no remaining capacity.
    if (selectedDate.remainingAppointments <= 0) {
      setFeedback({
        type: "error",
        message: "This day is fully booked. Please select another day.",
      });
      return;
    }

    setIsBooking(true);
    setFeedback(null);

    try {
      await axios.post(
        `${backendUrl}appointments`,
        {
          doctor_id: doctorInfo.id,
          appointment_date: selectedDate.date,
          user_id: user.id,
          reason: "General Consultation",
        },
        { withCredentials: true },
      );

      // Reflect the booking in the UI right away
      setDocDates((prev) =>
        prev.map((day, index) =>
          index === dateIndex
            ? { ...day, remainingAppointments: day.remainingAppointments - 1 }
            : day,
        ),
      );

      setFeedback({
        type: "success",
        message: "Your appointment has been booked successfully.",
      });

      toast.success("Your appointment has been booked successfully.");
    } catch (error) {
      console.error("Booking error:", error.response?.data);

      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.message ||
        "Failed to book the appointment. Please try again.";

      setFeedback({ type: "error", message });
      toast.error(message);
    } finally {
      setIsBooking(false);
    }
  };

  // Loading state.
  if (isLoading) {
    return (
      <div className="mt-20 flex justify-center">
        <p className="text-gray-500">Loading doctor information...</p>
      </div>
    );
  }

  // Doctor not found.
  if (!doctorInfo) {
    return (
      <div className="mt-20 text-center">
        <p className="text-red-500">
          {feedback?.message ?? "Doctor not found."}
        </p>
      </div>
    );
  }

  const doctorName = doctorInfo.person?.name ?? "";
  const doctorImage = doctorInfo.person?.image;
  const speciality =
    doctorInfo.specialization?.name ?? doctorInfo.Specialization?.name ?? "";

  return (
    <main className="mt-8 sm:mt-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Doctor Information */}
      <section className="flex flex-col lg:flex-row gap-5 lg:gap-6">
        {/* Doctor Image */}
        <div className="w-full lg:w-[320px] shrink-0 bg-blue-600 rounded-xl overflow-hidden flex items-end justify-center">
          {doctorImage ? (
            <img
              src={doctorImage}
              alt={doctorName}
              className="w-full max-w-[320px] object-contain"
            />
          ) : (
            <div className="w-full max-w-[320px] aspect-square flex items-center justify-center text-white text-7xl font-semibold">
              {doctorName.charAt(0)}
            </div>
          )}
        </div>

        {/* Doctor Details */}
        <div className="flex-1 border border-gray-200 rounded-xl p-5 sm:p-7 lg:p-9 bg-white shadow-sm">
          {/* Name */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
              {doctorName}
            </h1>

            <img
              src={assets.verified_icon}
              alt="verified"
              className="w-5 h-5"
            />
          </div>

          {/* Degree & Speciality */}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <p className="text-gray-600 text-sm sm:text-base">
              {doctorInfo.degree} - {speciality}
            </p>

            <span className="px-2.5 py-1 border border-gray-300 rounded-full text-xs sm:text-sm text-gray-600">
              {doctorInfo.experience}{" "}
              {doctorInfo.experience === 1 ? "Year" : "Years"}
            </span>
          </div>

          {/* About */}
          <div className="flex items-center gap-2 mt-6">
            <h2 className="font-semibold text-gray-800">About</h2>

            <img src={assets.info_icon} alt="info" className="w-4 h-4" />
          </div>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            {doctorInfo.about}
          </p>

          {/* Fees */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-gray-700">
              <span className="font-medium">Appointment fee:</span>{" "}
              <span className="text-blue-600 font-semibold">
                ${doctorInfo.fee}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Booking */}
      <section className="mt-12 sm:mt-14 max-w-4xl">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
          Select a date
        </h2>

        {/* Available Dates */}
        {docDates.length > 0 ? (
          <div className="mt-5 flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {docDates.map((day, index) => {
              const isSelected = index === dateIndex;

              return (
                <button
                  key={day.date}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleDateSelect(index)}
                  className={`
                    shrink-0
                    w-20 sm:w-22
                    h-24
                    rounded-2xl
                    border
                    flex flex-col
                    items-center
                    justify-center
                    gap-1
                    text-sm
                    transition-all
                    duration-200
                    cursor-pointer
                    ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 text-white shadow-md"
                        : "bg-white border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600"
                    }
                  `}
                >
                  <span className="font-medium">{getDayName(day.date)}</span>

                  <span className="text-lg font-semibold">
                    {getDayNumber(day.date)}
                  </span>

                  <span className="text-xs">
                    {day.remainingAppointments} slots
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 text-gray-500">
            No available appointment days next week.
          </p>
        )}

        {/* Selected Date Availability */}
        {selectedDate && (
          <p className="mt-4 text-sm text-gray-600">
            Remaining appointments:{" "}
            <span className="font-semibold text-blue-600">
              {selectedDate.remainingAppointments}
            </span>
          </p>
        )}

        {/* Feedback */}
        {feedback && (
          <p
            role={feedback.type === "error" ? "alert" : "status"}
            className={`mt-5 text-sm ${
              feedback.type === "error" ? "text-red-600" : "text-green-600"
            }`}
          >
            {feedback.message}
          </p>
        )}

        {/* Book Button */}
        <button
          type="button"
          disabled={
            isBooking ||
            !selectedDate ||
            selectedDate.remainingAppointments <= 0
          }
          onClick={handleBookAppointment}
          className="
            mt-7
            w-full sm:w-auto
            min-w-55
            px-8
            py-3
            rounded-full
            bg-blue-600
            text-white
            font-medium
            transition-all
            duration-200
            hover:bg-blue-700
            disabled:bg-gray-200
            disabled:text-gray-500
            disabled:cursor-not-allowed
          "
        >
          {isBooking ? "Booking..." : "Book an appointment"}
        </button>
      </section>

      {/* Related Doctors */}
      <section className="mt-16 flex justify-center">
        <RelatedDoctors speciality={speciality} doctorId={doctorInfo.id} />
      </section>
    </main>
  );
};

export default Appointment;
