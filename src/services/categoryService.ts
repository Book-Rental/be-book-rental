import Category from "../models/Category";
import { ICategory } from "../models/interfaces";

export const createCategoryService = async (categoryData: ICategory) => {
    try {
        return Category.create(categoryData);
    } catch (err: any) {
        throw new Error(err?.message || err);
    }
}

export const getAllCategoriesService = async (isPopular?: boolean | string) => {
    try {
        // Build the filter object based on the incoming value
        const filter = isPopular === true || isPopular === 'true' ? { isPopular: true } : {};
        
        // Pass the filter into the find method
        return await Category.find(filter);
    } catch (err: any) {
        throw new Error(err?.message || err);
    }
};

export const getCategoryByIdService = async (id: string) => {
    try {
        return Category.findById(id);
    } catch (err: any) {
        throw new Error(err?.message || err);
    }
}

export const updateCategoryService = async (id: string, categoryData: Partial<ICategory>) => {
    try {
        const updatedCategory = await Category.findByIdAndUpdate(id, categoryData, { new: true });
        return updatedCategory;
    } catch (err: any) {
        throw new Error(err?.message || err);
    }
}


export const deleteCategoryService = async (id: string) => {
    try {
        const deletedCategory = await Category.findByIdAndDelete(id);
        return deletedCategory;

    } catch (err: any) {
        throw new Error(err?.message || err);
    }
}

export const deleteAllCategoriesService = async () => {
    try {
        const result = await Category.deleteMany({});
        return result;
    } catch (err: any) {
        throw new Error(err?.message || err);
    }
};