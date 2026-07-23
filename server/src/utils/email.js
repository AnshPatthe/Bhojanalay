import nodemailer from 'nodemailer';
import logger from '../config/logger.js';

export const sendEmail = async (options) => {
  // Create a transporter using environment variables
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.EMAIL_PORT || '2525', 10),
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || ''
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Vyavastha <noreply@vyavastha.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  try {
    // Check if configuration is empty or contains defaults
    const isMockMode = 
      !process.env.EMAIL_USER || 
      process.env.EMAIL_USER.includes('your_smtp') || 
      process.env.NODE_ENV === 'development';

    if (isMockMode) {
      logger.info(`[MOCK EMAIL SENT]
To: ${options.email}
Subject: ${options.subject}
Message: ${options.message}
----------------------------------------`);
      return;
    }

    await transporter.sendMail(mailOptions);
    logger.info(`Email successfully sent to ${options.email}`);
  } catch (error) {
    logger.error(`Error sending email to ${options.email}: ${error.message}`);
    // In development or testing, do not throw to avoid disrupting development flows
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[DEV FALLBACK] Mock email logged above instead of throwing error.`);
    } else {
      throw error;
    }
  }
};

export default sendEmail;
