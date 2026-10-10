const router = require("express").Router();
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");
const options = { model: "reportCategory", singular: "category", plural: "categories", label: "Report category", usedBy: "reports" };
router.get("/", require("../controllers/facility-reference.controller")(options).list);
router.use(authenticate, requireAdmin);
router.use(require("./facility-reference.routes")(options));
module.exports = router;
