const PackageController = require('../../src/api/v1/controllers/package.controller');
const PackageService = require('../../src/api/v1/services/package.service');
const ApiResponse = require('../../src/utils/response.util');
const { ValidationError, NotFoundError } = require('../../src/utils/error.util');

// Mock the service
jest.mock('../../src/api/v1/services/package.service');
jest.mock('../../src/utils/response.util');

const mockApiResponse = {
  success: jest.fn(),
  created: jest.fn(),
  error: jest.fn(),
  notFound: jest.fn(),
};

ApiResponse.success = mockApiResponse.success;
ApiResponse.created = mockApiResponse.created;
ApiResponse.error = mockApiResponse.error;
ApiResponse.notFound = mockApiResponse.notFound;

describe('PackageController', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {},
      user: { id: 'user-1', role: 'SUPER_ADMIN' },
    };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAllPackages', () => {
    it('should return packages with pagination', async () => {
      const mockResult = {
        packages: [
          { id: 'pkg-1', package_name: 'Package 1' },
          { id: 'pkg-2', package_name: 'Package 2' },
        ],
        pagination: {
          total: 2,
          limit: 100,
          offset: 0,
          hasMore: false,
        },
      };

      PackageService.getAllPackages.mockResolvedValue(mockResult);

      await PackageController.getAllPackages(req, res, next);

      expect(PackageService.getAllPackages).toHaveBeenCalledWith({
        limit: 100,
        offset: 0,
      });
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        mockResult,
        'Packages retrieved successfully',
        200
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should parse query parameters correctly', async () => {
      req.query = {
        category: 'electrical',
        is_active: 'true',
        search: 'multimeter',
        limit: '50',
        offset: '10',
      };

      const mockResult = { packages: [], pagination: {} };
      PackageService.getAllPackages.mockResolvedValue(mockResult);

      await PackageController.getAllPackages(req, res, next);

      expect(PackageService.getAllPackages).toHaveBeenCalledWith({
        category: 'electrical',
        is_active: true,
        search: 'multimeter',
        limit: 50,
        offset: 10,
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      PackageService.getAllPackages.mockRejectedValue(error);

      await PackageController.getAllPackages(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(ApiResponse.success).not.toHaveBeenCalled();
    });
  });

  describe('getPackageById', () => {
    it('should return package without courses by default', async () => {
      req.params.id = 'pkg-1';

      const mockPackage = { id: 'pkg-1', package_name: 'Test Package' };
      PackageService.getPackageById.mockResolvedValue(mockPackage);

      await PackageController.getPackageById(req, res, next);

      expect(PackageService.getPackageById).toHaveBeenCalledWith('pkg-1');
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        mockPackage,
        'Package retrieved successfully',
        200
      );
    });

    it('should return package with courses when include_courses=true', async () => {
      req.params.id = 'pkg-1';
      req.query.include_courses = 'true';

      const mockPackage = {
        id: 'pkg-1',
        package_name: 'Test Package',
        courses: [
          { id: 'course-1', course_name: 'Electrical' },
        ],
      };
      PackageService.getPackageWithCourses.mockResolvedValue(mockPackage);

      await PackageController.getPackageById(req, res, next);

      expect(PackageService.getPackageWithCourses).toHaveBeenCalledWith('pkg-1');
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        mockPackage,
        'Package retrieved successfully',
        200
      );
    });

    it('should handle NotFoundError', async () => {
      req.params.id = 'non-existent';

      const error = new NotFoundError('Package not found');
      PackageService.getPackageById.mockRejectedValue(error);

      await PackageController.getPackageById(req, res, next);

      expect(ApiResponse.notFound).toHaveBeenCalledWith(res, 'Package not found');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('createPackage', () => {
    it('should create package successfully', async () => {
      req.body = {
        package_name: 'New Package',
        description: 'Test description',
        category: 'electrical',
        is_active: true,
        display_order: 10,
      };

      const mockCreatedPackage = { id: 'new-pkg', ...req.body };
      PackageService.createPackage.mockResolvedValue(mockCreatedPackage);

      await PackageController.createPackage(req, res, next);

      expect(PackageService.createPackage).toHaveBeenCalledWith(
        {
          package_name: 'New Package',
          description: 'Test description',
          category: 'electrical',
          is_active: true,
          display_order: 10,
        },
        'user-1'
      );
      expect(ApiResponse.created).toHaveBeenCalledWith(
        res,
        'Package created successfully',
        mockCreatedPackage,
        201
      );
    });

    it('should default is_active to true if not provided', async () => {
      req.body = {
        package_name: 'New Package',
        category: 'electrical',
      };

      const mockCreatedPackage = { id: 'new-pkg', ...req.body, is_active: true };
      PackageService.createPackage.mockResolvedValue(mockCreatedPackage);

      await PackageController.createPackage(req, res, next);

      expect(PackageService.createPackage).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: true,
        }),
        'user-1'
      );
    });

    it('should handle ValidationError', async () => {
      req.body = { package_name: '' };

      const error = new ValidationError('Package name is required');
      PackageService.createPackage.mockRejectedValue(error);

      await PackageController.createPackage(req, res, next);

      expect(ApiResponse.error).toHaveBeenCalledWith(
        res,
        'Package name is required',
        400
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('updatePackage', () => {
    it('should update package successfully', async () => {
      req.params.id = 'pkg-1';
      req.body = {
        package_name: 'Updated Name',
        description: 'Updated description',
      };

      const mockUpdatedPackage = { id: 'pkg-1', ...req.body };
      PackageService.updatePackage.mockResolvedValue(mockUpdatedPackage);

      await PackageController.updatePackage(req, res, next);

      expect(PackageService.updatePackage).toHaveBeenCalledWith(
        'pkg-1',
        {
          package_name: 'Updated Name',
          description: 'Updated description',
        },
        'user-1'
      );
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        mockUpdatedPackage,
        'Package updated successfully',
        200
      );
    });

    it('should filter out undefined values', async () => {
      req.params.id = 'pkg-1';
      req.body = {
        package_name: 'Updated Name',
        description: undefined,
        category: 'equipment',
      };

      const mockUpdatedPackage = { id: 'pkg-1' };
      PackageService.updatePackage.mockResolvedValue(mockUpdatedPackage);

      await PackageController.updatePackage(req, res, next);

      expect(PackageService.updatePackage).toHaveBeenCalledWith(
        'pkg-1',
        {
          package_name: 'Updated Name',
          category: 'equipment',
        },
        'user-1'
      );
    });

    it('should handle NotFoundError', async () => {
      req.params.id = 'non-existent';
      req.body = { package_name: 'Updated Name' };

      const error = new NotFoundError('Package not found');
      PackageService.updatePackage.mockRejectedValue(error);

      await PackageController.updatePackage(req, res, next);

      expect(ApiResponse.notFound).toHaveBeenCalledWith(res, 'Package not found');
    });
  });

  describe('deletePackage', () => {
    it('should soft delete package by default', async () => {
      req.params.id = 'pkg-1';

      const mockResult = { success: true, deleted: 'soft' };
      PackageService.deletePackage.mockResolvedValue(mockResult);

      await PackageController.deletePackage(req, res, next);

      expect(PackageService.deletePackage).toHaveBeenCalledWith(
        'pkg-1',
        'user-1',
        false
      );
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        'Package deactivated successfully',
        mockResult,
        200
      );
    });

    it('should hard delete package when hard=true', async () => {
      req.params.id = 'pkg-1';
      req.query.hard = 'true';

      const mockResult = { success: true, deleted: 'permanently' };
      PackageService.deletePackage.mockResolvedValue(mockResult);

      await PackageController.deletePackage(req, res, next);

      expect(PackageService.deletePackage).toHaveBeenCalledWith(
        'pkg-1',
        'user-1',
        true
      );
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        'Package permanently deleted successfully',
        mockResult,
        200
      );
    });

    it('should handle ValidationError for linked packages', async () => {
      req.params.id = 'pkg-1';
      req.query.hard = 'true';

      const error = new ValidationError(
        'Cannot permanently delete package that is linked to courses'
      );
      PackageService.deletePackage.mockRejectedValue(error);

      await PackageController.deletePackage(req, res, next);

      expect(ApiResponse.error).toHaveBeenCalledWith(
        res,
        'Cannot permanently delete package that is linked to courses',
        400
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('reorderPackages', () => {
    it('should reorder packages successfully', async () => {
      req.body = {
        orderMap: {
          'pkg-1': 1,
          'pkg-2': 2,
          'pkg-3': 3,
        },
      };

      const mockResult = { success: true, message: 'Packages reordered successfully' };
      PackageService.reorderPackages.mockResolvedValue(mockResult);

      await PackageController.reorderPackages(req, res, next);

      expect(PackageService.reorderPackages).toHaveBeenCalledWith(
        req.body.orderMap,
        'user-1'
      );
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        mockResult,
        mockResult.message,
        200
      );
    });

    it('should handle missing orderMap', async () => {
      req.body = {};

      await PackageController.reorderPackages(req, res, next);

      expect(ApiResponse.error).toHaveBeenCalledWith(
        res,
        'orderMap is required (object with package_id: display_order)',
        400
      );
      expect(PackageService.reorderPackages).not.toHaveBeenCalled();
    });

    it('should handle ValidationError', async () => {
      req.body = { orderMap: { 'invalid-id': 1 } };

      const error = new ValidationError('Package not found: invalid-id');
      PackageService.reorderPackages.mockRejectedValue(error);

      await PackageController.reorderPackages(req, res, next);

      expect(ApiResponse.error).toHaveBeenCalledWith(
        res,
        'Package not found: invalid-id',
        400
      );
    });
  });
});
