export const resetPasswordEmailTemplate = (
  name: string,
  otp: string
): string => {
  return `
    <h2>Password Reset</h2>

    <p>Hello ${name},</p>

    <p>You requested to reset your password.</p>

    <p>Your OTP is:</p>

    <h1>${otp}</h1>

    <p>This OTP is valid for 10 minutes.</p>

    <p>If you did not request this, please ignore this email.</p>
  `;
};