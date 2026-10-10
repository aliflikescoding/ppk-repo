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
router.use(authenticate, requireAdmin);
router.post("/", upload, controller.createFacility);
router.patch("/:id", upload, controller.updateFacility);
router.put("/:id", upload, controller.updateFacility);
router.delete("/:id", controller.deleteFacility);

module.exports = router;
