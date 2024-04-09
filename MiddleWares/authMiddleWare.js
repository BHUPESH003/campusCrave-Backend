const jwt = require('jsonwebtoken');

  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
 
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Forbidden: Invalid token' });
      }
      req.user = user;
      
      
      next();
    });

};
const verifyToken = (req, res, next) => {
  // Get token from headers, query parameters, or cookies
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  // If token is not found
  if (!token) {
    return res.status(401).json({ message: 'Token is missing' });
  }
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Extract vendorId from decoded token
    const { vendorId } = decoded;
    console.log(decoded)
    // Attach vendorId to request object for use in subsequent middleware/routes
    req.vendorId = vendorId;
    // Call next middleware
    next();
  } catch (error) {
    // If token is invalid or expired
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = {authenticateToken,verifyToken};
