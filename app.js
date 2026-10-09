// =============================================================
// CodeCraftHub - A simple REST API for tracking courses
// Built with Node.js + Express, data stored in a JSON file
// =============================================================

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// ---------- Configuration ----------
const PORT = 5000;
const DATA_FILE = path.join(__dirname, 'courses.json');
const VALID_STATUSES = ['Not Started', 'In Progress', 'Completed'];
const COURSE_FIELDS = ['name', 'description', 'target_date', 'status'];

// Middleware: lets Express read JSON from request bodies (req.body)
app.use(express.json());

// =============================================================
// File helpers
// =============================================================

// Read all courses from courses.json.
// Creates the file with an empty list if it doesn't exist yet.
// If the file contains invalid JSON, an error is thrown so the
// route returns 500 instead of silently overwriting your data.
function loadCourses() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]');
    return [];
  }

  const data = fs.readFileSync(DATA_FILE, 'utf8');

  // An empty file is treated as "no courses yet"
  if (data.trim() === '') {
    return [];
  }

  return JSON.parse(data);
}

// Write the full list of courses back to courses.json
// (pretty-printed with 2-space indentation so it's easy to read).
function saveCourses(courses) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2));
}

// Generate the next ID: highest existing ID + 1 (starts at 1).
// Using the highest ID (not the array length) avoids duplicate IDs
// after a course has been deleted.
function getNextId(courses) {
  if (courses.length === 0) {
    return 1;
  }
  return Math.max(...courses.map((course) => course.id)) + 1;
}

// =============================================================
// Validation helpers
// =============================================================

// Check that a string is a real date in YYYY-MM-DD format
// (e.g. rejects "2026-02-30" and "31-12-2026").
function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Validate course data and return a list of error messages.
// isUpdate = true  -> fields are optional (only check what was sent)
// isUpdate = false -> all fields are required (used when creating)
function validateCourse(data, isUpdate = false) {
  const errors = [];

  // 1. Required fields must be present and be non-empty text
  for (const field of COURSE_FIELDS) {
    const value = data[field];

    if (value === undefined) {
      if (!isUpdate) {
        errors.push(`Missing required field: ${field}`);
      }
    } else if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${field} must be a non-empty string`);
    }
  }

  // 2. target_date must be a valid YYYY-MM-DD date
  if (typeof data.target_date === 'string' && data.target_date.trim() !== '' && !isValidDate(data.target_date)) {
    errors.push('target_date must be a valid date in YYYY-MM-DD format');
  }

  // 3. status must be one of the allowed values
  if (typeof data.status === 'string' && data.status.trim() !== '' && !VALID_STATUSES.includes(data.status)) {
    errors.push(`Invalid status. Status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  return errors;
}

// Make sure the request body is a JSON object with at least one key
function hasBody(body) {
  return body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length > 0;
}

// Convert the :id from the URL into a positive whole number (or null)
function parseId(rawId) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// =============================================================
// Routes
// =============================================================

// POST /api/courses - Add a new course
app.post('/api/courses', (req, res) => {
  const data = req.body;

  if (!hasBody(data)) {
    return res.status(400).json({ success: false, error: 'No data provided' });
  }

  const errors = validateCourse(data);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: errors.join('; ') });
  }

  try {
    const courses = loadCourses();

    // Only copy the fields we expect (ignore anything extra the client sends)
    const newCourse = {
      id: getNextId(courses),
      name: data.name.trim(),
      description: data.description.trim(),
      target_date: data.target_date,
      status: data.status,
      created_at: new Date().toISOString(),
    };

    courses.push(newCourse);
    saveCourses(courses);

    res.status(201).json({ success: true, message: 'Course added successfully', course: newCourse });
  } catch (error) {
    console.error('Error adding course:', error);
    res.status(500).json({ success: false, error: 'Failed to read or write course data' });
  }
});

// GET /api/courses - Get all courses
app.get('/api/courses', (req, res) => {
  try {
    const courses = loadCourses();
    res.status(200).json({ success: true, count: courses.length, courses });
  } catch (error) {
    console.error('Error loading courses:', error);
    res.status(500).json({ success: false, error: 'Failed to read course data' });
  }
});

// GET /api/courses/stats - Get statistics about courses
// Must be defined BEFORE /api/courses/:id, otherwise Express treats "stats" as an ID
app.get('/api/courses/stats', (req, res) => {
  try {
    const courses = loadCourses();

    // Start every status at 0 so all three always appear in the response
    const byStatus = {};
    for (const status of VALID_STATUSES) {
      byStatus[status] = 0;
    }

    // Count how many courses have each status
    for (const course of courses) {
      if (byStatus[course.status] !== undefined) {
        byStatus[course.status] += 1;
      }
    }

    res.status(200).json({
      success: true,
      stats: {
        total_courses: courses.length,
        by_status: byStatus,
      },
    });
  } catch (error) {
    console.error('Error calculating stats:', error);
    res.status(500).json({ success: false, error: 'Failed to read course data' });
  }
});

// GET /api/courses/:id - Get a specific course
app.get('/api/courses/:id', (req, res) => {
  const courseId = parseId(req.params.id);
  if (courseId === null) {
    return res.status(400).json({ success: false, error: 'Course ID must be a positive integer' });
  }

  try {
    const courses = loadCourses();
    const course = courses.find((c) => c.id === courseId);

    if (!course) {
      return res.status(404).json({ success: false, error: `Course with ID ${courseId} not found` });
    }

    res.status(200).json({ success: true, course });
  } catch (error) {
    console.error('Error loading course:', error);
    res.status(500).json({ success: false, error: 'Failed to read course data' });
  }
});

// PUT /api/courses/:id - Update a course
// Send only the fields you want to change; each one is validated.
app.put('/api/courses/:id', (req, res) => {
  const courseId = parseId(req.params.id);
  if (courseId === null) {
    return res.status(400).json({ success: false, error: 'Course ID must be a positive integer' });
  }

  const data = req.body;
  if (!hasBody(data)) {
    return res.status(400).json({ success: false, error: 'No data provided' });
  }

  const errors = validateCourse(data, true);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: errors.join('; ') });
  }

  try {
    const courses = loadCourses();
    const courseIndex = courses.findIndex((c) => c.id === courseId);

    if (courseIndex === -1) {
      return res.status(404).json({ success: false, error: `Course with ID ${courseId} not found` });
    }

    // Update only the allowed fields that were sent
    const course = courses[courseIndex];
    for (const field of COURSE_FIELDS) {
      if (data[field] !== undefined) {
        course[field] = data[field].trim();
      }
    }
    course.updated_at = new Date().toISOString();

    saveCourses(courses);

    res.status(200).json({ success: true, message: 'Course updated successfully', course });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ success: false, error: 'Failed to read or write course data' });
  }
});

// DELETE /api/courses/:id - Delete a course
app.delete('/api/courses/:id', (req, res) => {
  const courseId = parseId(req.params.id);
  if (courseId === null) {
    return res.status(400).json({ success: false, error: 'Course ID must be a positive integer' });
  }

  try {
    const courses = loadCourses();
    const courseIndex = courses.findIndex((c) => c.id === courseId);

    if (courseIndex === -1) {
      return res.status(404).json({ success: false, error: `Course with ID ${courseId} not found` });
    }

    // splice removes the course and returns it in an array
    const [deletedCourse] = courses.splice(courseIndex, 1);
    saveCourses(courses);

    res.status(200).json({ success: true, message: 'Course deleted successfully', deleted_course: deletedCourse });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ success: false, error: 'Failed to read or write course data' });
  }
});

// =============================================================
// Fallback handlers
// =============================================================

// Any route not defined above returns 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler: catches invalid JSON in request bodies and unexpected errors
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Invalid JSON in request body' });
  }
  console.error('Unexpected error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// =============================================================
// Start the server
// =============================================================

// Only start listening when this file is run directly (node app.js).
// When the file is imported (e.g. by tests), the app is exported instead.
if (require.main === module) {
    app.listen(PORT, (error) => {
    if (error) {
      console.error(`Could not start server on port ${PORT}: ${error.message}`);
      process.exit(1);
    }
    console.log(`CodeCraftHub API running at http://localhost:${PORT}`);
    console.log(`Data file: ${DATA_FILE}`);
  });
}

module.exports = app;