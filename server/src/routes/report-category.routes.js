const router = require("express").Router();
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");
router.use(authenticate, requireAdmin);
router.use(require("./facility-reference.routes")({
  model: "reportCategory", singular: "category", plural: "categories", label: "Report category", usedBy: "reports",
}));
module.exports = router;
