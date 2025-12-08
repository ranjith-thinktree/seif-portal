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

// Future routes will be added here:
// router.use('/users', userRoutes);
// router.use('/requests', requestRoutes);
// router.use('/refurbishment', refurbishmentRoutes);

module.exports = router;
