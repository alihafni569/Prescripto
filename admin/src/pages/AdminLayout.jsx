import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminContext } from "../context/adminContext";
import { Icon } from "../components/ui";

const NAV = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    end: true,
    roles: ["admin", "doctor"],
  },
  {
    to: "/appointments",
    label: "Appointments",
    icon: "calendar",
    roles: ["admin", "doctor"],
  },
  {
    to: "/doctors",
    label: "Doctors",
    icon: "doctors",
    roles: ["admin"],
  },
  {
    to: "/patients",
    label: "Patients",
    icon: "patients",
    roles: ["admin"],
  },
];

function SidebarContent({ onNavigate }) {
  const { user } = useAdminContext();
  const items = NAV.filter((i) => i.roles.includes(user?.role));

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
          +
        </span>
        <span className="text-lg font-bold text-gray-900">
          Prescripto<span className="text-blue-600">Admin</span>
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
              }`
            }
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <p className="px-5 pb-4 text-xs text-gray-400">
        {user?.role === "admin" ? "Full access" : "Your appointments only"}
      </p>
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAdminContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
    }

    navigate("/login");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-gray-200 bg-white lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-900/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold text-gray-900">
                {user?.People?.name}
              </p>
              <p className="text-xs capitalize text-blue-600">{user?.role}</p>
            </div>
            <div className="cursor-pointer">
              {user?.People?.image ? (
                <img
                  src={user?.People?.image}
                  alt={user?.People?.name}
                  className="h-9 w-9 rounded-full"
                  onClick={() => navigate("/profile")}
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {user?.People?.name.replace("Dr. ", "").charAt(0)}
                </span>
              )}
            </div>
            <button
              onClick={user ? handleLogout : handleLogin}
              className={`rounded-lg p-2 text-gray-500 hover:bg-gray-100 ${user ? "hover:text-red-600" : "hover:text-blue-600"}`}
              aria-label={user ? "Log out" : "Log in"}
              title={user ? "Log out" : "Log in"}
            >
              {user ? <Icon name="logout" /> : <Icon name="login" />}
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
