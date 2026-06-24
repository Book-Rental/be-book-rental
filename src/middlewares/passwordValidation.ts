import { body } from 'express-validator';

export const validatePassword = [
    body('newPassword').notEmpty().withMessage('newPassword is required'),
    body('email').notEmpty().withMessage('email is required'),
    body('currentPassword').notEmpty().withMessage('currentPassword is required'),
  ];