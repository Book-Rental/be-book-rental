import { Request, Response } from "express";
import Book, { IBook } from "../models/Book";
import { buildPaginationQuery } from "../utils/appFunctions";

export const createBookService = async (data: Partial<IBook>) => {
    try {
        const parsedData: Partial<IBook> = { ...data };

        const newBook = await Book.create({
            ...parsedData,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return newBook;
    } catch (err) {
        throw err;
    }
};

export const deleteBookByIdService = async (id: string) => {
    try {
        const deletedBook = await Book.findByIdAndDelete(id);
        return deletedBook;
    } catch (err) {
        throw err;
    }
};

export const getBookByIdService = async (id: string) => {
    try {
        return await Book.findById(id);
    } catch (err) {
        throw err;
    }
};

export const updateBookByIdService = async (id: string, data: Partial<IBook>) => {
    try {
        const updatedBook = await Book.findByIdAndUpdate(id, data, { new: true });
        return updatedBook;
    } catch (err) {
        throw err;
    }
};

export const getBooksBySellerIdService = async (sellerId: string, query: any) => {
    try {
        const { skip, limit, page } = buildPaginationQuery(query);

        const filter: Record<string, any> = { sellerId };
        if (query.categoryId) {
            filter.categoryId = query.categoryId;
        }

        const totalRecords = await Book.countDocuments(filter);
        const totalPages = Math.ceil(totalRecords / limit);

        const hasMore = page < totalPages;
        const books = await Book.find(filter)
            .populate("categoryId", "name")
            .skip(skip)
            .limit(limit);

        return {
            books,
            meta: {
                totalRecords,
                totalPages,
                currentPage: page,
                limit,
                hasMore,
            },
        };
    } catch (err) {
        throw err;
    }
};
