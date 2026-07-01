import { Router } from 'express';

import { auth } from '../middlewares/authMiddleware';

import { createCategory, deleteAllCategories, deleteCategory, getAllCategories, getCategoryById, updateCategory } from '../controllers/categoryController';

const router = Router();

// Define routes
router.get('/', auth as any, getAllCategories);
router.get('/:id', auth as any, getCategoryById);
router.post('/create', auth as any, createCategory);
router.put('/:id', auth as any, updateCategory);
router.delete('/:id', auth as any, deleteCategory);
router.delete("/", auth as any, deleteAllCategories);

export default router;