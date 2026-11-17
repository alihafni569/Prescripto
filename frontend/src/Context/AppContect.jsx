import { createContext, useEffect, useState } from "react";
import axios from "axios";

const AppContext = createContext();
const backendUrl = "http://localhost:3000/api/";

const AppProvider = ({ children }) => {
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [user, setUser] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await axios.get(backendUrl + "doctors", {
          params: { limit: 100 },
        });
        console.log(data.data);
        setDoctors(data.data);
      } catch (error) {
        console.error(error.response?.data?.message || error.message);
      }
    };

    const fetchSpecialties = async () => {
      try {
        const { data } = await axios.get(backendUrl + "specializations", {
          params: { limit: 100 },
        });
        setSpecialties(data.data);
        console.log(data.data);
      } catch (error) {
        console.error(error.response?.data?.message || error.message);
      }
    };
    fetchSpecialties();
    fetchDoctors();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await axios.get(backendUrl + "auth/me", {
          withCredentials: true,
        });
        setUser(data.user);
        console.log(data.user);
      } catch (error) {
        setUser(null);
        const message = error.response?.data?.message || error.message;
        console.log(message);
      }
    };

    checkAuth();
  }, []);

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

  const contextValue = {
    doctors,
    specialties,
    user,
    setUser,
    backendUrl,
    logout,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

export { AppContext, AppProvider };
