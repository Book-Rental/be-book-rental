import { Request, Response } from 'express';
import { getAllUsersService, createUserService, deleteUserService, updateUserService, getUserByIdService, updateUserAddressService, deleteUserAddressService, addUserAddressService, getAddressByIdService, getUserAddressesService, } from '../services/userService';
import { IUser } from '../models/interfaces';
import { failResponse, successResponse } from '../utils/response';
import { StatusCode } from '../utils/StatusCodes';
import { Messages, UserAddressFields } from '../utils/constants';
import { uploadToCloudinary } from '../utils/UploadImage';

export interface UserQuery { search: string, page: number, limit: number, userType: string }

// GET all users
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await getAllUsersService(req.query as any);
    successResponse(res, users, '', StatusCode.OK);
  } catch (error: any) {
    failResponse(res, error?.message || error, StatusCode.Bad_Request)
  }
};

// POST create new user
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {

    let data = { ...req.body };
    if (req.file) {
      try {
        // Generate a unique filename
        const filename = `user_${data.name}_${Date.now()}`;

        // Upload to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(
          req.file.buffer,
          "user-profiles", // folder name in Cloudinary
          filename
        );

        // Add the Cloudinary URL to the update data
        data.profilePic = cloudinaryUrl;
      } catch (uploadError: any) {
        console.error("Cloudinary upload error:", uploadError);
        failResponse(
          res,
          "Failed to upload profile picture",
          StatusCode.Internal_Server_Error
        );
        return;
      }
    }

    const newUser: IUser | any = await createUserService({ ...data, createdBy: null, updatedBy: null });
    if (newUser?.message === Messages.Duplicate_Email || !newUser?.email) {
      failResponse(res, newUser?.message, StatusCode.Bad_Request)
      return;
    }
    successResponse(res, newUser, Messages.User_Created, StatusCode.Created);
  } catch (error: any) {
    failResponse(res, error?.message || error, StatusCode.Bad_Request)
  }

};


// Delete delete user
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const newUser: IUser | any = await deleteUserService(id);
    if (newUser?.message) {
      failResponse(res, newUser?.message, StatusCode.Bad_Request)
      return;
    }
    successResponse(res, {}, Messages.User_Deleted, StatusCode.OK);
  } catch (error: any) {
    failResponse(res, error?.message || error, StatusCode.Bad_Request)
  }
};

// Put update user
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    let updateData = { ...req.body };

    // Check if a profile picture file was uploaded
    if (req.file) {
      try {
        // Generate a unique filename
        const filename = `user_${id}_${Date.now()}`;

        // Upload to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(
          req.file.buffer,
          "user-profiles", // folder name in Cloudinary
          filename
        );

        // Add the Cloudinary URL to the update data
        updateData.profilePic = cloudinaryUrl;
      } catch (uploadError: any) {
        console.error("Cloudinary upload error:", uploadError);
        failResponse(
          res,
          "Failed to upload profile picture",
          StatusCode.Internal_Server_Error
        );
        return;
      }
    }

    // Parse addresses if it's a string (from FormData)
    if (typeof updateData.addresses === 'string') {
      try {
        updateData.addresses = JSON.parse(updateData.addresses);
      } catch (parseError) {
        console.error("Error parsing addresses:", parseError);
      }
    }

    // Update user in database
    const updatedUser: IUser | any = await updateUserService(id, updateData);

    if (updatedUser?.message) {
      failResponse(res, updatedUser?.message, StatusCode.Bad_Request);
      return;
    }

    successResponse(res, updatedUser, Messages.User_Updated, StatusCode.OK);
  } catch (err: any) {
    console.log("Error in updateUser:", err);
    failResponse(res, err?.message || err, StatusCode.Bad_Request);
  }
};

// Get user By Id
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const user: IUser | any = await getUserByIdService(id);

    if (user?.message) {
      failResponse(res, user?.message, StatusCode.Bad_Request);
      return
    }
    successResponse(res, user, Messages.User_Updated, StatusCode.OK);
  } catch (err: any) {
    console.log('err', err)
    failResponse(res, err?.message || err, StatusCode.Bad_Request)
  }
}


/**
 * Add Address
 */
export const addUserAddress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params as { userId: string };

    if (!userId) {
      failResponse(
        res,
        Messages.UserId_Required,
        StatusCode.Bad_Request
      );
      return;
    }

    const result = await addUserAddressService(
      userId,
      req.body
    );

    successResponse(
      res,
      result,
      Messages.Address_Added,
      StatusCode.Created
    );
  } catch (err: any) {
    failResponse(
      res,
      err.message || "Unable to add address.",
      StatusCode.Bad_Request
    );
  }
};

/**
 * Update Address
 */
export const updateUserAddress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, addressId } = req.params  as { userId: string, addressId: string };

    if (!userId) {
      failResponse(
        res,
        Messages.UserId_Required_To_Update_Address,
        StatusCode.Bad_Request
      );
      return;
    }

    if (!addressId) {
      failResponse(
        res,
        Messages.AddressId_Required_To_Update_Address,
        StatusCode.Bad_Request
      );
      return;
    }

    const result = await updateUserAddressService(
      userId,
      addressId,
      req.body
    );

    successResponse(
      res,
      result,
      Messages.Address_Updated,
      StatusCode.OK
    );
  } catch (err: any) {
    failResponse(
      res,
      err.message || "Unable to update address.",
      StatusCode.Bad_Request
    );
  }
};

/**
 * Delete Address
 */
export const deleteUserAddress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, addressId } = req.params as { userId: string, addressId: string };

    if (!userId) {
      failResponse(
        res,
        Messages.UserId_Required_To_Delete_Address,
        StatusCode.Bad_Request
      );
      return;
    }

    if (!addressId) {
      failResponse(
        res,
        Messages.AddressId_Required_To_Delete_Address,
        StatusCode.Bad_Request
      );
      return;
    }

    await deleteUserAddressService(
      userId,
      addressId
    );

    successResponse(
      res,
      {},
      Messages.Address_Deleted,
      StatusCode.OK
    );
  } catch (err: any) {
    failResponse(
      res,
      err.message || "Unable to delete address.",
      StatusCode.Bad_Request
    );
  }
};

/**
 * Get All Addresses
 */
export const getUserAddresses = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params as { userId: string };

    if (!userId) {
      failResponse(
        res,
        Messages.UserId_Required,
        StatusCode.Bad_Request
      );
      return;
    }

    const result = await getUserAddressesService(
      userId
    );

    successResponse(
      res,
      result,
      Messages.Success,
      StatusCode.OK
    );
  } catch (err: any) {
    failResponse(
      res,
      err.message || "Unable to fetch addresses.",
      StatusCode.Bad_Request
    );
  }
};

/**
 * Get Address By Id
 */
export const getAddressById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, addressId } = req.params as { userId: string, addressId: string };

    if (!userId) {
      failResponse(
        res,
        Messages.UserId_Required,
        StatusCode.Bad_Request
      );
      return;
    }

    if (!addressId) {
      failResponse(
        res,
        "Address Id is required.",
        StatusCode.Bad_Request
      );
      return;
    }

    const result = await getAddressByIdService(
      userId,
      addressId
    );

    successResponse(
      res,
      result,
      Messages.Success,
      StatusCode.OK
    );
  } catch (err: any) {
    failResponse(
      res,
      err.message || "Unable to fetch address.",
      StatusCode.Bad_Request
    );
  }
};