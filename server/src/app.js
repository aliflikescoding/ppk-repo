const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const userRoutes = require("./routes/user.routes");
const facilityRoutes = require("./routes/facility.routes");

const app = express();
const port = process.env.PORT || "5000";

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use("/uploads", express.static(require("./utils/facility-images").uploadRoot, {
  setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
}));

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

const apiRouter = express.Router();
apiRouter.use("/users", userRoutes);
apiRouter.use("/facilities", facilityRoutes);
apiRouter.use("/facility-types", require("./routes/facility-type.routes"));
apiRouter.use("/facility-locations", require("./routes/facility-location.routes"));
apiRouter.use("/reports", require("./routes/report.routes"));
apiRouter.use("/report-categories", require("./routes/report-category.routes"));
apiRouter.use("/reservations", require("./routes/reservation.routes"));

app.use("/api", apiRouter);

app.listen(port, () => {
  console.log(`Listening to port ${port}`);
});
