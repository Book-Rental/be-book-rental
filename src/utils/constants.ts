export const JWT_TOKEN_NAME = "Authorization";
export const GUEST_COOKIE_NAME = "guest";

export const Messages = {
    // =========================
    // Common
    // =========================
    Success: "Success",
    Fail: "Fail",
    Something_went_Wrong: "Something went wrong!",
    Unexpected_Error: "An unexpected error occurred",
    Internal_Server_Error: "Internal Server Error",

    // =========================
    // Authentication
    // =========================
    Unauthorized_User: "Unauthorized",
    Not_Authorized_No_Token: "Not authorized, no token",
    Invalid_Token: "Invalid token.",
    Token_Expired: "Token expired. Please log in again.",
    Token_Expired_Error: "TokenExpiredError",
    UserAuthenticated: "User Authenticated successfully!",
    Logout: "Logged out successfully",

    // =========================
    // User
    // =========================
    User_Created: "User Created successfully!",
    User_Updated: "User Updated successfully!",
    User_Deleted: "User Deleted successfully!",
    User_Not_Available: "User Not Available",
    User_Id_Required: "userId is required",
    Duplicate_Email: "Duplicate Email",
    Fetch_Error: "Error fetching users",
    Password_Not_Matched: "Invalid Password ",
    Password_Updated: "Password updated successfully!",
    CurrentPassword_NotCorrect: "Current Password not correct!",

    // =========================
    // Category
    // =========================
    Category_Created: "Category created successfully",
    Category_Updated: "Category updated successfully",
    Category_Deleted: "Category deleted successfully",
    Category_Deleted_Successfully: "Category deleted successfully",
    Category_ALL_Deleted: "All categories deleted successfully",
    Categories_Fetched: "Categories fetched successfully",
    Category_Fetched: "Category fetched successfully",
    Category_Not_Found: "Category not found",
    Invalid_Category_ID: "Invalid Category ID",
    Error_Fetching_Categories: "Error fetching categories",
    Error_Fetching_Categories_ID: "Error fetching category by ID",
    Error_Fetching_Products_By_Categories: "Error fetching products by category",
    Error_Updating_Category: "Error updating category",
    Error_deleting_Category: "Error deleting category",
    No_Products_Found_For_This_Category: "No products found for this category",

    // =========================
    // Sub Category
    // =========================
    Get_SubCategory_Not_Found: "No subcategories found for this category",
    SubCategory_Not_Found: "Subcategory not found",
    Failed_To_Add_SubCategories: "Failed to add subcategories",
    Name_And_Description_Required: "Name and description are required",
    SubCategory_Updated: "Subcategory updated successfully",
    SubCategory_Deleted: "Subcategory deleted successfully",
    SubCategories_Added: "Subcategories added successfully",

    // =========================
    // Product & Favorites
    // =========================
    Product_Created: "Product created",
    Product_Deleted: "Product deleted",
    Product_Not_Found: "Product not found",
    UserId_And_ProductId_Not_Fount: "userId and itemId are required",
    Product_Added_To_Faviorite: "Product added to favorites",
    Product_Removed_To_Faviorite: "Product removed from favorites",
    Invalid_Action_Faviorite: `Invalid action. Use "add" or "remove"`,

    // =========================
    // Book
    // =========================
    Book_Not_Found: "Book not found",
    Book_Is_Not_Found: "Book is not found",
    Book_Created_Successfully: "Book created successfully",
    Book_Fetched_Successfully: "Books fetched successfully",
    Book_Updated_Successfully: "Book updated successfully",
    Book_Deleted_Successfully: "Book deleted successfully",
    Book_Found_Successfully: "Book found successfully",
    Books_Found_Successfully: "Books found successfully",
    Book_Images_Updated_Successfully: "Book images updated successfully",
    Book_Images_Required: "Book images are required",
    Book_Images_Too_Many: "Too many images. Maximum allowed is 5",
    Book_Inactive: "Book is not active",

    // =========================
    // Cart
    // =========================
    Cart_Fetched: "Cart fetched successfully",
    Cart_Cleared: "Cart cleared",
    Cart_Item_Added: "Item added to cart",
    Cart_Item_Removed: "Item removed from cart",
    Cart_Item_Updated: "Cart item quantity updated",
    Cart_Valid: "Cart validated",

    Cart_Fetch_Failed: "Failed to fetch cart",
    Cart_Add_Item_Failed: "Failed to add item to cart",
    Cart_Remove_Item_Failed: "Failed to remove item from cart",
    Cart_Update_Item_Failed: "Failed to update item quantity",
    Cart_Clear_Failed: "Failed to clear cart",

    Cart_Not_Found: "Cart not found",
    Cart_Item_Not_Found: "Cart item not found",

    BookId_Required: "bookId is required",
    Invalid_UserId: "Invalid userId",
    Invalid_BookId: "Invalid bookId",
    Quantity_Must_Be_At_Least_One: "Quantity must be at least 1",
    Quantity_Invalid: "Quantity must be a valid number >= 0",
    Quantity_Minimum_One: "Quantity must be >= 1",
    Insufficient_Quantity: "Insufficient inventory for reserved cart quantity",

    // =========================
    // Orders
    // =========================
    OrderCreated: "Order Created successfully!",
    OrderCreating_Error: "Order Processing failed!",
    OrderUpdated: "Order Updated successfully!",
    Order_Deleted: "Order Deleted successfully!",
    Order_Not_Found: "Order not found",
    Invalid_Order_Status: "Invalid order status",
    Order_Total_Mismatch: "Total amount mismatch",
    Order_Status_Skipped: "Invalid status change. The order cannot move backward or skip steps.",
    Order_Cannot_Cancel: "Invalid status change. The order cannot cancel, it is alredy delivered.",
    Order_Cannot_Delivered:
        "Invalid status change. The order cannot devlivered, it is alredy canceled.",
    Order_Comments_Required: "Send Proper Comments, message and userId required",
    Order_Estimate_Date_Error:
        "Estimated delivery date should be greater than the current estimated delivery date.",
    Order_Fetch_success: "Order fetched successfully",
    OrderID_Is_Invalid: "OrderId is Invalid ",
    // =========================
    // Address
    // =========================
    UserId_Required_To_Update_Address: "UserId required to update address",
    AddressId_Required_To_Update_Address: "Address required to update address",
    UserId_Required_To_Delete_Address: "UserId required to delete address",
    AddressId_Required_To_Delete_Address: "Address required to delete address",
    Address_Updated: "Address update successfully",
    Address_Deleted: "Address deleted successfully",

    // =========================
    // Email
    // =========================
    Email_Verified: "Email verified successfully!",
    Invalid_Email_Verification_Token: "Token is invalid or has expired.",

    //Address
    UserId_Required: "UserId is required",
    Address_Added: "Address added successfully",
};

export const EmailSubjects = {
    Welcome: "Welcome to techdenali",
    ChangePassword: "Change Password",
    ForgotPassword: "ForgotPassword",
    Default: "From Techdenali",
};

export const RegimenInfromation = {
    cleanse: "Cleanse",
    currect: "Currect",
    hydrate: "Hydrate",
    protect: "Protect",
};

export const ProductTypes = {
    retail: "Retail",
    backbar: "Backbar",
    sample: "Sample",
};

export const PaymentMethod = {
    Credit_Card: "Credit Card",
    PayPal: "PayPal",
    COD: "COD",
};

export const orderAllowedUpdates = [
    "orderStatus",
    "shippingAddress",
    "billingAddress",
    "paymentStatus",
    "estimatedDelivery",
    "isActive",
    "comments",
];

export const UserAddressFields = [
    "name",
    "street",
    "city",
    "state",
    "zipCode",
    "country",
    "phone",
    "id",
];
