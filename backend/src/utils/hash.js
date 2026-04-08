const crypto = require("crypto");

function hashToken(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

module.exports = { hashToken };
