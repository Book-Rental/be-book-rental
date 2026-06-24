
import { Router } from 'express';
import {  createUser, deleteUser, deleteUserAddress,  getUserById, getUsers, updateUser, updateUserAddress } from '../controllers/usercontrollers';
import upload from '../utils/upload';
import { auth } from '../middlewares/authMiddleware';

const router = Router();

router.get('/',auth as any, getUsers);
router.post('/create',upload.single('profilePic'), createUser);
router.delete('/:id',auth as any, deleteUser)
router.put('/:id',upload.single('profilePic'),auth as any, updateUser);

router.get('/:id', auth as any, getUserById);

router.put('/updateAddress/:userId',  updateUserAddress);
router.put('/deleteAddress/:userId',  deleteUserAddress);

export default router;