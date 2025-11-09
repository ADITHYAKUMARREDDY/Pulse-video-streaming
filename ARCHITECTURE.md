# Architecture Overview

## System Architecture

The Video Streaming Application follows a full-stack architecture with clear separation between frontend and backend components.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   UI     │  │  State   │  │  Socket  │  │  HTTP    │   │
│  │ Components│ │ Management│ │  Client  │  │  Client  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            │ WebSocket (Socket.io)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js/Express)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Routes  │  │Controllers│ │Middleware │  │ Services │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Models  │  │  Socket  │  │   Auth   │  │ Processor│   │
│  │ (Mongoose)│ │  Handler │  │ (JWT)    │  │ (Video)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database (MongoDB)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  Users   │  │  Videos  │  │          │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    File Storage (Local/Cloud)                │
│  ┌──────────┐  ┌──────────┐                                │
│  │  Uploads │  │ Processed│                                │
│  └──────────┘  └──────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Backend Components

#### 1. Server (server.js)
- Main entry point
- Express application setup
- HTTP server with Socket.io
- MongoDB connection
- Route registration
- Middleware configuration

#### 2. Routes
- **authRoutes.js**: Authentication endpoints
- **videoRoutes.js**: Video management endpoints
- **userRoutes.js**: User management endpoints

#### 3. Controllers
- **authController.js**: Authentication logic
  - User registration
  - User login
  - Get current user
- **videoController.js**: Video management logic
  - Video upload
  - Video listing
  - Video streaming
  - Video deletion

#### 4. Models
- **User.js**: User schema and methods
  - Username, email, password
  - Role (viewer, editor, admin)
  - Tenant ID
  - Password hashing
- **Video.js**: Video schema and methods
  - File metadata
  - Processing status
  - Sensitivity status
  - Tenant ID
  - User reference

#### 5. Middleware
- **auth.js**: Authentication and authorization
  - JWT token verification
  - Role-based access control
  - Tenant isolation
- **upload.js**: File upload handling
  - Multer configuration
  - File validation
  - Storage configuration
- **socketAuth.js**: Socket.io authentication
  - Token verification for WebSocket connections

#### 6. Services
- **videoProcessor.js**: Video processing logic
  - Processing pipeline
  - Sensitivity analysis (simulated)
  - Progress updates via Socket.io
  - File management

#### 7. Socket Handler
- **socketHandler.js**: WebSocket connection management
  - Connection handling
  - Room management
  - Event emission

### Frontend Components

#### 1. App (App.jsx)
- Main application component
- Router configuration
- Context providers
- Route definitions

#### 2. Context Providers
- **AuthContext.jsx**: Authentication state management
  - User state
  - Login/logout functions
  - Token management
- **SocketContext.jsx**: WebSocket connection management
  - Socket.io client
  - Connection handling
  - Room management

#### 3. Pages
- **Login.jsx**: User login page
- **Register.jsx**: User registration page
- **Dashboard.jsx**: Main dashboard with statistics
- **VideoLibrary.jsx**: Video listing and filtering
- **UploadVideo.jsx**: Video upload interface
- **VideoPlayer.jsx**: Video playback page

#### 4. Components
- **Navbar.jsx**: Navigation bar
- **PrivateRoute.jsx**: Protected route wrapper

## Data Flow

### Authentication Flow

```
User Registration/Login
    │
    ▼
Frontend: AuthContext
    │
    ▼
HTTP POST /api/auth/register or /login
    │
    ▼
Backend: authController
    │
    ▼
MongoDB: User Model
    │
    ▼
JWT Token Generation
    │
    ▼
Frontend: Store Token
    │
    ▼
Set Authorization Header
```

### Video Upload Flow

```
User Selects Video File
    │
    ▼
Frontend: UploadVideo Component
    │
    ▼
HTTP POST /api/videos/upload (FormData)
    │
    ▼
Backend: upload Middleware (Multer)
    │
    ▼
Backend: videoController.uploadVideo
    │
    ▼
MongoDB: Create Video Record
    │
    ▼
Backend: videoProcessor.processVideo (Async)
    │
    ▼
Socket.io: Emit Progress Updates
    │
    ▼
Frontend: Receive Updates via Socket
    │
    ▼
MongoDB: Update Video Status
    │
    ▼
Socket.io: Emit Completion
```

### Video Streaming Flow

```
User Clicks Video
    │
    ▼
Frontend: VideoPlayer Component
    │
    ▼
HTTP GET /api/videos/:id
    │
    ▼
Backend: videoController.getVideo
    │
    ▼
MongoDB: Fetch Video Metadata
    │
    ▼
Frontend: Construct Stream URL
    │
    ▼
HTTP GET /api/videos/:id/stream (Range Request)
    │
    ▼
Backend: videoController.streamVideo
    │
    ▼
File System: Read Video File
    │
    ▼
HTTP 206 Partial Content Response
    │
    ▼
Frontend: ReactPlayer Plays Video
```

## Security Architecture

### Authentication
- JWT-based authentication
- Token stored in localStorage (frontend)
- Token passed in Authorization header
- Token expiration (30 days default)

### Authorization
- Role-based access control (RBAC)
- Three roles: viewer, editor, admin
- Route-level authorization
- Resource-level authorization

### Multi-Tenant Isolation
- Tenant ID in user model
- Tenant ID in video model
- Query filtering by tenant ID
- Data segregation at database level

### File Security
- File type validation
- File size limits
- Secure file storage
- Access control on file access

## Real-Time Communication

### WebSocket Architecture
```
Client (Socket.io Client)
    │
    ▼
Server (Socket.io Server)
    │
    ▼
Authentication (JWT Token)
    │
    ▼
Room Management
    │
    ├── User Rooms (user-{userId})
    ├── Tenant Rooms (tenant-{tenantId})
    └── Video Rooms (video-{videoId})
    │
    ▼
Event Emission
    │
    ├── video:processing
    ├── video:progress
    ├── video:completed
    └── video:error
```

## Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  role: String (viewer|editor|admin),
  tenantId: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Video Collection
```javascript
{
  _id: ObjectId,
  filename: String,
  originalName: String,
  filePath: String,
  processedFilePath: String,
  fileSize: Number,
  mimeType: String,
  duration: Number,
  status: String (uploading|processing|completed|failed|flagged),
  sensitivityStatus: String (safe|flagged|pending),
  processingProgress: Number (0-100),
  uploadedBy: ObjectId (ref: User),
  tenantId: String,
  metadata: {
    width: Number,
    height: Number,
    bitrate: Number,
    codec: String
  },
  errorMessage: String,
  uploadedAt: Date,
  processedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- User: `email` (unique), `username` (unique), `tenantId`
- Video: `tenantId`, `uploadedBy`, `status`, `sensitivityStatus`

## Design Patterns

### 1. MVC Pattern
- Models: Database schemas
- Views: React components
- Controllers: Request handlers

### 2. Middleware Pattern
- Authentication middleware
- Authorization middleware
- Upload middleware
- Error handling middleware

### 3. Service Pattern
- Video processing service
- Separation of business logic

### 4. Context Pattern (React)
- Authentication context
- Socket context
- State management

### 5. Repository Pattern (implicit)
- Mongoose models act as repositories
- Database abstraction

## Scalability Considerations

### Current Limitations
- Local file storage
- Single server deployment
- No load balancing
- No CDN integration
- Simulated video processing
