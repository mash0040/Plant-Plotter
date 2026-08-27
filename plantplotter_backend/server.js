const express = require('express');
const cors = require('cors');
const { generalApiLimiter } = require('./middleware/rateLimiters');
const { sendDatabaseAwareErrorResponse } = require('./utils/databaseAvailability');
require('dotenv').config();

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = FRONTEND_URL
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Enhanced CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (only log method and URL, not body)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api', generalApiLimiter);

// Import routes
const userRoutes = require('./routes/users');
const gardenRoutes = require('./routes/gardens');
const plantLibraryRoutes = require('./routes/plantLibrary');
const taskRoutes = require('./routes/task');
const activityRoutes = require('./routes/activities');
const advisoryRoutes = require('./routes/advisory');

// Import auth routes with error handling
let authRoutes;
try {
  authRoutes = require('./routes/auth');
} catch (error) {
  console.error('Auth route error:', error.message);
  authRoutes = null;
}

// Public debug endpoints are intentionally disabled for demo safety.
app.use('/api/debug', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Register main routes with error handling
try {
  app.use('/api/users', userRoutes);
} catch (error) {
  console.error('Failed to register user routes:', error.message);
}

try {
  app.use('/api/gardens', gardenRoutes);
} catch (error) {
  console.error('Failed to register garden routes:', error.message);
}

try {
  app.use('/api/plants', plantLibraryRoutes);
} catch (error) {
  console.error('Failed to register plant routes:', error.message);
}

try {
  app.use('/api/tasks', taskRoutes);
} catch (error) {
  console.error('Failed to register task routes:', error.message);
}

try {
  app.use('/api/activities', activityRoutes);
} catch (error) {
  console.error('Failed to register activity routes:', error.message);
}

try {
  app.use('/api', advisoryRoutes);
} catch (error) {
  console.error('Failed to register advisory routes:', error.message);
}

// Register auth routes if available
if (authRoutes) {
  try {
    app.use('/api/auth', authRoutes);
  } catch (error) {
    console.error('Failed to register auth routes:', error.message);
  }
} else {
  console.log('Auth endpoints missing - create routes/auth.js');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Plant Plotter API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Plant Plotter backend is running',
    timestamp: new Date().toISOString()
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('UNHANDLED ERROR:');
  console.error('Request:', req.method, req.originalUrl);
  console.error('Error:', err);
  console.error('Stack:', err.stack);

  sendDatabaseAwareErrorResponse(res, err, {
    message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log('================================');
  console.log(`Plant Plotter server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  
  if (authRoutes) {
    console.log(`Auth endpoints: http://localhost:${PORT}/api/auth/login`);
  } else {
    console.log(`Auth endpoints missing - create routes/auth.js`);
  }
  console.log('================================');
});
