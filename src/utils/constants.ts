
export const JWT_TOKEN_NAME = 'Authorization';

export const Messages = {
    User_Updated: "User Updated successfully!",
    User_Deleted: "User Deleted successfully!",
    User_Created: "User Created successfully!",
    User_Not_Available: "User Not Available",
    Unauthorized_User: "Unauthorized",
    Duplicate_Email: "Duplicate Email",
    UserAuthenticated: "User Authenticated successfully!",
    Fetch_Error: "Error fetching users",
    Something_went_Wrong: "Something went wrong!",
    Internal_Server_Error: "Internal Server Error",
    Success: "Success",
    Fail: 'Fail',
    Not_Authorized_No_Token: "Not authorized, no token",
    Invalid_Token: "Invalid token.",
    Token_Expired: "Token expired. Please log in again.",
    Token_Expired_Error: "TokenExpiredError",
    Get_SubCategory_Not_Found: "No subcategories found for this category",
    Category_Not_Found: "Category not found",
    SubCategory_Not_Found: "Subcategory not found",
    Unexpected_Error: "An unexpected error occurred",
    Invalid_Category_ID: "Invalid Category ID",
    Failed_To_Add_SubCategories: "Failed to add subcategories",
    Name_And_Description_Required: "Name and description are required",
    SubCategory_Updated: 'Subcategory updated successfully',
    SubCategory_Deleted: 'Subcategory deleted successfully',
    SubCategories_Added: 'Subcategories added successfully',
    Error_Fetching_Categories: 'Error fetching categories',
    Error_Fetching_Categories_ID: 'Error fetching category by ID',
    Error_Fetching_Products_By_Categories: 'Error fetching products by category',
    Error_Updating_Category: "Error updating category",
    Error_deleting_Category: "Error deleting category",
    No_Products_Found_For_This_Category: "No products found for this category",
    Category_Deleted_Successfully: "Category deleted successfully",
    Product_Not_Found: "Product not found",
    Product_Deleted: "Product deleted",
    Product_Created: "Product created",
    Email_Verified: "Email verified successfully!",
    Invalid_Email_Verification_Token: "Token is invalid or has expired.",
    Logout: "Logged out successfully",
    Password_Updated: 'Password updated successfully!',
    CurrentPassword_NotCorrect: 'Current Password not correct!',
    UserId_And_ProductId_Not_Fount: "userId and itemId are required",
    Product_Added_To_Faviorite: "Product added to favorites",
    Invalid_Action_Faviorite: `Invalid action. Use "add" or "remove"`,
    Product_Removed_To_Faviorite: 'Product removed from favorites',
    OrderCreated: 'Order Created successfully!',
    OrderCreating_Error: 'Order Processing failed!',
    OrderUpdated: 'Order Updated successfully!',
    Order_Total_Mismatch: "Total amount mismatch",
    Order_Not_Found: "Order not found",
    Invalid_Order_Status: "Invalid order status",
    Order_Status_Skipped: "Invalid status change. The order cannot move backward or skip steps.",
    Order_Cannot_Cancel: "Invalid status change. The order cannot cancel, it is alredy delivered.",
    Order_Cannot_Delivered: "Invalid status change. The order cannot devlivered, it is alredy canceled.",
    Order_Deleted: "Order Deleted successfully!",
    Order_Comments_Required: "Send Proper Comments, message and userId required",
    Order_Estimate_Date_Error: "Estimated delivery date should be greater than the current estimated delivery date.",
    UserId_Required_To_Update_Address : "UserId required to update address",
    AddressId_Required_To_Update_Address : "Address required to update address",
    UserId_Required_To_Delete_Address : "UserId required to delete address",
    AddressId_Required_To_Delete_Address : "Address required to delete address",
    Address_Updated: "Address update successfully",
    Address_Deleted: "Address deleted successfully",

    Category_Created: "Category created successfully",
    Category_Updated: "Category updated successfully",
    Category_Deleted: "Category deleted successfully",
    Categories_Fetched: "Categories fetched successfully",
    Category_Fetched: "Category fetched successfully",
}

export const EmailSubjects = {
    Welcome: "Welcome to techdenali",
    ChangePassword: "Change Password",
    ForgotPassword: "ForgotPassword",
    Default: "From Techdenali"
}

export const RegimenInfromation = {
    cleanse: 'Cleanse',
    currect: 'Currect',
    hydrate: 'Hydrate',
    protect: 'Protect'
}

export const ProductTypes = {
    retail: "Retail",
    backbar: "Backbar",
    sample: "Sample"
}


export const PaymentMethod = {
    Credit_Card: 'Credit Card',
    PayPal: 'PayPal',
    COD: 'COD'
}

export const PaymentStatus = {
    Pending: 'Pending',
    Paid: 'Paid',
    Failed: 'Failed'
}

export const orderAllowedUpdates = [
    'orderStatus',
    'shippingAddress',
    'billingAddress',
    'paymentStatus',
    'estimatedDelivery',
    'isActive',
    'comments'
];

export const UserAddressFields = [
    "name",
    "street",
    "city",
    "state",
    "zipCode",
    "country",
    "phone",
    "id"
];
