const publicUser = { id: true, email: true, user_name: true, role: true };
const roles = ["user", "admin", "employee"];

function validateUser(data, partial = false, allowRole = false) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "A JSON object is required.";
  const allowed = ["email", "user_name", "password", ...(allowRole ? ["role"] : [])];
  if (Object.keys(data).some((key) => !allowed.includes(key))) return "Unknown or disallowed user field.";
  if (partial && Object.keys(data).length === 0) return "Provide at least one field to update.";
  for (const field of ["email", "user_name"]) {
    if (!partial || data[field] !== undefined) {
      if (typeof data[field] !== "string" || !data[field].trim() || data[field].length > 50) {
        return `${field} must contain 1–50 characters.`;
      }
    }
  }
  if (data.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "Invalid email address.";
  if (!partial || data.password !== undefined) {
    if (typeof data.password !== "string" || data.password.length < 8 || Buffer.byteLength(data.password) > 72) {
      return "Password must have at least 8 characters and at most 72 bytes.";
    }
  }
  if (data.role !== undefined && !roles.includes(data.role)) return "Role must be user, admin, or employee.";
  return null;
}

function handleUserError(error, res) {
  if (error.code === "P2002") return res.status(409).json({ message: "Email or user_name already exists." });
  if (error.code === "P2025") return res.status(404).json({ message: "User not found." });
  if (error.code === "P2003") return res.status(409).json({ message: "User has related reports or reservations and cannot be deleted." });
  console.error("User operation failed:", error);
  return res.status(500).json({ message: "An unexpected error occurred." });
}

module.exports = { publicUser, validateUser, handleUserError };
