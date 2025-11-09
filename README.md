# Video Upload, Sensitivity Processing, and Streaming Application

A comprehensive full-stack application that enables users to upload videos, processes them for content sensitivity analysis, and provides seamless video streaming capabilities with real-time progress tracking.

## Features

### Core Functionality
- ✅ Full-Stack Architecture: Node.js + Express + MongoDB (backend) and React + Vite (frontend)
- ✅ Video Management: Complete video upload and secure storage system
- ✅ Content Analysis: Process videos for sensitivity detection (safe/flagged classification)
- ✅ Real-Time Updates: Display live processing progress to users using Socket.io
- ✅ Streaming Service: Enable video playback using HTTP range requests
- ✅ Access Control: Multi-tenant architecture with role-based permissions

### Advanced Features
- ✅ Multi-Tenant Architecture: User isolation and data segregation
- ✅ Role-Based Access Control (RBAC): Viewer, Editor, and Admin roles
- ✅ Video Processing Pipeline: Upload validation, storage management, sensitivity analysis
- ✅ Real-Time Progress Tracking: Live updates during video processing
- ✅ Video Filtering: Filter by status, sensitivity, and search
- ✅ Responsive Design: Cross-platform compatibility

## Technology Stack

### Backend
- **Runtime**: Node.js (Latest LTS version)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-Time**: Socket.io
- **Authentication**: JWT (JSON Web Tokens)
- **File Handling**: Multer for video uploads

### Frontend
- **Build Tool**: Vite
- **Framework**: React (Latest stable version)
- **State Management**: Context API
- **Styling**: CSS Modules
- **HTTP Client**: Axios
- **Real-Time**: Socket.io client
- **Video Player**: ReactPlayer

## Project Structure

```
pulse/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   └── videoController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── socketAuth.js
│   │   └── upload.js
│   ├── models/
│   │   ├── User.js
│   │   └── Video.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── videoRoutes.js
│   │   └── userRoutes.js
│   ├── services/
│   │   └── videoProcessor.js
│   ├── socket/
│   │   └── socketHandler.js
│   ├── uploads/
│   │   ├── videos/
│   │   └── processed/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── PrivateRoute.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── SocketContext.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── UploadVideo.jsx
│   │   │   ├── VideoLibrary.jsx
│   │   │   └── VideoPlayer.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Installation and Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/video-streaming
JWT_SECRET=your-secret-jwt-key-change-in-production
JWT_EXPIRE=30d
NODE_ENV=development
UPLOAD_DIR=./uploads/videos
PROCESSED_DIR=./uploads/processed
FRONTEND_URL=http://localhost:5173
```

5. Start the backend server:
```bash
npm run dev
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Usage

### User Registration
1. Navigate to the registration page
2. Fill in username, email, password, and select a role (viewer, editor, or admin)
3. Click "Register" to create an account

### User Login
1. Navigate to the login page
2. Enter your email and password
3. Click "Login" to access the application

### Uploading Videos (Editor/Admin)
1. Navigate to "Upload Video" from the navigation menu
2. Select a video file (supported formats: MP4, MPEG, MOV, AVI, WebM)
3. Click "Upload Video"
4. Monitor the upload and processing progress in real-time

### Viewing Videos
1. Navigate to "Videos" from the navigation menu
2. Browse all uploaded videos
3. Use filters to search by status, sensitivity, or keywords
4. Click on a video to watch it

### Video Streaming
1. Click on a completed video from the video library
2. The video will stream with HTTP range request support
3. Use the video player controls to play, pause, and seek

## API Documentation

### Authentication Endpoints

#### Register User
- **POST** `/api/auth/register`
- **Body**: `{ username, email, password, role, tenantId }`
- **Response**: `{ success, token, user }`

#### Login User
- **POST** `/api/auth/login`
- **Body**: `{ email, password }`
- **Response**: `{ success, token, user }`

#### Get Current User
- **GET** `/api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success, user }`

### Video Endpoints

#### Upload Video
- **POST** `/api/videos/upload`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `FormData` with `video` file
- **Access**: Editor, Admin
- **Response**: `{ success, message, video }`

#### Get All Videos
- **GET** `/api/videos?page=1&limit=10&status=&sensitivityStatus=&search=`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success, count, total, page, pages, videos }`

#### Get Single Video
- **GET** `/api/videos/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success, video }`

#### Stream Video
- **GET** `/api/videos/:id/stream`
- **Headers**: `Authorization: Bearer <token>` or `?token=<token>`
- **Response**: Video stream with HTTP range request support

#### Delete Video
- **DELETE** `/api/videos/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Access**: Editor, Admin
- **Response**: `{ success, message }`

### User Endpoints

#### Get All Users (Admin only)
- **GET** `/api/users`
- **Headers**: `Authorization: Bearer <token>`
- **Access**: Admin
- **Response**: `{ success, count, users }`

#### Get User by ID
- **GET** `/api/users/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ success, user }`

## Role-Based Access Control

### Viewer Role
- Can view videos assigned to their tenant
- Read-only access to video content
- Cannot upload or delete videos

### Editor Role
- Can upload videos
- Can view and manage their own videos
- Can delete their own videos
- Cannot manage other users' videos

### Admin Role
- Full system access
- Can view all videos in their tenant
- Can delete any video in their tenant
- Can manage users (view user list)

## Multi-Tenant Architecture

The application implements a multi-tenant architecture where:
- Each user belongs to a tenant (tenantId)
- Users can only access videos from their own tenant
- Data is securely segregated by tenant
- Tenant isolation is enforced at the database query level

## Video Processing Pipeline

1. **Upload Validation**: File type, size, and format verification
2. **Storage Management**: Secure file storage with proper naming conventions
3. **Sensitivity Analysis**: Automated content screening and classification
4. **Status Updates**: Real-time progress communication to the frontend via Socket.io
5. **Streaming Preparation**: Video optimization for efficient streaming

## Real-Time Updates

The application uses Socket.io for real-time communication:
- Processing progress updates
- Video status changes
- Completion notifications
- Error notifications

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Multi-tenant data isolation
- Secure file upload validation
- Token-based API authentication

## Error Handling

The application includes comprehensive error handling:
- Validation errors
- Authentication errors
- Authorization errors
- File upload errors
- Processing errors
- User-friendly error messages

## Deployment

### Backend Deployment
1. Set up MongoDB Atlas or use a cloud MongoDB service
2. Configure environment variables in your hosting platform
3. Deploy to Heroku, AWS, or similar platform
4. Ensure upload directories are properly configured

### Frontend Deployment
1. Build the frontend: `npm run build`
2. Deploy the `dist` folder to Netlify, Vercel, or similar platform
3. Configure environment variables for API endpoints

## Development

### Running in Development Mode

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### Building for Production

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
```

