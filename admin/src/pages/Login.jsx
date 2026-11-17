import { Link, useNavigate } from "react-router-dom";
import { Button, Field, inputClass } from "../components/ui";
import { useState } from "react";
import axios from "axios";
import { useAdminContext } from "../context/adminContext";

export default function Login() {
  const { setUser } = useAdminContext();
  const Navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { email, password } = formData;
      console.log(email, password);
      if (!email || !password) {
        throw new Error("Email and password are required for login.");
      }

      const response = await axios.post(
        "http://localhost:3000/api/auth/login",
        {
          email,
          password,
        },
        {
          withCredentials: true,
        },
      );

      setUser(response.data.user);
      Navigate("/");
    } catch (error) {
      console.error(
        "Login error:",
        error.response?.data?.message || error.message,
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-200 sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-2xl font-bold text-white">
            +
          </span>
          <h1 className="text-xl font-bold text-gray-900">Prescripto Admin</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to your dashboard
          </p>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              placeholder="you@clinic.com"
              value={formData.email}
              onChange={handleChange("email")}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              className={inputClass}
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange("password")}
            />
          </Field>
          <Link to="/admin" className="block">
            <Button type="button" className="w-full" onClick={handleSubmit}>
              Sign in
            </Button>
          </Link>
        </form>
      </div>
    </div>
  );
}
