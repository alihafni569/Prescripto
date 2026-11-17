import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const AdminContext = createContext(null);

const backendUrl = "http://localhost:3000/api/";

const AdminContextProvider = ({ children }) => {
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await axios.get(backendUrl + "auth/me", {
          withCredentials: true,
        });
        setUser(data.user);
      } catch (error) {
        setUser(null);
        const message = error.response?.data?.message || error.message;
        console.log(message);
      }
    };

    checkAuth();
  }, []);
  const loadAppointments = async (path, label) => {
    try {
      const { data } = await axios.get(`${backendUrl}${path}`, {
        params: { limit: 100 },
        withCredentials: true,
      });
      console.log(`Fetched ${label}:`, data.data);
      setAppointments(data.data);
    } catch (error) {
      console.error(error.response?.data?.message || error.message);
    }
  };

  const fetchAppointments = () =>
    loadAppointments("appointments", "all appointments");

  const fetchDoctorAppointments = () =>
    loadAppointments(`appointments/doctor-appointments`, "doctor appointments");

  const fetchDoctors = async () => {
    try {
      const { data } = await axios.get(backendUrl + "doctors", {
        params: { limit: 100 },
        withCredentials: true,
      });
      setDoctors(data.data);
    } catch (error) {
      console.error(error.response?.data?.message || error.message);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data } = await axios.get(backendUrl + "patients", {
        params: { limit: 100 },
        withCredentials: true,
      });
      setPatients(data.data);
    } catch (error) {
      console.error(error.response?.data?.message || error.message);
    }
  };

  const fetchSpecialties = async () => {
    try {
      const { data } = await axios.get(backendUrl + "specializations", {
        params: { limit: 100 },
        withCredentials: true,
      });
      console.log(data.data);
      setSpecialties(data.data);
    } catch (error) {
      console.error(error.response?.data?.message || error.message);
    }
  };

  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      const { data } = await axios.patch(
        `${backendUrl}appointments/status/${appointmentId}`,
        { status: status },
        { withCredentials: true },
      );

      if (data.success) {
        setAppointments((prev) =>
          prev.map((appointment) =>
            appointment.id === appointmentId
              ? { ...appointment, status: status }
              : appointment,
          ),
        );
        toast.success(`Appointment ${status} successfully`);
      }
    } catch (error) {
      console.error(
        "Failed to cancel appointment:",
        error.response?.data || error.message,
      );
    }
  };

  const deleteAppointment = async (id) => {
    try {
      const { data } = await axios.delete(`${backendUrl}appointments/${id}`, {
        withCredentials: true,
      });
      if (data.success) {
        setAppointments((prev) =>
          prev.filter((appointment) => appointment.id !== id),
        );
        toast.success("Appointment deleted successfully");
      }
    } catch (error) {
      console.error(
        "Failed to delete appointment:",
        error.response?.data || error.message,
      );
    }
  };

  const addAppointment = async (appointment) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}appointments`,
        {
          doctor_id: Number(appointment.doctor_id),
          appointment_date: appointment.appointment_date,
          patient_id: Number(appointment.patient_id),
          reason: appointment.notes,
        },
        { withCredentials: true },
      );

      console.log("API response:", data);

      if (data.status && data.data) {
        toast.success("Appointment added successfully.");

        setAppointments((prev) => [...prev, data.data]);

        return true;
      }

      return false;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to add appointment.",
      );
      console.error("Error:", error.response?.data || error.message);

      return false;
    }
  };

  const addDoctor = async (doctor) => {
    try {
      const formData = new FormData();

      formData.append(
        "person",
        JSON.stringify({
          name: doctor.name,
          email: doctor.email,
          phone: doctor.phone,
          gender: doctor.gender,
          birthdate: doctor.birthdate,
        }),
      );

      formData.append(
        "specialization_id",
        parseInt(doctor.specialization_id, 10),
      );

      formData.append("fee", parseFloat(doctor.fee));
      formData.append("active", Boolean(doctor.active));
      formData.append("experience", parseInt(doctor.experience, 10));
      formData.append("about", doctor.about);
      formData.append("degree", doctor.degree);

      if (doctor.image instanceof File) {
        formData.append("image", doctor.image);
      }

      const { data } = await axios.post(backendUrl + "doctors", formData, {
        withCredentials: true,
      });

      if (data.success && data.data) {
        toast.success("Doctor added successfully.");
        setDoctors((prev) => [...prev, data.data]);
        return true;
      }

      return false;
    } catch (error) {
      console.error(
        "Error adding doctor:",
        error.response?.data || error.message,
      );
      return false;
    }
  };

  const logout = async () => {
    try {
      const { data } = await axios.post(
        `${backendUrl}auth/logout`,
        {},
        { withCredentials: true },
      );

      if (data.success) {
        setUser(null);
        toast.success("Logged out successfully.");
      }
    } catch (error) {
      console.error(
        "Error logging out:",
        error.response?.data || error.message,
      );
    }
  };

  const updateDoctor = async (doctor) => {
    try {
      const formData = new FormData();

      formData.append(
        "person",
        JSON.stringify({
          name: doctor.name,
          email: doctor.email,
          phone: doctor.phone,
          gender: doctor.gender,
          birthdate: doctor.birthdate,
        }),
      );

      formData.append(
        "specialization_id",
        parseInt(doctor.specialization_id, 10),
      );

      formData.append("fee", parseFloat(doctor.fee));
      formData.append("active", Boolean(doctor.active));
      formData.append("experience", parseInt(doctor.experience, 10));
      formData.append("about", doctor.about);
      formData.append("degree", doctor.degree);

      if (doctor.image instanceof File) {
        formData.append("image", doctor.image);
      }

      const { data } = await axios.patch(
        `${backendUrl}doctors/${doctor.id}`,
        formData,
        { withCredentials: true },
      );

      if (data.success && data.data) {
        toast.success("Doctor updated successfully.");

        setDoctors((prev) =>
          prev.map((d) => (d.id === doctor.id ? data.data : d)),
        );

        return true;
      }

      return false;
    } catch (error) {
      console.error(
        "Error updating doctor:",
        error.response?.data || error.message,
      );

      toast.error(error.response?.data?.message || "Failed to update doctor.");

      return false;
    }
  };

  const deleteDoctor = async (id) => {
    try {
      const { data } = await axios.delete(`${backendUrl}doctors/${id}`, {
        withCredentials: true,
      });

      if (data.success) {
        toast.success("Doctor deleted successfully.");
        setDoctors((prev) => prev.filter((doctor) => doctor.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error(
        "Error deleting doctor:",
        error.response?.data || error.message,
      );
      toast.error(error.response?.data?.message || "Failed to delete doctor.");
      return false;
    }
  };

  const deletePatient = async (id) => {
    try {
      const { data } = await axios.delete(`${backendUrl}patients/${id}`, {
        withCredentials: true,
      });

      if (data.success) {
        toast.success("Patient deleted successfully.");
        setPatients((prev) => prev.filter((patient) => patient.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error(
        "Error deleting patient:",
        error.response?.data || error.message,
      );
      toast.error(error.response?.data?.message || "Failed to delete patient.");
      return false;
    }
  };

  useEffect(() => {
    fetchSpecialties();
    fetchDoctors();
    fetchPatients();
  }, [user]);

  const value = {
    user,
    setUser,
    doctors,
    specialties,
    appointments,
    patients,
    backendUrl,
    fetchAppointments,
    fetchDoctors,
    fetchPatients,
    fetchSpecialties,
    updateAppointmentStatus,
    deleteAppointment,
    addAppointment,
    addDoctor,
    updateDoctor,
    deleteDoctor,
    deletePatient,
    fetchDoctorAppointments,
    logout,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
};

const useAdminContext = () => {
  return useContext(AdminContext);
};

export { AdminContextProvider, useAdminContext };
