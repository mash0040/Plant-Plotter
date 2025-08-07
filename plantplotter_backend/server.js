const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

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

// Add debug routes (remove in production)
try {
  const debugRoutes = require('./routes/debug'); // You'll need to create this
  app.use('/api/debug', debugRoutes);
} catch (error) {
  
  // Inline debug endpoints
  app.get('/api/debug/health', async (req, res) => {
    try {
      const db = require('./config/db');
      const [result] = await db.execute('SELECT 1 as test, NOW() as timestamp');
      res.json({ 
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
        test: result[0]
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'error',
        database: 'failed',
        error: error.message
      });
    }
  });
  
  app.get('/api/debug/users', async (req, res) => {
    try {
      const db = require('./config/db');
      const [users] = await db.execute('SELECT id, email, username, role, is_active FROM users LIMIT 5');
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

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
app.get('/api/health', async (req, res) => {
  try {
    const db = require('./config/db');
    const [result] = await db.execute('SELECT COUNT(*) as count FROM users');
    
    res.json({ 
      status: 'ok', 
      message: 'Plant Potter API is running',
      timestamp: new Date().toISOString(),
      database: 'connected',
      totalUsers: result[0].count
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'Plant Potter backend is running!',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      debug: '/api/debug/health',
      auth: authRoutes ? '/api/auth/login' : 'Not available',
      gardens: '/api/gardens',
      plants: '/api/plants'
    }
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('UNHANDLED ERROR:');
  console.error('Request:', req.method, req.originalUrl);
  console.error('Body:', req.body);
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: {
      health: 'GET /api/health',
      gardens: 'GET /api/gardens',
      auth: 'POST /api/auth/login',
      debug: 'GET /api/debug/health'
    }
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
  console.log(`Plant Potter server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Debug: http://localhost:${PORT}/api/debug/health`);
  
  if (authRoutes) {
    console.log(`Auth endpoints: http://localhost:${PORT}/api/auth/login`);
  } else {
    console.log(`Auth endpoints missing - create routes/auth.js`);
  }
  console.log('================================');
});