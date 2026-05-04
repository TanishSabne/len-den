const nodemailer = require('nodemailer');

// Set up Nodemailer
let transporter;

async function createTransporter() {
  if (transporter) return transporter;
  
  try {
    // If real credentials are provided in .env, use them (e.g., Gmail)
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log("📧 Real Gmail SMTP configured for sending OTPs.");
      return transporter;
    }

    // Otherwise, fallback to Ethereal Mail (for local testing)
    console.warn("⚠️ No SMTP credentials found in .env. Falling back to Ethereal Mail test accounts.");
    let testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    return transporter;
  } catch (error) {
    console.error("Failed to configure Email Transporter:", error);
    throw error;
  }
}

/**
 * Sends an OTP to the given email address.
 * @param {string} email - The recipient email.
 * @param {string} otp - The 6-digit OTP.
 */
async function sendOTP(email, otp) {
  try {
    const tp = await createTransporter();
    
    let info = await tp.sendMail({
      from: '"Lenden Platform" <admin@lenden.com>',
      to: email,
      subject: "Your Lenden Login OTP",
      text: `Your OTP for Lenden login is: ${otp}. It is valid for 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f5; border-radius: 8px; max-width: 500px; margin: auto;">
          <h2 style="color: #4f46e5;">Lenden Login</h2>
          <p>You requested to log into the Lenden platform .</p>
          <p>Your One-Time Password (OTP) is:</p>
          <h1 style="color: #111827; letter-spacing: 2px;">${otp}</h1>
          <p style="color: #6b7280; font-size: 0.9em;">This code is valid for 5 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    console.log("Message sent: %s", info.messageId);
    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw error;
  }
}

module.exports = {
  sendOTP,
};
