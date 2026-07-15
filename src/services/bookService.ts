import { Request, Response } from "express";
import Book, { IBook } from "../models/Book";



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
}


export const getBookByIdService = async (id: string) => {
    try {
        return await Book.findById(id)
    } catch (err) {
        throw err;
    }
}

export const updateBookByIdService = async (id: string, data: Partial<IBook>) => {
    try {
        const updatedBook = await Book.findByIdAndUpdate(id, data, { new: true });
        return updatedBook;
    } catch (err) {
        throw err;
    }
}