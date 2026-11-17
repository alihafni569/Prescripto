require("dotenv").config();
const express = require("express");
const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { connectCloudinary } = require("./config/cloudinary");
const { apiLimiter } = require("./middlewares/rateLimiting");
connectCloudinary();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  }),
);
app.use(cookieParser());
app.use("/api", apiLimiter);
app.use("/api", routes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
