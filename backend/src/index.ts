import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import apiRoutes from './routes/api';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static frontend files
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/api', (req: express.Request, res: express.Response) => {
  res.json({
    name: 'BAG Vastgoedfinder API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      verblijfsobjecten: '/api/verblijfsobjecten?gemeente=Rotterdam&minOppervlakte=1000',
      gemeenten: '/api/gemeenten'
    }
  });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'configured' : 'NOT configured'}`);
});
