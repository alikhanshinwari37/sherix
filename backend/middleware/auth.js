const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.sherix_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "sherix",
      audience: "sherix-seller"
    });

    req.admin = {
      id: decoded.id,
      email: decoded.email
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session."
    });
  }
}

module.exports = requireAuth;