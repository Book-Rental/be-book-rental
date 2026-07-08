
import { Router } from 'express';
import userRoutes from './userRoutes';
import authRoutes from './authRoutes';
import categoryRoutes from './categoryRoutes';
import bookRoutes from './bookRoutes';
import wishListRoutes from './wishListRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/Category', categoryRoutes);
router.use('/book', bookRoutes);
router.use('/wishList', wishListRoutes);

export default router;