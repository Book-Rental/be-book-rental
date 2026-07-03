import { Router } from 'express';

import { auth } from '../middlewares/authMiddleware';

import { createCategory, deleteCategory, getAllCategories, getCategoryById, updateCategory } from '../controllers/categoryController';

const router = Router();

// Define routes
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);
router.post('/create', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;