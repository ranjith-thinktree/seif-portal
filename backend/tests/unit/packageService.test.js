const PackageService = require('../../src/api/v1/services/package.service');
const RefurbishmentPackageModel = require('../../src/models/RefurbishmentPackage.model');
const { ValidationError, NotFoundError } = require('../../src/utils/error.util');

// Mock the model
jest.mock('../../src/models/RefurbishmentPackage.model');

describe('PackageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPackages', () => {
    it('should return packages with pagination', async () => {
      const mockPackages = [
        {
          id: 'pkg-1',
          package_name: 'Test Package 1',
          category: 'electrical',
          is_active: true,
        },
        {
          id: 'pkg-2',
          package_name: 'Test Package 2',
          category: 'equipment',
          is_active: true,
        },
      ];

      RefurbishmentPackageModel.findAll.mockResolvedValue(mockPackages);
      RefurbishmentPackageModel.count.mockResolvedValue(2);

      const result = await PackageService.getAllPackages({ limit: 10, offset: 0 });

      expect(result.packages).toEqual(mockPackages);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.hasMore).toBe(false);
      expect(RefurbishmentPackageModel.findAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
      });
    });

    it('should apply filters correctly', async () => {
      RefurbishmentPackageModel.findAll.mockResolvedValue([]);
      RefurbishmentPackageModel.count.mockResolvedValue(0);

      await PackageService.getAllPackages({
        category: 'electrical',
        is_active: true,
        search: 'multimeter',
      });

      expect(RefurbishmentPackageModel.findAll).toHaveBeenCalledWith({
        category: 'electrical',
        is_active: true,
        search: 'multimeter',
      });
    });
  });

  describe('getPackageById', () => {
    it('should return package when found', async () => {
      const mockPackage = {
        id: 'pkg-1',
        package_name: 'Test Package',
        category: 'electrical',
      };

      RefurbishmentPackageModel.findById.mockResolvedValue(mockPackage);

      const result = await PackageService.getPackageById('pkg-1');

      expect(result).toEqual(mockPackage);
      expect(RefurbishmentPackageModel.findById).toHaveBeenCalledWith('pkg-1');
    });

    it('should throw NotFoundError when package not found', async () => {
      RefurbishmentPackageModel.findById.mockResolvedValue(null);

      await expect(PackageService.getPackageById('non-existent')).rejects.toThrow(NotFoundError);
      await expect(PackageService.getPackageById('non-existent')).rejects.toThrow(
        'Package not found'
      );
    });
  });

  describe('createPackage', () => {
    const validPackageData = {
      package_name: 'New Package',
      description: 'Test description',
      category: 'electrical',
      is_active: true,
    };

    it('should create package successfully', async () => {
      const mockCreatedPackage = { id: 'new-pkg', ...validPackageData };

      RefurbishmentPackageModel.findByName.mockResolvedValue(null);
      RefurbishmentPackageModel.getNextDisplayOrder.mockResolvedValue(16);
      RefurbishmentPackageModel.create.mockResolvedValue(mockCreatedPackage);

      const result = await PackageService.createPackage(validPackageData, 'user-1');

      expect(result).toEqual(mockCreatedPackage);
      expect(RefurbishmentPackageModel.create).toHaveBeenCalledWith({
        ...validPackageData,
        display_order: 16,
      });
    });

    it('should throw ValidationError when package_name is missing', async () => {
      const invalidData = { ...validPackageData };
      delete invalidData.package_name;

      await expect(PackageService.createPackage(invalidData, 'user-1')).rejects.toThrow(
        ValidationError
      );
      await expect(PackageService.createPackage(invalidData, 'user-1')).rejects.toThrow(
        'Package name is required'
      );
    });

    it('should throw ValidationError when category is invalid', async () => {
      const invalidData = { ...validPackageData, category: 'invalid' };

      await expect(PackageService.createPackage(invalidData, 'user-1')).rejects.toThrow(
        ValidationError
      );
      await expect(PackageService.createPackage(invalidData, 'user-1')).rejects.toThrow(
        /Invalid category/
      );
    });

    it('should throw ValidationError when package name already exists', async () => {
      RefurbishmentPackageModel.findByName.mockResolvedValue({
        id: 'existing-pkg',
        package_name: 'New Package',
      });

      await expect(PackageService.createPackage(validPackageData, 'user-1')).rejects.toThrow(
        ValidationError
      );
      await expect(PackageService.createPackage(validPackageData, 'user-1')).rejects.toThrow(
        /already exists/
      );
    });
  });

  describe('updatePackage', () => {
    const existingPackage = {
      id: 'pkg-1',
      package_name: 'Old Name',
      category: 'electrical',
    };

    const updateData = {
      package_name: 'New Name',
      description: 'Updated description',
    };

    it('should update package successfully', async () => {
      const mockUpdatedPackage = { ...existingPackage, ...updateData };

      RefurbishmentPackageModel.findById.mockResolvedValue(existingPackage);
      RefurbishmentPackageModel.findByName.mockResolvedValue(null);
      RefurbishmentPackageModel.update.mockResolvedValue(mockUpdatedPackage);

      const result = await PackageService.updatePackage('pkg-1', updateData, 'user-1');

      expect(result).toEqual(mockUpdatedPackage);
      expect(RefurbishmentPackageModel.update).toHaveBeenCalledWith('pkg-1', updateData);
    });

    it('should throw NotFoundError when package does not exist', async () => {
      RefurbishmentPackageModel.findById.mockResolvedValue(null);

      await expect(
        PackageService.updatePackage('non-existent', updateData, 'user-1')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when new name conflicts with existing package', async () => {
      RefurbishmentPackageModel.findById.mockResolvedValue(existingPackage);
      RefurbishmentPackageModel.findByName.mockResolvedValue({
        id: 'other-pkg',
        package_name: 'New Name',
      });

      await expect(PackageService.updatePackage('pkg-1', updateData, 'user-1')).rejects.toThrow(
        ValidationError
      );
      await expect(PackageService.updatePackage('pkg-1', updateData, 'user-1')).rejects.toThrow(
        /already exists/
      );
    });
  });

  describe('deletePackage', () => {
    const existingPackage = {
      id: 'pkg-1',
      package_name: 'Test Package',
    };

    it('should soft delete package successfully', async () => {
      RefurbishmentPackageModel.findById.mockResolvedValue(existingPackage);
      RefurbishmentPackageModel.softDelete.mockResolvedValue(true);

      const result = await PackageService.deletePackage('pkg-1', 'user-1', false);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe('soft');
      expect(RefurbishmentPackageModel.softDelete).toHaveBeenCalledWith('pkg-1');
    });

    it('should hard delete package successfully when not linked to courses', async () => {
      RefurbishmentPackageModel.findById.mockResolvedValue(existingPackage);
      RefurbishmentPackageModel.hardDelete.mockResolvedValue(true);

      const result = await PackageService.deletePackage('pkg-1', 'user-1', true);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe('permanently');
      expect(RefurbishmentPackageModel.hardDelete).toHaveBeenCalledWith('pkg-1');
    });

    it('should throw ValidationError when trying to hard delete linked package', async () => {
      RefurbishmentPackageModel.findById.mockResolvedValue(existingPackage);
      RefurbishmentPackageModel.hardDelete.mockRejectedValue(
        new Error('Cannot delete package that is linked to courses')
      );

      await expect(PackageService.deletePackage('pkg-1', 'user-1', true)).rejects.toThrow(
        ValidationError
      );
      await expect(PackageService.deletePackage('pkg-1', 'user-1', true)).rejects.toThrow(
        /Cannot permanently delete package that is linked to courses/
      );
    });

    it('should throw NotFoundError when package does not exist', async () => {
      RefurbishmentPackageModel.findById.mockResolvedValue(null);

      await expect(PackageService.deletePackage('non-existent', 'user-1')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('reorderPackages', () => {
    it('should reorder packages successfully', async () => {
      const orderMap = {
        'pkg-1': 1,
        'pkg-2': 2,
        'pkg-3': 3,
      };

      RefurbishmentPackageModel.findById
        .mockResolvedValueOnce({ id: 'pkg-1' })
        .mockResolvedValueOnce({ id: 'pkg-2' })
        .mockResolvedValueOnce({ id: 'pkg-3' });

      RefurbishmentPackageModel.reorder.mockResolvedValue(true);

      const result = await PackageService.reorderPackages(orderMap, 'user-1');

      expect(result.success).toBe(true);
      expect(RefurbishmentPackageModel.reorder).toHaveBeenCalledWith(orderMap);
    });

    it('should throw ValidationError when orderMap is invalid', async () => {
      await expect(PackageService.reorderPackages(null, 'user-1')).rejects.toThrow(ValidationError);
      await expect(PackageService.reorderPackages('invalid', 'user-1')).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw NotFoundError when package ID does not exist', async () => {
      const orderMap = { 'non-existent': 1 };

      RefurbishmentPackageModel.findById.mockResolvedValue(null);

      await expect(PackageService.reorderPackages(orderMap, 'user-1')).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
