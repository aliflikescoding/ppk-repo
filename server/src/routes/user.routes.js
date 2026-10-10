const router = require("express").Router();
const controller = require("../controllers/user.controller");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");

router.post("/register", controller.register);
router.post("/login", controller.login);
router.get("/me", authenticate, controller.getProfile);

router.use(authenticate, requireAdmin);
router.param("id", (req, res, next, id) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ message: "User id must be a UUID." });
  }
  return next();
});
router.get("/", controller.getUsers);
router.post("/", controller.createUser);
router.get("/:id", controller.getUser);
router.patch("/:id", controller.updateUser);
router.delete("/:id", controller.deleteUser);

module.exports = router;
