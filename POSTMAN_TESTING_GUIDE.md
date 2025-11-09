# Postman Testing Guide

Complete step-by-step guide to test all API endpoints using Postman.

## 📋 Prerequisites

1. **Postman Installed**: Download from [postman.com](https://www.postman.com/downloads/)
2. **Backend Running**: Start the backend server on `http://localhost:5000`
3. **MongoDB Running**: Ensure MongoDB is running and connected
4. **Postman Collection**: Create a new collection for API testing

## 🚀 Setup Postman Environment

### Step 1: Create Environment

1. Open Postman
2. Click on "Environments" in the left sidebar
3. Click "+" to create a new environment
4. Name it: `Video Streaming API`
5. Add these variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `base_url` | `http://localhost:5000` | `http://localhost:5000` |
| `token` | (leave empty) | (will be set automatically) |
| `user_id` | (leave empty) | (will be set automatically) |
| `video_id` | (leave empty) | (will be set automatically) |
| `tenant_id` | (leave empty) | (will be set automatically) |

6. Click "Save"
7. Select this environment from the dropdown (top right)

## 📁 Create Postman Collection

1. Click "Collections" in the left sidebar
2. Click "+" to create a new collection
3. Name it: `Video Streaming API Tests`
4. Add folders:
   - `1. Authentication`
   - `2. Videos`
   - `3. Users`

## 🔐 1. Authentication Tests

### Test 1.1: Register User (Viewer)

**Request:**
- **Method**: `POST`
- **URL**: `{{base_url}}/api/auth/register`
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "username": "testviewer",
    "email": "viewer@test.com",
    "password": "password123",
    "role": "viewer"
  }
  ```

**Expected Response:**
- **Status**: `201 Created`
- **Body**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "username": "testviewer",
      "email": "viewer@test.com",
      "role": "viewer",
      "tenantId": "tenant-..."
    }
  }
  ```

**Postman Script** (Tests tab):
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response has token", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('token');
    pm.environment.set("token", jsonData.token);
});

pm.test("Response has user", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('user');
    pm.environment.set("user_id", jsonData.user.id);
    pm.environment.set("tenant_id", jsonData.user.tenantId);
});
```

---

### Test 1.2: Register User (Editor)

**Request:**
- **Method**: `POST`
- **URL**: `{{base_url}}/api/auth/register`
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "username": "testeditor",
    "email": "editor@test.com",
    "password": "password123",
    "role": "editor"
  }
  ```

**Expected Response:**
- **Status**: `201 Created`
- **Body**: Similar to Test 1.1, but with `role: "editor"`

**Postman Script**:
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

var jsonData = pm.response.json();
if (jsonData.token) {
    pm.environment.set("editor_token", jsonData.token);
    pm.environment.set("editor_id", jsonData.user.id);
}
```

---

### Test 1.3: Register User (Admin)

**Request:**
- **Method**: `POST`
- **URL**: `{{base_url}}/api/auth/register`
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "username": "testadmin",
    "email": "admin@test.com",
    "password": "password123",
    "role": "admin"
  }
  ```

**Expected Response:**
- **Status**: `201 Created`
- **Body**: Similar to Test 1.1, but with `role: "admin"`

**Postman Script**:
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

var jsonData = pm.response.json();
if (jsonData.token) {
    pm.environment.set("admin_token", jsonData.token);
    pm.environment.set("admin_id", jsonData.user.id);
}
```

---

### Test 1.4: Login User

**Request:**
- **Method**: `POST`
- **URL**: `{{base_url}}/api/auth/login`
- **Headers**:
  ```
  Content-Type: application/json
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MTA0MzI2ZjI3M2IzNmQwMTZmMzIyMyIsImlhdCI6MTc2MjY3MzQ0NiwiZXhwIjoxNzY1MjY1NDQ2fQ.W7NGo57ucfyRB3kFj_QQAjWovAaXAzZ-41F7pPwwp3o
- **Body** (raw JSON):
  ```json
  {
    "email": "editor@test.com",
    "password": "password123"
  }
  ```

**Expected Response:**
- **Status**: `200 OK`
- **Body**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "username": "testeditor",
      "email": "editor@test.com",
      "role": "editor",
      "tenantId": "tenant-..."
    }
  }
  ```

**Postman Script**:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has token", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('token');
    pm.environment.set("token", jsonData.token);
});
```

---

### Test 1.5: Get Current User

**Request:**
- **Method**: `GET`
- **URL**: `{{base_url}}/api/auth/me`
- **Headers**:
  ```
  Authorization: Bearer {{token}}
  ```

**Expected Response:**
- **Status**: `200 OK`
- **Body**:
  ```json
  {
    "success": true,
    "user": {
      "id": "...",
      "username": "testeditor",
      "email": "editor@test.com",
      "role": "editor",
      "tenantId": "tenant-..."
    }
  }
  ```

**Postman Script**:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has user", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('user');
});
```

---

### Test 1.6: Login with Invalid Credentials

**Request:**
- **Method**: `POST`
- **URL**: `{{base_url}}/api/auth/login`
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "email": "wrong@test.com",
    "password": "wrongpassword"
  }
  ```

**Expected Response:**
- **Status**: `401 Unauthorized`
- **Body**:
  ```json
  {
    "success": false,
    "message": "Invalid credentials"
  }
  ```

**Postman Script**:
```javascript
pm.test("Status code is 401", function () {
    pm.response.to.have.status(401);
});
```

---

## 📹 2. Video Tests

### Test 2.1: Upload Video (Editor/Admin)

**Request:**
- **Method**: `POST`
- **URL**: `{{base_url}}/api/videos/upload`
- **Headers**:
  ```
  Authorization: Bearer {{editor_token}}
  ```
- **Body** (form-data):
  - Key: `video`
  - Type: `File`
  - Value: Select a video file (MP4, MOV, AVI, etc.)

**Expected Response:**
- **Status**: `201 Created`
- **Body**:
  ```json
  {
    "success": true,
    "message": "Video uploaded successfully",
    "video": {
      "id": "...",
      "filename": "video-1234567890-123456789.mp4",
      "originalName": "test-video.mp4",
      "fileSize": 1234567,
      "status": "uploading",
      "processingProgress": 0
    }
  }
  ```

**Postman Script**:
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response has video", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('video');
    pm.environment.set("video_id", jsonData.video.id);
});
```

---

### Test 2.2: Upload Video (Viewer - Should Fail)

**Request:**
- **Method**: `POST`
- **URL**: `{{base_url}}/api/videos/upload`
- **Headers**:
  ```
  Authorization: Bearer {{token}}
  ```
- **Body** (form-data):
  - Key: `video`
  - Type: `File`
  - Value: Select a video file

**Expected Response:**
- **Status**: `403 Forbidden`
- **Body**:
  ```json
  {
    "success": false,
    "message": "User role 'viewer' is not authorized to access this route"
  }
  ```

**Postman Script**:
```javascript
pm.test("Status code is 403", function () {
    pm.response.to.have.status(403);
});
```

---

### Test 2.3: Get All Videos

**Request:**
- **Method**: `GET`
- **URL**: `{{base_url}}/api/videos`
- **Headers**:
  ```
  Authorization: Bearer {{token}}
  ```
- **Query Params** (optional):
  - `page`: `1`
  - `limit`: `10`
  - `status`: `processing`
  - `sensitivityStatus`: `safe`
  - `search`: `test`

**Expected Response:**
- **Status**: `200 OK`
- **Body**:
  ```json
  {
    "success": true,
    "count": 1,
    "total": 1,
    "page": 1,
    "pages": 1,
    "videos": [
      {
        "_id": "...",
        "filename": "video-1234567890-123456789.mp4",
        "originalName": "test-video.mp4",
        "fileSize": 1234567,
        "status": "processing",
        "sensitivityStatus": "pending",
        "processingProgress": 50,
        "uploadedBy": {
          "_id": "...",
          "username": "testeditor",
          "email": "editor@test.com"
        },
        "tenantId": "tenant-...",
        "uploadedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

**Postman Script**:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has videos", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('videos');
    pm.expect(jsonData.videos).to.be.an('array');
});
```

---

### Test 2.4: Get All Videos with Filters

**Request:**
- **Method**: `GET`
- **URL**: `{{base_url}}/api/videos?status=completed&sensitivityStatus=safe&search=test&page=1&limit=10`
- **Headers**:
  ```
  Authorization: Bearer {{token}}
  ```

**Expected Response:**
- **Status**: `200 OK`
- **Body**: Filtered video list

**Postman Script**:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});
```

---

### Test 2.5: Get Single Video

**Request:**
- **Method**: `GET`
- **URL**: `{{base_url}}/api/videos/{{video_id}}`
- **Headers**:
  ```
  Authorization: Bearer {{token}}
  ```

**Expected Response:**
- **Status**: `200 OK`
- **Body**:
  ```json
  {
    "success": true,
    "video": {
      "_id": "...",
      "filename": "video-1234567890-123456789.mp4",
      "originalName": "test-video.mp4",
      "filePath": "./uploads/videos/video-1234567890-123456789.mp4",
      "processedFilePath": "./uploads/processed/video-1234567890-123456789.mp4",
      "fileSize": 1234567,
      "mimeType": "video/mp4",
      "status": "completed",
      "sensitivityStatus": "safe",
      "processingProgress": 100,
      "uploadedBy": {
        "_id": "...",
        "username": "testeditor",
        "email": "editor@test.com"
      },
      "tenantId": "tenant-...",
      "metadata": {
        "width": 1920,
        "height": 1080,
        "duration": 60,
        "bitrate": 5000,
        "codec": "h264"
      },
      "uploadedAt": "2024-01-01T00:00:00.000Z",
      "processedAt": "2024-01-01T00:00:10.000Z"
    }
  }
  ```

**Postman Script**:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has video", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('video');
});
```

---

### Test 2.6: Stream Video

**Request:**
- **Method**: `GET`
- **URL**: `{{base_url}}/api/videos/{{video_id}}/stream`
- **Headers**:
  ```
  Authorization: Bearer {{token}}
  Range: bytes=0-1023
  ```

**Expected Response:**
- **Status**: `206 Partial Content` (if range requested) or `200 OK`
- **Headers**:
  ```
  Content-Type: video/mp4
  Content-Range: bytes 0-1023/1234567
  Accept-Ranges: bytes
  Content-Length: 1024
  ```

**Postman Script**:
```javascript
pm.test("Status code is 206 or 200", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 206]);
});

pm.test("Content-Type is video", function () {
    pm.expect(pm.response.headers.get("Content-Type")).to.include("video");
});
```

**Note**: In Postman, you can't play videos directly. Use this endpoint to test streaming functionality. The video will download as a file.

---

### Test 2.7: Stream Video without Authentication

**Request:**
- **Method**: `GET`
- **URL**: `{{base_url}}/api/videos/{{video_id}}/stream`
- **Headers**: (no Authorization header)

**Expected Response:**
- **Status**: `401 Unauthorized`
- **Body**:
  ```json
  {
    "success": false,
    "message": "Not authorized to access this route"
  }
  ```

**Postman Script**:
```javascript
pm.test("Status code is 401", function () {
    pm.response.to.have.status(401);
});
```

---

### Test 2.8: Delete Video (Editor - Own Video)

**Request:**
- **Method**: `DELETE`
- **URL**: `{{base_url}}/api/videos/{{video_id}}`
- **Headers**:
  ```
  Authorization: Bearer {{editor_token}}
  ```

**Expected Response:**
- **Status**: `200 OK`
- **Body**:
  ```json
  {
    "success": true,
    "message": "Video deleted successfully"
  }
  ```

**Postman Script**:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});
```

---

### Test 2.9: Delete Video (Viewer - Should Fail)

**Request:**
- **Method**: `DELETE`
- **URL**: `{{base_url}}/api/videos/{{video_id}}`
- **Headers**:
  ```
  Authorization: Bearer {{token}}
  ```

**Expected Response:**
- **Status**: `403 Forbidden`
- **Body**:
  ```json
  {
    "success": false,
    "message": "User role 'viewer' is not authorized to access this route"
  }
  ```

**Postman Script**:
```javascript
pm.test("Status code is 403", function () {
    pm.response.to.have.status(403);
});
```

---

### Test 2.10: Upload Video with Invalid File Type

**Request:**
- **Method**: `POST`
- **URL**: `{{base_url}}/api/videos/upload`
- **Headers**:
  ```
  Authorization: Bearer {{editor_token}}
  ```
- **Body** (form-data):
  - Key: `video`
  - Type: `File`
  - Value: Select a non-video file (e.g., .txt, .pdf)

**Expected Response:**
- **Status**: `400 Bad Request` or `500 Internal Server Error`
- **Body**: Error message about invalid file type

**Postman Script**:
```javascript
pm.test("Status code is 400 or 500", function () {
    pm.expect(pm.response.code).to.be.oneOf([400, 500]);
});
```

---

## 👥 3. User Tests

### Test 3.1: Get All Users (Admin)

**Request:**
- **Method**: `GET`
- **URL**: `{{base_url}}/api/users`
- **Headers**:
  ```
  Authorization: Bearer {{admin_token}}
  ```

**Expected Response:**
- **Status**: `200 OK`
- **Body**:
  ```json
  {
    "success": true,
    "count": 3,
    "users": [
      {
        "_id": "...",
        "username": "testviewer",
        "email": "viewer@test.com",
        "role": "viewer",
        "tenantId": "tenant-...",
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "_id": "...",
        "username": "testeditor",
        "email": "editor@test.com",
        "role": "editor",
        "tenantId": "tenant-...",
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "_id": "...",
        "username": "testadmin",
        "email": "admin@test.com",
        "role": "admin",
        "tenantId": "tenant-...",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

**Postman Script**:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has users", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('users');
    pm.expect(jsonData.users).to.be.an('array');
});
```

---

### Test 3.2: Get All Users (Editor - Should Fail)

**Request:**
- **Method**: `GET`
- **URL**: `{{base_url}}/api/users`
- **Headers**:
  ```
  Authorization: Bearer {{editor_token}}
  ```

**Expected Response:**
- **Status**: `403 Forbidden`
- **Body**:
  ```json
  {
    "success": false,
    "message": "User role 'editor' is not authorized to access this route"
  }
  ```

**Postman Script**:
```javascript
pm.test("Status code is 403", function () {
    pm.response.to.have.status(403);
});
```

---

### Test 3.3: Get User by ID

**Request:**
- **Method**: `GET`
- **URL**: `{{base_url}}/api/users/{{user_id}}`
- **Headers**:
  ```
  Authorization: Bearer {{token}}
  ```

**Expected Response:**
- **Status**: `200 OK`
- **Body**:
  ```json
  {
    "success": true,
    "user": {
      "_id": "...",
      "username": "testeditor",
      "email": "editor@test.com",
      "role": "editor",
      "tenantId": "tenant-...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

**Postman Script**:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has user", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('user');
});
```

---

## 🔒 4. Multi-Tenant Isolation Tests

### Test 4.1: Create User in Different Tenant

**Request:**
- **Method**: `POST`
- **URL**: `{{base_url}}/api/auth/register`
- **Headers**:
  ```
  Content-Type: application/json
  ```
- **Body** (raw JSON):
  ```json
  {
    "username": "othertenant",
    "email": "other@tenant.com",
    "password": "password123",
    "role": "editor",
    "tenantId": "tenant-other-123"
  }
  ```

**Expected Response:**
- **Status**: `201 Created`
- **Body**: User with different tenantId

**Postman Script**:
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

var jsonData = pm.response.json();
if (jsonData.token) {
    pm.environment.set("other_tenant_token", jsonData.token);
    pm.environment.set("other_tenant_id", jsonData.user.tenantId);
}
```

---

### Test 4.2: Upload Video in Different Tenant

**Request:**
- **Method**: `POST`
- **URL**: `{{base_url}}/api/videos/upload`
- **Headers**:
  ```
  Authorization: Bearer {{other_tenant_token}}
  ```
- **Body** (form-data):
  - Key: `video`
  - Type: `File`
  - Value: Select a video file

**Expected Response:**
- **Status**: `201 Created`
- **Body**: Video with different tenantId

**Postman Script**:
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

var jsonData = pm.response.json();
if (jsonData.video) {
    pm.environment.set("other_tenant_video_id", jsonData.video.id);
}
```

---

### Test 4.3: Try to Access Video from Different Tenant

**Request:**
- **Method**: `GET`
- **URL**: `{{base_url}}/api/videos/{{other_tenant_video_id}}`
- **Headers**:
  ```
  Authorization: Bearer {{token}}
  ```

**Expected Response:**
- **Status**: `403 Forbidden`
- **Body**:
  ```json
  {
    "success": false,
    "message": "Access denied to this video"
  }
  ```

**Postman Script**:
```javascript
pm.test("Status code is 403", function () {
    pm.response.to.have.status(403);
});

pm.test("Access denied message", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.message).to.include("Access denied");
});
```

---

## 🧪 5. Complete Test Flow

### Step-by-Step Testing Flow

1. **Setup Environment**
   - Create Postman environment
   - Set base_url to `http://localhost:5000`

2. **Authentication Tests**
   - Register Viewer user
   - Register Editor user
   - Register Admin user
   - Login with Editor credentials
   - Get current user

3. **Video Upload Tests**
   - Upload video as Editor (should succeed)
   - Upload video as Viewer (should fail - 403)
   - Upload invalid file type (should fail)

4. **Video Management Tests**
   - Get all videos
   - Get all videos with filters
   - Get single video
   - Stream video
   - Stream video without auth (should fail - 401)

5. **Video Deletion Tests**
   - Delete video as Editor (own video - should succeed)
   - Delete video as Viewer (should fail - 403)

6. **User Management Tests**
   - Get all users as Admin (should succeed)
   - Get all users as Editor (should fail - 403)
   - Get user by ID

7. **Multi-Tenant Tests**
   - Create user in different tenant
   - Upload video in different tenant
   - Try to access video from different tenant (should fail - 403)

## 📝 Postman Collection JSON

Save this as a Postman Collection file:

```json
{
  "info": {
    "name": "Video Streaming API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Authentication",
      "item": [
        {
          "name": "Register Viewer",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"testviewer\",\n  \"email\": \"viewer@test.com\",\n  \"password\": \"password123\",\n  \"role\": \"viewer\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/api/auth/register",
              "host": ["{{base_url}}"],
              "path": ["api", "auth", "register"]
            }
          }
        }
      ]
    }
  ]
}
```

## 🐛 Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check if token is set in environment
   - Verify token is not expired
   - Check Authorization header format: `Bearer {{token}}`

2. **403 Forbidden**
   - Verify user role has required permissions
   - Check if user is trying to access other tenant's data
   - Verify route authorization requirements

3. **404 Not Found**
   - Check if backend server is running
   - Verify base_url is correct
   - Check if endpoint URL is correct

4. **500 Internal Server Error**
   - Check backend console for errors
   - Verify MongoDB is running
   - Check file upload directory permissions

5. **Video Upload Fails**
   - Verify file size is within limits (500MB)
   - Check file type is supported (MP4, MOV, AVI, WebM)
   - Verify upload directory exists and is writable

## ✅ Test Checklist

- [ ] Environment setup complete
- [ ] All authentication tests pass
- [ ] All video upload tests pass
- [ ] All video management tests pass
- [ ] All user management tests pass
- [ ] Multi-tenant isolation tests pass
- [ ] Role-based access control tests pass
- [ ] Error handling tests pass
- [ ] All expected responses match

## 🎯 Expected Test Results

### Successful Tests
- ✅ Register users (all roles)
- ✅ Login users
- ✅ Get current user
- ✅ Upload video (Editor/Admin)
- ✅ Get all videos
- ✅ Get single video
- ✅ Stream video
- ✅ Delete video (Editor/Admin)
- ✅ Get all users (Admin)
- ✅ Get user by ID

### Failed Tests (Expected)
- ❌ Upload video as Viewer (403)
- ❌ Delete video as Viewer (403)
- ❌ Get all users as Editor (403)
- ❌ Access video from different tenant (403)
- ❌ Access without authentication (401)
- ❌ Upload invalid file type (400/500)

## 📊 Test Summary

After running all tests, you should have:
- **Total Tests**: 20+ tests
- **Successful Tests**: 15+ tests
- **Expected Failures**: 5+ tests (authorization/validation)
- **Coverage**: 100% of API endpoints
- **Roles Tested**: Viewer, Editor, Admin
- **Features Tested**: Authentication, Video Operations, User Management, Multi-Tenant Isolation

---

**Happy Testing! 🚀**

For more information, refer to:
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- [SETUP_GUIDE.md](SETUP_GUIDE.md)
- [README.md](README.md)

