const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const uploadRoutes = require('./upload.routes');
const notificationRoutes = require('./notification.routes');
const partnerRoutes = require('./partner.routes');
const centerRoutes = require('./center.routes');
const batchRoutes = require('./batch.routes');
const studentRoutes = require('./student.routes');
const reviewRoutes = require('./review.routes');
const adminRoutes = require('./admin.routes');
const dataRoutes = require('./data.routes');
const analyticsRoutes = require('./analytics.routes');
const employmentRoutes = require('./employment.routes');
const commentRoutes = require('../../../routes/commentRoutes');
const userRoutes = require('./user.routes');
const packageRoutes = require('./package.routes');
const dashboardRoutes = require('./dashboard.routes');
const refurbishmentRoutes = require('./refurbishment.routes');
const partnerRefurbishmentRoutes = require('./partner-refurbishment.routes');
const templateRoutes = require('./templates.routes');

/**
 * API v1 Routes Index
 * Base path: /api/v1
 */

// Mount routes
router.use('/auth', authRoutes);
router.use('/uploads', uploadRoutes);
router.use('/notifications', notificationRoutes);
router.use('/partners', partnerRoutes);
router.use('/centers', centerRoutes);
router.use('/batches', batchRoutes);
router.use('/students', studentRoutes);
router.use('/review', reviewRoutes);
router.use('/admin', adminRoutes);
router.use('/data', dataRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/employment', employmentRoutes);
router.use('/comments', commentRoutes);
router.use('/users', userRoutes);
router.use('/admin/packages', packageRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/admin/refurbishment', refurbishmentRoutes);
router.use('/partner/refurbishment', partnerRefurbishmentRoutes);
router.use('/templates', templateRoutes);

// Future routes will be added here:
// router.use('/requests', requestRoutes);

module.exports = router;
