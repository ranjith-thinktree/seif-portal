const supportService = require('../services/support.service');
const ApiResponse = require('../../../utils/response.util');

const getAll = async (req, res, next) => {
  try {
    const contacts = await supportService.getAll();
    return ApiResponse.success(res, contacts, 'Support contacts retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    const contact = await supportService.create(req.body, req.user.id);
    return ApiResponse.success(res, contact, 'Support contact created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const contact = await supportService.update(req.params.id, req.body);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    return ApiResponse.success(res, contact, 'Support contact updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await supportService.remove(req.params.id);
    return ApiResponse.success(res, null, 'Support contact deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, create, update, remove };
