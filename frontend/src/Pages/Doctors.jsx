import { useContext, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppContext } from "../Context/AppContect";

const Doctors = () => {
  const { specialty } = useParams();
  const { doctors, specialties } = useContext(AppContext);

  const [selectedSpecialty, setSelectedSpecialty] = useState(specialty || "");

  const [showCategory, setShowCategory] = useState(true);

  const handleSpecialtyClick = (specialty) => {
    setSelectedSpecialty(specialty);
  };

  const filteredDoctors = useMemo(() => {
    if (!selectedSpecialty) {
      return doctors;
    }

    return doctors.filter(
      (doctor) =>
        doctor.specialization?.name?.toLowerCase() ===
        selectedSpecialty.toLowerCase(),
    );
  }, [doctors, selectedSpecialty]);
  return (
    <main className="mt-10">
      <h1 className="m-0 text-base text-gray-700">
        Browse through the doctors specialist.
      </h1>

      <div className="flex flex-col gap-10 md:flex-row">
        {/* Filters */}
        <div>
          {/* Mobile Filter Button */}
          <button
            type="button"
            onClick={() => setShowCategory(!showCategory)}
            className="mt-7.5 flex w-25 items-center justify-center rounded border border-gray-300 bg-white px-3 py-1.5 font-bold text-gray-700 cursor-pointer md:hidden"
          >
            Filters
          </button>

          {/* Filter List */}
          <div
            className={`
              ${showCategory ? "flex" : "hidden"}
              mt-5 w-full flex-col gap-2.5
              md:flex md:w-50
            `}
          >
            {specialties.map((item) => {
              const isSelected =
                selectedSpecialty.toLowerCase() === item.name.toLowerCase();

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSpecialtyClick(item.name)}
                  className={`
                    w-full cursor-pointer rounded border px-6 py-2.5 text-sm
                    transition-colors duration-200
                    ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }
                  `}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Doctors Grid */}
        <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 m-4">
          {filteredDoctors.map((doctor) => (
            <Link
              key={doctor.id}
              to={`/appointment/${doctor.id}`}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="overflow-hidden bg-indigo-50">
                <img
                  src={doctor.person.image}
                  alt={doctor.person.name}
                  className="h-80 sm:h-60 md:h-65 w-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>

              <div className="p-4">
                <h3 className="m-0 text-base font-semibold text-gray-800">
                  {doctor.person.name}
                </h3>

                <p className="mt-1.5 mb-0 text-sm text-gray-500">
                  {doctor.specialization?.name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
};

export default Doctors;
