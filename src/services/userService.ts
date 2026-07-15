import { Types } from 'mongoose';
import { IUser } from '../models/interfaces';
import User from '../models/User';
import { Messages } from '../utils/constants';
import { buildPaginationQuery, generateEmailVerificationToken, hashToken } from '../utils/appFunctions';
import mongoose from 'mongoose';

export const getAllUsersService = async (query: { search: string, page: number, limit: number, userType: string, status: string }) => {
    try {
        const { skip, limit, page } = buildPaginationQuery(query)
        const { userType, status, search } = query;

        let searchFilter: any = {
            $and: [
                { isActive: true },
                (userType && { userType: userType }),
                (status && { status: status })

            ].filter((option) => !!option),

            ...(search && {
                $or: [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            })
        };


        const totalRecords = await User.countDocuments(searchFilter)
        const totalPages = Math.ceil(totalRecords / limit);
        const hasMore = page < totalPages;

        const selectedFields = `email userType lastName firstName status addresses password isVerified profilePic`
        const users = await User.find(searchFilter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select(selectedFields)
            .exec();

        return {
            users,
            meta: {
                totalRecords,
                totalPages,
                currentPage: page,
                limit,
                hasMore,
            }
        };
    } catch (err) {
        console.log('err', err)
        return err;
    }
}

export const createUserService = async (body: IUser): Promise<IUser | any> => {
    try {
        const user = await User.findOne({ email: body.email }, { email: 1 });
        if (user) {
            return {
                message: Messages.Duplicate_Email,
                email: body.email
            };
        }
        const newUser = new User(body);
        const savedUser = await newUser.save();
        savedUser.verificationToken = generateEmailVerificationToken();
        savedUser.hashedToken = hashToken(savedUser.verificationToken!, body.email)
        savedUser.isVerified = false;
        savedUser.createdBy = savedUser._id as unknown as Types.ObjectId;
        savedUser.updatedBy = savedUser._id as unknown as Types.ObjectId;
        await savedUser.save();

        return savedUser;
    } catch (err) {
        return err;
    }
}



export const deleteUserService = async (id: string) => {
    try {
        const deletedUser = await User.findByIdAndDelete(id);
        return deletedUser;
    } catch (err) {
        return err;
    }
}


export const updateUserService = async (id: string, data: any) => {
    try {

        const user = await User.find({ _id: id }) as any;
        let newAddress = null;
        let userUpdateObj: any = {
            $set: data
        }
        if (data?.address) {
            newAddress = data?.address;
            delete data?.address;
            userUpdateObj = {
                ...userUpdateObj,
                $push: { addresses: newAddress },
            }
        }

        const userUpdate = await User.findOneAndUpdate(
            { _id: id },
            userUpdateObj,
            { new: true, runValidators: true, upsert: true }
        );
        return userUpdate;
    } catch (err) {
        return err;
    }
}


export const loginService = async (email: string) => {
    try {
        const selectedFields = `email userType lastName firstName status addresses isVerified password favoriteProducts`
        return await User.findOne({ email }, selectedFields).exec()
    } catch (err) {
        return err;
    }
}


export const getUserByIdService = async (id: string) => {
    try {
        const selectedFields = `email userType lastName firstName status addresses isVerified profilePic deliveryStatus maxConcurrentOrders currentOrderIds currentLocation`
        const user = await User.findOne({ _id: id }, selectedFields);

        return user;
    } catch (err) {
        return err;
    }
}


export const addUserAddressService = async (
    userId: string,
    addressData: any
) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user id.");
        }

        const user = await User.findById(userId);

        if (!user) {
            throw new Error("User not found.");
        }

        // Only one default address
        if (addressData.isDefault) {
            user.addresses.forEach((address: any) => {
                address.isDefault = false;
            });
        }

        user.addresses.push(addressData);

        await user.save();

        return user.addresses[user.addresses.length - 1];
    } catch (err) {
        throw err;
    }
};

/**
 * Update User Address
 */
export const updateUserAddressService = async (
    userId: string,
    addressId: string,
    updatedData: any
) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user id.");
        }

        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            throw new Error("Invalid address id.");
        }

        const user = await User.findById(userId);

        if (!user) {
            throw new Error("User not found.");
        }

        const address: any = user.addresses.find((addr: any) => addr._id.toString() === addressId);

        if (!address) {
            throw new Error("Address not found.");
        }

        // If this address becomes default,
        // remove default from remaining addresses.
        if (updatedData.isDefault) {
            user.addresses.forEach((addr: any) => {
                addr.isDefault = false;
            });
        }

        Object.keys(updatedData).forEach((key) => {
            address[key] = updatedData[key];
        });

        await user.save();

        return address;
    } catch (err) {
        throw err;
    }
};

/**
 * Delete User Address
 */
export const deleteUserAddressService = async (
    userId: string,
    addressId: string
) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user id.");
        }

        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            throw new Error("Invalid address id.");
        }

        const user = await User.findById(userId);

        if (!user) {
            throw new Error("User not found.");
        }

        const address: any = user.addresses.find((addr: any) => addr._id.toString() === addressId);

        if (!address) {
            throw new Error("Address not found.");
        }

        address.deleteOne();

        await user.save();

        return true;
    } catch (err) {
        throw err;
    }
};

/**
 * Get All User Addresses
 */
export const getUserAddressesService = async (userId: string) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user id.");
        }

        const user = await User.findById(userId).select("addresses");

        if (!user) {
            throw new Error("User not found.");
        }

        return user.addresses;
    } catch (err) {
        throw err;
    }
};

/**
 * Get Address By Id
 */
export const getAddressByIdService = async (
    userId: string,
    addressId: string
) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid user id.");
        }

        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            throw new Error("Invalid address id.");
        }

        const user = await User.findById(userId).select("addresses");

        if (!user) {
            throw new Error("User not found.");
        }

        const address: any = user.addresses.find((addr: any) => addr._id.toString() === addressId);

        if (!address) {
            throw new Error("Address not found.");
        }

        return address;
    } catch (err) {
        throw err;
    }
};