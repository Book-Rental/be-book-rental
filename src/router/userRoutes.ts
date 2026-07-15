
import { Router } from 'express';
import { addUserAddress, createUser, deleteUser, deleteUserAddress, getAddressById, getUserAddresses, getUserById, getUsers, updateUser, updateUserAddress } from '../controllers/usercontrollers';
import upload from '../utils/upload';
import { auth } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', auth as any, getUsers);
router.post('/create', upload.single('profilePic'), createUser);
router.delete('/:id', auth as any, deleteUser)
router.put('/:id', upload.single('profilePic'), auth as any, updateUser);

router.get('/:id', auth as any, getUserById);

router.post("/addAddress/:userId", addUserAddress);

router.get("/addresses/:userId", getUserAddresses);

router.get(
    "/addresses/:userId/:addressId",
    getAddressById
);

router.put(
    "/updateAddress/:userId/:addressId",
    updateUserAddress
);

router.delete(
    "/deleteAddress/:userId/:addressId",
    deleteUserAddress
);
export default router;