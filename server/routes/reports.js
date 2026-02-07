const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ReportBuilderService = require('../services/reportBuilderService');

// Request custom report
router.post('/custom', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    
    const requestData = {
      customerId,
      customerType,
      title: req.body.title,
      description: req.body.description,
      requirements: req.body.requirements,
      specifications: req.body.specifications,
      priority: req.body.priority || 'medium'
    };

    const request = await ReportBuilderService.requestCustomReport(requestData);
    
    res.status(201).json({
      success: true,
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get my custom report requests
router.get('/custom', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    
    const options = {
      status: req.query.status,
      skip: req.query.skip ? parseInt(req.query.skip) : 0,
      limit: req.query.limit ? parseInt(req.query.limit) : 20
    };

    const requests = await ReportBuilderService.getCustomerRequests(
      customerId,
      customerType,
      options
    );
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get custom report request by ID
router.get('/custom/:id', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    
    const request = await ReportBuilderService.getCustomReportRequest(
      req.params.id,
      customerId,
      customerType
    );
    
    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    res.status(error.message === 'Report request not found' ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
});

// Download custom report
router.get('/custom/:id/download', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    const { format } = req.query;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    if (!format) {
      return res.status(400).json({
        success: false,
        message: 'Format is required'
      });
    }

    const downloadInfo = await ReportBuilderService.downloadReport(
      req.params.id,
      format,
      customerId,
      customerType,
      ipAddress,
      userAgent
    );
    
    res.json({
      success: true,
      data: downloadInfo
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Schedule recurring report
router.post('/schedule', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    
    const scheduleConfig = {
      customerId,
      customerType,
      productId: req.body.productId,
      title: req.body.title,
      description: req.body.description,
      parameters: req.body.parameters,
      frequency: req.body.frequency
    };

    const report = await ReportBuilderService.scheduleReport(scheduleConfig);
    
    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get scheduled reports
router.get('/scheduled', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    
    const reports = await ReportBuilderService.getScheduledReports(customerId, customerType);
    
    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Cancel scheduled report
router.delete('/scheduled/:id', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    
    const report = await ReportBuilderService.cancelScheduledReport(
      req.params.id,
      customerId,
      customerType
    );
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(error.message === 'Scheduled report not found' ? 404 : 400).json({
      success: false,
      message: error.message
    });
  }
});

// Get my reports
router.get('/', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    
    const options = {
      status: req.query.status,
      skip: req.query.skip ? parseInt(req.query.skip) : 0,
      limit: req.query.limit ? parseInt(req.query.limit) : 20
    };

    const reports = await ReportBuilderService.getCustomerReports(
      customerId,
      customerType,
      options
    );
    
    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get report by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    
    const report = await ReportBuilderService.getReportById(
      req.params.id,
      customerId,
      customerType
    );
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(error.message === 'Report not found' ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
});

// Download report
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    const { format } = req.query;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    if (!format) {
      return res.status(400).json({
        success: false,
        message: 'Format is required'
      });
    }

    const downloadInfo = await ReportBuilderService.downloadReport(
      req.params.id,
      format,
      customerId,
      customerType,
      ipAddress,
      userAgent
    );
    
    res.json({
      success: true,
      data: downloadInfo
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get report templates
router.get('/templates/all', async (req, res) => {
  try {
    const templates = await ReportBuilderService.getReportTemplates();
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Build custom report on-demand
router.post('/build', authenticate, async (req, res) => {
  try {
    const customerId = req.user._id;
    const customerType = req.user.role === 'company' ? 'Company' : 'User';
    
    const reportConfig = {
      customerId,
      customerType,
      productId: req.body.productId,
      title: req.body.title,
      description: req.body.description,
      parameters: req.body.parameters,
      formats: req.body.formats || ['pdf']
    };

    const report = await ReportBuilderService.buildCustomReport(reportConfig);
    
    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Update custom report request status
router.put('/admin/custom/:id/status', authenticate, async (req, res) => {
  try {
    // Check if user is admin or analyst
    if (!['admin', 'analyst'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin or analyst access required'
      });
    }

    const { status, note } = req.body;
    
    const request = await ReportBuilderService.updateRequestStatus(
      req.params.id,
      status,
      note,
      req.user._id
    );
    
    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Assign analyst to request
router.put('/admin/custom/:id/assign', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { analystId } = req.body;
    
    const request = await ReportBuilderService.assignAnalyst(req.params.id, analystId);
    
    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Quote custom report
router.put('/admin/custom/:id/quote', authenticate, async (req, res) => {
  try {
    // Check if user is admin or analyst
    if (!['admin', 'analyst'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin or analyst access required'
      });
    }

    const { price, deliveryDate } = req.body;
    
    const request = await ReportBuilderService.quoteRequest(req.params.id, price, deliveryDate);
    
    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Get pending custom report requests
router.get('/admin/custom/pending', authenticate, async (req, res) => {
  try {
    // Check if user is admin or analyst
    if (!['admin', 'analyst'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Admin or analyst access required'
      });
    }

    const options = {
      skip: req.query.skip ? parseInt(req.query.skip) : 0,
      limit: req.query.limit ? parseInt(req.query.limit) : 20
    };

    const requests = await ReportBuilderService.getPendingRequests(options);
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
