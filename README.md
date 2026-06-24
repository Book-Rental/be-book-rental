# Book Rental Application Backend

A robust, scalable RESTful API built with **Node.js** and **Express.js** to power a digital book rental platform. This backend handles user management, inventory tracking, secure lending workflows, and automated return tracking.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your local machine:
* **Node.js** (v18.x or higher)
* **npm** (v9.x or higher) or **Yarn**
* **MongoDB** (Local instance or MongoDB Atlas URI)

---

## 🚀 Getting Started

Follow these steps to get a local copy up and running.

### 1. Clone the Repository
Clone the project to your local machine using git:
```bash
git clone https://github.com
cd book-rental-backend
```

### 2. Install Dependencies
Install all the required npm packages:
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory of the project and add your configurations:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/book_rental_db
JWT_SECRET=your_super_secret_jwt_key
TOKEN_EXPIRY=24h
```

---

## 💻 Running the Application

### Development Mode
Runs the app with automatic server restarts when files change (requires `nodemon` configured in `package.json`):
```bash
npm run dev
```
The server will typically start running at `http://localhost:5000`.

### Production Mode
To run the server in a production environment using standard node execution:
```bash
npm start
```

---

## 📦 Building and Deploying

If you are using TypeScript or a bundler, follow the build steps below. *(Note: If you are using plain JavaScript, you can skip the compilation step and run `npm start` directly).*

### 1. Build the Project
Compile the source code into production-ready code (usually outputs to a `dist/` or `build/` folder):
```bash
npm run build
```

### 2. Run the Production Build
Once the build is complete, launch the compiled production bundle:
```bash
npm run start:prod
```

---

## 🧪 API Testing
You can use tools like **Postman** or **Thunder Client** to test the API endpoints. 
* Base URL: `http://localhost:5000/api/v1`

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
