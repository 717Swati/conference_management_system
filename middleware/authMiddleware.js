const ensureAuthenticated = (req, res, next) => {
  console.log("🔍 ensureAuthenticated - Is Authenticated:", req.isAuthenticated());
  console.log("🔍 ensureAuthenticated - User:", req.user);
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error_msg", "Please log in first.");
  res.redirect("/login");
};

const roleBasedAccess = (roles) => {
  return (req, res, next) => {
    console.log("🔍 roleBasedAccess - User:", req.user);
    console.log("🔍 roleBasedAccess - User Role:", req.user?.role);
    console.log("🔍 roleBasedAccess - Allowed Roles:", roles);
    if (req.isAuthenticated() && req.user && roles.includes(req.user.role)) {
      return next();
    }
    req.flash("error_msg", "Access Denied.");
    res.redirect("/login");
  };
};

module.exports = { ensureAuthenticated, roleBasedAccess };