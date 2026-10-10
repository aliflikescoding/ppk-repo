const router = require("express").Router();
const controller = require("../controllers/facility.controller");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");
const { parseId } = require("../utils/facility");
const upload = require("../middleware/facility-upload.middleware");

router.param("id", (req, res, next, id) => {
  req.facilityId = parseId(id);
  if (!req.facilityId) return res.status(400).json({ message: "Facility id must be a positive integer." });
  return next();
});
router.get("/", controller.getFacilities);
router.get("/:id", controller.getFacility);
const requireStaff = (req, res, next) => {
  if (!["admin", "employee"].includes(req.user.role)) return res.status(403).json({ message: "Admin or employee access is required." });
  return next();
};
router.use(authenticate);
router.post("/", requireAdmin, upload, controller.createFacility);
router.patch("/:id", requireStaff, upload, controller.updateFacility);
router.put("/:id", requireStaff, upload, controller.updateFacility);
router.delete("/:id", requireAdmin, controller.deleteFacility);

module.exports = router;
