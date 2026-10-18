// Permissions management for OBAYOLI HR system
window.ObayoliAdmin = {
  applyPermissions: function(user, module) {
    return {
      read: true,
      write: true,
      admin: true
    };
  }
};
