# CodeCraftHub

A simple REST API for tracking the courses you want to learn, built with Node.js and Express. Course data is stored in a local `courses.json` file, so no database or authentication is needed.

## Features

- Full CRUD operations for courses (create, read, update, delete)
- JSON file storage, with `courses.json` created automatically if missing
- Auto-generated course IDs starting from `1` and `created_at` / `updated_at` timestamps
- Input validation: required fields, allowed status values, and real `YYYY-MM-DD` dates
- Clear error responses (`400`, `404`, `500`) with helpful messages

## Project Structure

```text
codecrafthub/
├── app.js          # Express application (all routes and logic)
├── courses.json    # Data storage (auto-created)
├── package.json    # Project info and dependencies
└── README.md       # Documentation
```

## Installation

Requires Node.js 18 or later.

```bash
git clone <your-repo-url>
cd codecrafthub
npm install
```

## Running the Application

```bash
npm start
```

Expected output:

```text
CodeCraftHub API running at http://localhost:5000
Data file: /path/to/codecrafthub/courses.json
```

Stop the server with `Ctrl + C`.

## Course Data Format

| Field         | Type   | Required       | Notes                                        |
|---------------|--------|----------------|----------------------------------------------|
| `id`          | Number | Auto-generated | Starts at 1                                  |
| `name`        | String | Yes            | Course name                                  |
| `description` | String | Yes            | Short description                            |
| `target_date` | String | Yes            | Format `YYYY-MM-DD`, must be a real date     |
| `status`      | String | Yes            | `Not Started`, `In Progress`, or `Completed` |
| `created_at`  | String | Auto-generated | ISO timestamp                                |
| `updated_at`  | String | Auto-generated | ISO timestamp, set on update                 |

## API Endpoints

Base URL: `http://localhost:5000/api/courses`

All successful responses include `"success": true`. All errors return:

```json
{ "success": false, "error": "Description of the problem" }
```

### 1. Add a course

`POST /api/courses`

```bash
curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -d '{"name":"Node.js Fundamentals","description":"Learn Node and Express","target_date":"2026-12-31","status":"Not Started"}'
```

Response `201 Created`:

```json
{
  "success": true,
  "message": "Course added successfully",
  "course": {
    "id": 1,
    "name": "Node.js Fundamentals",
    "description": "Learn Node and Express",
    "target_date": "2026-12-31",
    "status": "Not Started",
    "created_at": "2026-10-09T13:07:29.000Z"
  }
}
```

### 2. Get all courses

`GET /api/courses`

```bash
curl http://localhost:5000/api/courses
```

Response `200 OK`:

```json
{ "success": true, "count": 1, "courses": [ { "id": 1, "name": "Node.js Fundamentals", "...": "..." } ] }
```

### 3. Get a specific course

`GET /api/courses/:id`

```bash
curl http://localhost:5000/api/courses/1
```

Response `200 OK`:

```json
{ "success": true, "course": { "id": 1, "name": "Node.js Fundamentals", "...": "..." } }
```

### 4. Update a course

`PUT /api/courses/:id`. Send only the fields you want to change; each one is validated.

```bash
curl -X PUT http://localhost:5000/api/courses/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"In Progress"}'
```

Response `200 OK`:

```json
{ "success": true, "message": "Course updated successfully", "course": { "id": 1, "status": "In Progress", "updated_at": "...", "...": "..." } }
```

### 5. Delete a course

`DELETE /api/courses/:id`

```bash
curl -X DELETE http://localhost:5000/api/courses/1
```

Response `200 OK`:

```json
{ "success": true, "message": "Course deleted successfully", "deleted_course": { "id": 1, "...": "..." } }
```

## Error Responses

| Status | When                                                                 |
|--------|----------------------------------------------------------------------|
| 400    | Missing fields, invalid status, invalid date, invalid JSON, empty body, non-numeric ID |
| 404    | Course ID not found, or unknown route                                |
| 500    | `courses.json` cannot be read or written (for example, invalid JSON in the file) |

Example (`400`):

```json
{ "success": false, "error": "Invalid status. Status must be one of: Not Started, In Progress, Completed" }
```

## Troubleshooting

**`Cannot find module 'express'`**
Run `npm install` in the project folder.

**`EADDRINUSE: address already in use :::5000`**
Another program is using port 5000. Find it with `lsof -i :5000` (macOS/Linux) or `netstat -ano | findstr :5000` (Windows). On macOS this is usually AirPlay Receiver: turn it off in System Settings, or change `PORT` in `app.js`.

**`npm install` fails with a 404 for an Express version**
Install a specific published version, for example `npm install express@5.2.1`, and keep that exact version in `package.json`.

**`Failed to read course data` (500)**
`courses.json` contains invalid JSON. Fix it or replace its contents with `[]`.

**`Invalid JSON in request body` (400)**
Check that the request has the `Content-Type: application/json` header, uses double quotes, and has no trailing commas.

## Note

JSON file storage is fine for learning and personal use. For many users or simultaneous requests, use a database instead.