/**
 * Workflow Routes
 * API endpoints for workflow management and execution
 * Part of the Auto-Followup Workflow Engine for TRM platform
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth.js');
const { requireRole } = require('../middleware/rbac.js');
const Workflow = require('../models/Workflow.js');
const { WORKFLOW_STATUS, TRIGGER_TYPES } = require('../models/Workflow.js');
const WorkflowExecution = require('../models/WorkflowExecution.js');
const { EXECUTION_STATUS } = require('../models/WorkflowExecution.js');
const { 
  triggerWorkflow, 
  executeWorkflow, 
  initializePredefinedWorkflows,
  PREDEFINED_WORKFLOWS 
} = require('../services/workflowEngine.js');

const router = express.Router();

// ==================== WORKFLOW CRUD ====================

/**
 * GET /api/v1/workflows
 * List all workflows with filtering and pagination
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      status,
      category,
      triggerType,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    if (category) {
      query.category = category;
    }
    if (triggerType) {
      query['trigger.type'] = triggerType;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const [workflows, total] = await Promise.all([
      Workflow.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Workflow.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: workflows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflows',
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/workflows/:id
 * Get a single workflow by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow ID',
      });
    }

    const workflow = await Workflow.findById(id).lean();

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/workflows
 * Create a new workflow
 */
router.post('/', authenticate, requireRole(['platform_admin']), async (req, res) => {
  try {
    const workflowData = req.body;
    
    // Set created by
    workflowData.createdBy = req.user._id;
    workflowData.updatedBy = req.user._id;

    const workflow = new Workflow(workflowData);
    await workflow.save();

    res.status(201).json({
      success: true,
      message: 'Workflow created successfully',
      data: workflow,
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create workflow',
      error: error.message,
    });
  }
});

/**
 * PUT /api/v1/workflows/:id
 * Update an existing workflow
 */
router.put('/:id', authenticate, requireRole(['platform_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow ID',
      });
    }

    // Set updated by
    updateData.updatedBy = req.user._id;
    updateData.updatedAt = new Date();

    const workflow = await Workflow.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      message: 'Workflow updated successfully',
      data: workflow,
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update workflow',
      error: error.message,
    });
  }
});

/**
 * PATCH /api/v1/workflows/:id/status
 * Update workflow status (activate, pause, archive)
 */
router.patch('/:id/status', authenticate, requireRole(['platform_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow ID',
      });
    }

    if (!Object.values(WORKFLOW_STATUS).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
        validStatuses: Object.values(WORKFLOW_STATUS),
      });
    }

    const workflow = await Workflow.findByIdAndUpdate(
      id,
      { 
        status,
        updatedBy: req.user._id,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      message: `Workflow status updated to ${status}`,
      data: workflow,
    });
  } catch (error) {
    console.error('Error updating workflow status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update workflow status',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/v1/workflows/:id
 * Delete a workflow (soft delete by archiving)
 */
router.delete('/:id', authenticate, requireRole(['platform_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow ID',
      });
    }

    const workflow = await Workflow.findByIdAndUpdate(
      id,
      { 
        status: WORKFLOW_STATUS.ARCHIVED,
        updatedBy: req.user._id,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      message: 'Workflow archived successfully',
      data: workflow,
    });
  } catch (error) {
    console.error('Error archiving workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive workflow',
      error: error.message,
    });
  }
});

// ==================== WORKFLOW EXECUTION ====================

/**
 * POST /api/v1/workflows/trigger
 * Manually trigger a workflow
 */
router.post('/trigger', authenticate, async (req, res) => {
  try {
    const {
      workflowId,
      entityType,
      entityId,
      inputData = {},
      scheduledAt,
    } = req.body;

    if (!workflowId || !entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'workflowId, entityType, and entityId are required',
      });
    }

    // Validate entity type
    const validEntityTypes = ['user', 'job', 'company', 'referral', 'application'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid entity type. Must be one of: ${validEntityTypes.join(', ')}`,
      });
    }

    const result = await triggerWorkflow(workflowId, {
      entityType,
      entityId,
      inputData,
      triggeredBy: 'user',
      triggeredByUserId: req.user._id,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Workflow triggered successfully',
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: result,
      });
    }
  } catch (error) {
    console.error('Error triggering workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger workflow',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/workflows/:id/execute
 * Execute a specific workflow immediately
 */
router.post('/:id/execute', authenticate, requireRole(['platform_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { entityType, entityId, inputData = {} } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow ID',
      });
    }

    const result = await triggerWorkflow(id, {
      entityType,
      entityId,
      inputData,
      triggeredBy: 'user',
      triggeredByUserId: req.user._id,
    });

    if (result.success) {
      // Execute immediately
      await executeWorkflow(result.executionId);
      
      const execution = await WorkflowExecution.findById(result.executionId);
      
      res.json({
        success: true,
        message: 'Workflow executed successfully',
        data: {
          executionId: result.executionId,
          status: execution.status,
          actionResults: execution.actionResults,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: result,
      });
    }
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute workflow',
      error: error.message,
    });
  }
});

// ==================== EXECUTION MANAGEMENT ====================

/**
 * GET /api/v1/workflows/executions
 * List workflow executions with filtering
 */
router.get('/executions', authenticate, async (req, res) => {
  try {
    const {
      workflowId,
      status,
      entityType,
      entityId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query = {};
    
    if (workflowId) {
      query.workflowId = workflowId;
    }
    if (status) {
      query.status = status;
    }
    if (entityType) {
      query.entityType = entityType;
    }
    if (entityId) {
      query.entityId = entityId;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const [executions, total] = await Promise.all([
      WorkflowExecution.find(query)
        .populate('workflowId', 'name category')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      WorkflowExecution.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: executions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch executions',
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/workflows/executions/:id
 * Get a single execution by ID
 */
router.get('/executions/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid execution ID',
      });
    }

    const execution = await WorkflowExecution.findById(id)
      .populate('workflowId', 'name category trigger')
      .lean();

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: 'Execution not found',
      });
    }

    res.json({
      success: true,
      data: execution,
    });
  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch execution',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/workflows/executions/:id/cancel
 * Cancel a pending or running execution
 */
router.post('/executions/:id/cancel', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid execution ID',
      });
    }

    const execution = await WorkflowExecution.findById(id);

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: 'Execution not found',
      });
    }

    // Can only cancel pending or running executions
    if (![EXECUTION_STATUS.PENDING, EXECUTION_STATUS.RUNNING, EXECUTION_STATUS.RETRYING].includes(execution.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel execution with status: ${execution.status}`,
      });
    }

    execution.cancel(req.user._id, reason || 'Cancelled by user');
    await execution.save();

    res.json({
      success: true,
      message: 'Execution cancelled successfully',
      data: execution,
    });
  } catch (error) {
    console.error('Error cancelling execution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel execution',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/workflows/executions/:id/retry
 * Retry a failed execution
 */
router.post('/executions/:id/retry', authenticate, requireRole(['platform_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid execution ID',
      });
    }

    const execution = await WorkflowExecution.findById(id);

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: 'Execution not found',
      });
    }

    if (execution.status !== EXECUTION_STATUS.FAILED) {
      return res.status(400).json({
        success: false,
        message: 'Can only retry failed executions',
      });
    }

    // Reset execution
    execution.status = EXECUTION_STATUS.PENDING;
    execution.error = null;
    execution.currentActionIndex = 0;
    execution.actionResults.forEach(ar => {
      ar.status = ACTION_STATUS.PENDING;
      ar.error = null;
      ar.retryCount = 0;
    });
    execution.addLog('info', 'Execution queued for retry', 'workflow_engine');
    await execution.save();

    // Execute
    await executeWorkflow(id);

    res.json({
      success: true,
      message: 'Execution retried successfully',
      data: execution,
    });
  } catch (error) {
    console.error('Error retrying execution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry execution',
      error: error.message,
    });
  }
});

// ==================== STATISTICS & METADATA ====================

/**
 * GET /api/v1/workflows/:id/statistics
 * Get workflow execution statistics
 */
router.get('/:id/statistics', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow ID',
      });
    }

    const workflow = await Workflow.findById(id).lean();
    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    const stats = await WorkflowExecution.getStatistics(id, { startDate, endDate });

    res.json({
      success: true,
      data: {
        workflow: {
          id: workflow._id,
          name: workflow.name,
          stats: workflow.stats,
        },
        executionStats: stats,
      },
    });
  } catch (error) {
    console.error('Error fetching workflow statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow statistics',
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/workflows/metadata/trigger-types
 * Get available trigger types
 */
router.get('/metadata/trigger-types', authenticate, async (req, res) => {
  res.json({
    success: true,
    data: Object.entries(TRIGGER_TYPES).map(([key, value]) => ({
      key,
      value,
      label: key.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    })),
  });
});

/**
 * GET /api/v1/workflows/metadata/action-types
 * Get available action types
 */
router.get('/metadata/action-types', authenticate, async (req, res) => {
  const actionTypes = [
    { key: 'SEND_EMAIL', value: 'send_email', label: 'Send Email', description: 'Send an email to the target user' },
    { key: 'SEND_WHATSAPP', value: 'send_whatsapp', label: 'Send WhatsApp', description: 'Send a WhatsApp message' },
    { key: 'SEND_NOTIFICATION', value: 'send_notification', label: 'Send Notification', description: 'Send in-app notification' },
    { key: 'UPDATE_STATUS', value: 'update_status', label: 'Update Status', description: 'Update entity status' },
    { key: 'WEBHOOK', value: 'webhook', label: 'Webhook', description: 'Call external webhook' },
    { key: 'DELAY', value: 'delay', label: 'Delay', description: 'Wait for specified time' },
    { key: 'CONDITION', value: 'condition', label: 'Condition', description: 'Conditional branch' },
  ];

  res.json({
    success: true,
    data: actionTypes,
  });
});

/**
 * POST /api/v1/workflows/initialize
 * Initialize predefined workflows (admin only)
 */
router.post('/initialize', authenticate, requireRole(['platform_admin']), async (req, res) => {
  try {
    await initializePredefinedWorkflows();

    res.json({
      success: true,
      message: 'Predefined workflows initialized successfully',
      workflows: Object.keys(PREDEFINED_WORKFLOWS),
    });
  } catch (error) {
    console.error('Error initializing workflows:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize workflows',
      error: error.message,
    });
  }
});

module.exports = router;