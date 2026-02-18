const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: "https://smitmaniya.in",
  credentials: true
}));
app.use(express.json());

// ========== EXISTING ROUTES ==========
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/companies', require('./routes/companyRoutes'));
app.use('/api/companies', require('./routes/userManagementRoutes'));
app.use('/api/yarns', require('./routes/yarnRoutes'));
app.use('/api/estimates', require('./routes/estimateRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/productions', require('./routes/productionRoutes'));
app.use('/api/parties', require('./routes/partyRoutes'));
app.use('/api/challans', require('./routes/challanRoutes'));

// ========== NEW WEAVING MODULE ROUTES ==========
app.use('/api/weaving/looms', require('./routes/loomRoutes'));
app.use('/api/weaving/beams', require('./routes/beamRoutes'));
app.use('/api/weaving/sets', require('./routes/weavingSetRoutes'));
app.use('/api/weaving/production', require('./routes/weavingProductionRoutes'));
app.use('/api/weaving/maintenance', require('./routes/maintenanceRoutes'));
app.use('/api/weaving/analytics', require('./routes/weavingAnalyticsRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'StitchFlow API is running',
    modules: [
      'Estimates',
      'Yarn Management',
      'Production Planning',
      'Challans',
      'Parties',
      'Weaving & Loom Management' // NEW
    ]
  });
});
app.get('/', (req, res) => {
  res.send('🚀 StitchFlow Backend API Running Successfully');
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 StitchFlow Server running on port ${PORT}`);
  console.log(`📦 MongoDB Connected`);
  console.log(`🧵 Weaving Module Loaded`);
});