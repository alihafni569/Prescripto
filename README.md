# Prescripto – Hospital Appointment Booking System

Prescripto is a full-stack hospital appointment booking application designed to simplify the process of managing medical appointments. It provides dedicated functionalities for patients, doctors, and administrators through a secure and user-friendly platform.

## 🚀 Features

### Authentication & Authorization
- Secure authentication using JWT.
- Role-based access control (Admin, Doctor, Patient).
- Protected routes and API endpoints.
- Secure password handling.

### Patient Features
- Register and manage personal profiles.
- Browse available doctors and specializations.
- View doctor availability.
- Book medical appointments.
- View and manage personal appointments.
- Cancel appointments.

### Doctor Features
- Manage doctor profiles.
- View assigned appointments.
- Manage appointment statuses.
- Monitor appointment schedules.

### Admin Features
- Manage doctors and patients.
- Add and manage doctor information.
- View and manage all appointments.
- Access administrative dashboard statistics.

### Backend Features
- RESTful API architecture.
- Modular backend structure (Routes, Controllers, Services, Repositories).
- Request validation using Zod.
- Database management using Prisma ORM.
- Centralized error handling.
- Authentication and authorization middleware.
- Rate limiting for API protection.
- Image uploads using Cloudinary.

## 🛠️ Tech Stack

### Frontend
- React.js
- JavaScript
- Tailwind CSS
- Axios

### Backend
- Node.js
- Express.js
- Prisma ORM
- Zod
- JWT Authentication

### Database & Services
- Microsoft SQL Server
- Cloudinary

### Development Tools
- Git & GitHub
- Postman
- npm

## 📂 Project Structure

```text
Prescripto/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── validators/
│   ├── utils/
│   └── package.json
│
└── README.md
```

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/alihafni569-cmd/Prescripto.git
```

```bash
cd prescripto
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside the backend directory and configure your database connection, authentication secret, Cloudinary credentials, and application settings.

Example:

```env
PORT=3000
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Set Up the Database

Configure your SQL Server connection and run the appropriate Prisma database commands for your schema.

### 5. Start the Backend

```bash
npm run dev
```

### 6. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

## 🔐 Security

Prescripto implements several security practices:

- JWT-based authentication.
- Role-based authorization.
- Zod request validation.
- Secure password handling.
- Protected API routes.
- Centralized error handling.
- API rate limiting.

## 🎯 Project Goals

This project was developed to demonstrate practical full-stack development skills, including:

- Building scalable RESTful APIs.
- Designing relational databases.
- Implementing authentication and authorization.
- Applying clean backend architecture.
- Managing real-world business logic.
- Integrating third-party services.

## 👨‍💻 Developer

**Ali Mohammed**

Full Stack Node.js Developer

- GitHub: [alihafni569-cmd](https://github.com/alihafni569-cmd)

---

⭐ If you find this project useful, consider giving it a star!
