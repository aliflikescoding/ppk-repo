const { randomUUID } = require("node:crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { publicUser, validateUser, handleUserError } = require("../utils/user");

async function create(req, res, allowRole) {
  const message = validateUser(req.body, false, allowRole);
  if (message) return res.status(400).json({ message });
  try {
    const { email, user_name, password, role } = req.body;
    const user = await prisma.user.create({
      data: { id: randomUUID(), email, user_name, password: await bcrypt.hash(password, 10), role: allowRole ? (role || "user") : "user" },
      select: publicUser,
    });
    return res.status(201).json({ user });
  } catch (error) {
    return handleUserError(error, res);
  }
}

exports.register = (req, res) => create(req, res, false);
exports.createUser = (req, res) => create(req, res, true);

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string" || !email || !password || email.length > 50 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ message: "Valid email and password are required." });
  }
  if (!process.env.JWT_SECRET) return res.status(500).json({ message: "Login is not configured." });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const token = jwt.sign({}, process.env.JWT_SECRET, { subject: user.id, expiresIn: "1h", algorithm: "HS256" });
    const { password: hash, ...profile } = user;
    return res.json({ token, user: profile });
  } catch (error) {
    return handleUserError(error, res);
  }
};

exports.getProfile = (req, res) => res.json({ user: req.user });

exports.getUsers = async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger((page - 1) * limit)) {
    return res.status(400).json({ message: "page must be positive and limit must be between 1 and 100." });
  }
  try {
    const users = await prisma.user.findMany({ select: publicUser, skip: (page - 1) * limit, take: limit, orderBy: { user_name: "asc" } });
    return res.json({ users, page, limit });
  } catch (error) {
    return handleUserError(error, res);
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: publicUser });
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json({ user });
  } catch (error) {
    return handleUserError(error, res);
  }
};

exports.updateUser = async (req, res) => {
  const message = validateUser(req.body, true, true);
  if (message) return res.status(400).json({ message });
  try {
    const data = { ...req.body };
    if (data.password !== undefined) data.password = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.update({ where: { id: req.params.id }, data, select: publicUser });
    return res.json({ user });
  } catch (error) {
    return handleUserError(error, res);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    return res.status(204).end();
  } catch (error) {
    return handleUserError(error, res);
  }
};
