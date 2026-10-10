const router = require("express").Router();
const controller = require("../controllers/report.controller");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");
const { parseId } = require("../utils/facility");
const { uuid, isStaff } = require("../utils/report");
const upload = require("../middleware/report-upload.middleware");
router.use(authenticate);
router.param("id", (req, res, next, id) => {
  req.reportId = parseId(id);
  if (!req.reportId) return res.status(400).json({ message: "Report id must be a positive integer." });
  return next();
});
router.param("userId", (req, res, next, id) => {
  if (!uuid(id)) return res.status(400).json({ message: "User id must be a UUID." });
  return next();
});
const requireStaff = (req, res, next) => isStaff(req.user) ? next() : res.status(403).json({ message: "Admin or employee access is required." });
router.get("/me", controller.mine);
router.get("/user/:userId", controller.byUser);
router.get("/", controller.list);
router.get("/:id", controller.get);
router.post("/", upload, controller.create);
router.patch("/:id", requireStaff, upload, controller.update);
router.put("/:id", requireStaff, upload, controller.update);
router.delete("/:id", requireAdmin, controller.delete);
module.exports = router;
