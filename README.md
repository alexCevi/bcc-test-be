# Blue Collar Cloud Assessment - Backend

A certification request management system backend API built with Express.js and JWT authentication.

## Features

- **JWT Authentication** - Secure token-based authentication
- **Role-based Access Control** - Employee and Supervisor roles
- **Certification Request Management** - Full CRUD operations for certification requests
- **Status Workflow** - Draft → Submitted → Approved/Rejected
- **Filtering & Sorting** - Query certification requests with various filters
- **In-memory Data Store** - Perfect for testing and development

## Prerequisites

- Node.js 18+
- npm

## Installation

1. Clone the repository:

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The server will start on `http://localhost:3000` with nodemon for auto-reloading.

## Authentication

### Test Users

The system comes with two pre-configured test users:

| Email | Password | Role |
|-------|----------|------|
| `employee@testing.com` | `testing99` | EMPLOYEE |
| `supervisor@testing.com` | `testing00!` | SUPERVISOR |

### Login Process

1. **POST** `/auth/login` - Login with email and password
2. Use the returned JWT token in the `Authorization: Bearer <token>` header
3. Tokens expire after 1 hour

## API Endpoints

### Authentication Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | User login | ❌ |
| GET | `/auth/validate` | Validate JWT token | ❌ |
| GET | `/me` | Get current user info | ✅ |
| POST | `/logout` | Logout (client-side token removal) | ❌ |

### Certification Request Routes

All certification routes require authentication: `Authorization: Bearer <token>`

| Method | Endpoint | Description | Role Access |
|--------|----------|-------------|-------------|
| GET | `/certifications` | List all requests (with filtering) | EMPLOYEE, SUPERVISOR |
| POST | `/certifications` | Create new request | EMPLOYEE, SUPERVISOR |
| PATCH | `/certifications/:id/status` | Update request status | EMPLOYEE (limited), SUPERVISOR |

## Request Status Workflow

```
Draft → Submitted → Approved/Rejected
```

- **Employees** can move requests from `Draft` → `Submitted`
- **Supervisors** can move requests from `Submitted` → `Approved/Rejected`

## Filtering & Sorting

The `/certifications` endpoint supports various query parameters:

### Filters
- `status` - Filter by status (comma-separated for multiple)
- `employeeName` - Filter by employee email
- `minBudget` - Minimum budget amount
- `maxBudget` - Maximum budget amount

### Sorting
- `sortBy` - Sort by field with order: `field:order`
  - Example: `sortBy=budget:desc` or `sortBy=expectedDate:asc`

### Example Query
```
GET /certifications?status=Approved,Submitted&minBudget=500&sortBy=budget:desc
```

## Example API Usage

### 1. Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@testing.com","password":"testing99"}'
```

### 2. Create Certification Request
```bash
curl -X POST http://localhost:3000/certifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "description": "AWS Solutions Architect",
    "budget": 1500,
    "expectedDate": "2025-09-15"
  }'
```

### 3. Get All Requests
```bash
curl -X GET http://localhost:3000/certifications \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Update Request Status
```bash
curl -X PATCH http://localhost:3000/certifications/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"status": "Submitted"}'
```

## Request Schema

### Certification Request Object
```json
{
  "id": 1,
  "description": "AWS Solutions Architect Certification",
  "budget": 1500,
  "expectedDate": "2025-09-15",
  "status": "Draft",
  "employeeName": "employee@testing.com"
}
```

### Required Fields for Creation
- `description` (string) - Description of the certification
- `budget` (number) - Budget amount (must be positive)
- `expectedDate` (string) - Expected completion date (YYYY-MM-DD, cannot be in the past)

## Configuration

- **Port**: Default 3000 (configurable via `PORT` environment variable)
- **JWT Secret**: `ThisIsASecretKey10101010` (hardcoded for testing)
- **Token Expiry**: 1 hour
- **Network Simulation**: Random delay 100-600ms on all requests

## Dependencies

- **express** - Web framework
- **jsonwebtoken** - JWT token handling
- **cors** - Cross-origin resource sharing
- **body-parser** - Request body parsing
- **nodemon** - Development auto-reloading