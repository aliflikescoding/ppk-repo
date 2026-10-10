const { Router } = require("express");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");
const { parseId } = require("../utils/facility");
const createController = require("../controllers/facility-reference.controller");

module.exports = (options) => {
  const router = Router();
  const controller = createController(options);
  router.param("id", (req, res, next, id) => {
    req.referenceId = parseId(id);
    if (!req.referenceId) return res.status(400).json({ message: `${options.label} id must be a positive integer.` });
    return next();
  });
  router.get("/", controller.list);
  router.get("/:id", controller.get);
  router.use(authenticate, requireAdmin);
  router.post("/", controller.create);
  router.patch("/:id", controller.update);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.delete);
  return router;
};
