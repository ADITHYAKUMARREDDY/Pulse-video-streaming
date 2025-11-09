# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

For video streaming, the token can also be passed as a query parameter:
```
GET /api/videos/:id/stream?token=<token>
```

## Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "viewer" | "editor" | "admin",
  "tenantId": "string" (optional)
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "username": "string",
    "email": "string",
    "role": "string",
    "tenantId": "string"
  }
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "username": "string",
    "email": "string",
    "role": "string",
    "tenantId": "string"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "username": "string",
    "email": "string",
    "role": "string",
    "tenantId": "string"
  }
}
```

### Videos

#### Upload Video
```http
POST /api/videos/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "video": File
}
```

**Access:** Editor, Admin

**Response:**
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "video": {
    "id": "video-id",
    "filename": "string",
    "originalName": "string",
    "fileSize": number,
    "status": "string",
    "processingProgress": number
  }
}
```

#### Get All Videos
```http
GET /api/videos?page=1&limit=10&status=&sensitivityStatus=&search=
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (uploading, processing, completed, failed, flagged)
- `sensitivityStatus` (optional): Filter by sensitivity (safe, flagged, pending)
- `search` (optional): Search by video name

**Response:**
```json
{
  "success": true,
  "count": number,
  "total": number,
  "page": number,
  "pages": number,
  "videos": [
    {
      "_id": "video-id",
      "filename": "string",
      "originalName": "string",
      "filePath": "string",
      "processedFilePath": "string",
      "fileSize": number,
      "mimeType": "string",
      "duration": number,
      "status": "string",
      "sensitivityStatus": "string",
      "processingProgress": number,
      "uploadedBy": {
        "_id": "user-id",
        "username": "string",
        "email": "string"
      },
      "tenantId": "string",
      "metadata": {
        "width": number,
        "height": number,
        "bitrate": number,
        "codec": "string"
      },
      "uploadedAt": "ISO date",
      "processedAt": "ISO date"
    }
  ]
}
```

#### Get Single Video
```http
GET /api/videos/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "video": {
    "_id": "video-id",
    "filename": "string",
    "originalName": "string",
    "filePath": "string",
    "processedFilePath": "string",
    "fileSize": number,
    "mimeType": "string",
    "duration": number,
    "status": "string",
    "sensitivityStatus": "string",
    "processingProgress": number,
    "uploadedBy": {
      "_id": "user-id",
      "username": "string",
      "email": "string"
    },
    "tenantId": "string",
    "metadata": {},
    "uploadedAt": "ISO date",
    "processedAt": "ISO date"
  }
}
```

#### Stream Video
```http
GET /api/videos/:id/stream
Authorization: Bearer <token>
Range: bytes=0-1023 (optional)
```

**Response:**
- Video stream with HTTP range request support
- Content-Type: video/mp4 (or appropriate MIME type)
- Content-Range header for partial content (206 status)
- Accept-Ranges: bytes

#### Delete Video
```http
DELETE /api/videos/:id
Authorization: Bearer <token>
```

**Access:** Editor (own videos), Admin (all videos)

**Response:**
```json
{
  "success": true,
  "message": "Video deleted successfully"
}
```

### Users

#### Get All Users
```http
GET /api/users
Authorization: Bearer <token>
```

**Access:** Admin

**Response:**
```json
{
  "success": true,
  "count": number,
  "users": [
    {
      "_id": "user-id",
      "username": "string",
      "email": "string",
      "role": "string",
      "tenantId": "string",
      "createdAt": "ISO date"
    }
  ]
}
```

#### Get User by ID
```http
GET /api/users/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "_id": "user-id",
    "username": "string",
    "email": "string",
    "role": "string",
    "tenantId": "string",
    "createdAt": "ISO date"
  }
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error message"
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `206` - Partial Content (for video streaming)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## WebSocket Events

### Client to Server

#### Join Video Room
```javascript
socket.emit('video:join', videoId);
```

#### Leave Video Room
```javascript
socket.emit('video:leave', videoId);
```

### Server to Client

#### Video Processing Started
```javascript
socket.on('video:processing', (data) => {
  // data: { videoId, status, progress }
});
```

#### Video Progress Update
```javascript
socket.on('video:progress', (data) => {
  // data: { videoId, progress, message }
});
```

#### Video Processing Completed
```javascript
socket.on('video:completed', (data) => {
  // data: { videoId, status, sensitivityStatus, progress }
});
```

#### Video Processing Error
```javascript
socket.on('video:error', (data) => {
  // data: { videoId, status, error }
});
```

## Rate Limiting

Currently, no rate limiting is implemented. For production, consider implementing rate limiting to prevent abuse.

## CORS

CORS is enabled for the frontend URL. Configure `FRONTEND_URL` in the backend `.env` file.

## File Upload Limits

- Maximum file size: 500MB
- Supported formats: MP4, MPEG, MOV, AVI, WebM
- File validation is performed on both client and server side

