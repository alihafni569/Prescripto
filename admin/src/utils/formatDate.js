export const formatDate = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

export const formatTime = (time) => {
  if (!time) return "";

  return new Date(time).toISOString().slice(11, 16);
};
export const addMinutesToTime = (time, minutes) => {
  const [hours, mins] = time.split(":").map(Number);

  const date = new Date();
  date.setHours(hours, mins + minutes, 0, 0);

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
};
