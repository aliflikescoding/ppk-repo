const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { publicUser, handleUserError } = require("../utils/user");

exports.authenticate = async (req, res, next) => {
  const match = /^Bearer (\S+)$/i.exec(req.get("authorization") || "");
  if (!match) return res.status(401).json({ message: "A Bearer token is required." });
  if (!process.env.JWT_SECRET) return res.status(500).json({ message: "Authentication is not configured." });
  let payload;
  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sub)) throw new Error("Invalid subject");
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
  try {
    req.user = await prisma.user.findUnique({ where: { id: payload.sub }, select: publicUser });
    if (!req.user) return res.status(401).json({ message: "Invalid or expired token." });
    return next();
  } catch (error) {
    return handleUserError(error, res);
  }
};

exports.requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access is required." });
  return next();
};
