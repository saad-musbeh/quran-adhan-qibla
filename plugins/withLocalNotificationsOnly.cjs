const { withEntitlementsPlist } = require('expo/config-plugins');

// expo-notifications adds APNs signing by default. This app uses local Android
// reminders only; no remote push registration or Apple push service is used.
// Register before expo-notifications: Expo runs these mods in reverse order.
module.exports = function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, config => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
