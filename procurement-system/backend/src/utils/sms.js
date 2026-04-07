// SMS Service - Twilio-ready stub
// In development, logs to console. Replace with Twilio in production.

export const sendSMS = async (to, message) => {
  try {
    console.log(`[SMS-DEV] To: ${to} | Message: ${message}`);
    return { success: true, dev: true };
  } catch (error) {
    console.error('[SMS] Error:', error.message);
    return { success: false, error: error.message };
  }
};
