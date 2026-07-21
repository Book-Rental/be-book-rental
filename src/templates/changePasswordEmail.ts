export const changePasswordEmailTemplate = (
  name: string
): string => {
  return `
    <h2>Password Changed</h2>

    <p>Hello ${name},</p>

    <p>Your password has been changed successfully.</p>

    <p>If this wasn't you, please contact support immediately.</p>
  `;
};