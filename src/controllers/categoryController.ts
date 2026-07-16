import {
    createCategoryService,
    deleteAllCategoriesService,
    deleteCategoryService,
    getAllCategoriesService,
    getCategoryByIdService,
    updateCategoryService,
} from "../services/categoryService";
import { Messages } from "../utils/constants";
import { failResponse, successResponse } from "../utils/response";
import { StatusCode } from "../utils/StatusCodes";
import { Request, Response } from "express";

export const createCategory = async (req: Request, res: Response) => {
    try {
        const categoryData = req.body;
        const newCategory = await createCategoryService(categoryData);
        successResponse(res, newCategory, Messages.Category_Created, StatusCode.Created);
    } catch (err: any) {
        failResponse(res, err?.message || err, StatusCode.Bad_Request);
        return;
    }
};

export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const { isPopular } = req.query as { isPopular?: string };
        const categories = await getAllCategoriesService(isPopular);
        successResponse(res, categories, Messages.Categories_Fetched, StatusCode.OK);
    } catch (err: any) {
        failResponse(res, err?.message || err, StatusCode.Bad_Request);
        return;
    }
};

export const getCategoryById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        const category = await getCategoryByIdService(id);
        if (!category) {
            failResponse(res, Messages.Category_Not_Found, StatusCode.Not_Found);
            return;
        }
        successResponse(res, category, Messages.Category_Fetched, StatusCode.OK);
    } catch (err: any) {
        failResponse(res, err?.message || err, StatusCode.Bad_Request);
        return;
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const categoryData = req.body;
        const updatedCategory = await updateCategoryService(id, categoryData);
        if (!updatedCategory) {
            failResponse(res, Messages.Category_Not_Found, StatusCode.Not_Found);
            return;
        }
        successResponse(res, updatedCategory, Messages.Category_Updated, StatusCode.OK);
    } catch (err: any) {
        failResponse(res, err?.message || err, StatusCode.Bad_Request);
        return;
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const deletedCategory = await deleteCategoryService(id);
        if (!deletedCategory) {
            failResponse(res, Messages.Category_Not_Found, StatusCode.Not_Found);
            return;
        }
        successResponse(res, "", Messages.Category_Deleted, StatusCode.OK);
    } catch (err: any) {
        failResponse(res, err?.message || err, StatusCode.Bad_Request);
        return;
    }
};

export const deleteAllCategories = async (req: Request, res: Response) => {
    try {
        const result = await deleteAllCategoriesService();

        successResponse(res, result, Messages.Category_ALL_Deleted, StatusCode.OK);
    } catch (err: any) {
        failResponse(res, err?.message || err, StatusCode.Bad_Request);
    }
};
