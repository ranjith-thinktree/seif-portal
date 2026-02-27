const RefurbishmentPackage = require('../../src/models/RefurbishmentPackage.model');
const db = require('../../src/database/connection');

jest.mock('../../src/database/connection');

describe('RefurbishmentPackage Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all packages without filters', async () => {
      const mockPackages = [
        { id: 'pkg-1', package_name: 'Package 1', is_active: 1 },
        { id: 'pkg-2', package_name: 'Package 2', is_active: 1 },
      ];
      db.query.mockResolvedValue([mockPackages]);

      const result = await RefurbishmentPackage.findAll({});

      expect(result).toEqual(mockPackages);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM refurbishment_packages'),
        expect.any(Array)
      );
    });

    it('should apply category filter', async () => {
      db.query.mockResolvedValue([[]]);

      await RefurbishmentPackage.findAll({ category: 'electrical' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('category = ?'),
        expect.arrayContaining(['electrical'])
      );
    });

    it('should apply is_active filter', async () => {
      db.query.mockResolvedValue([[]]);

      await RefurbishmentPackage.findAll({ is_active: true });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = ?'),
        expect.arrayContaining([1])
      );
    });

    it('should apply search filter to package_name', async () => {
      db.query.mockResolvedValue([[]]);

      await RefurbishmentPackage.findAll({ search: 'test' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIKE ?'),
        expect.arrayContaining(['%test%', '%test%'])
      );
    });

    it('should apply limit and offset for pagination', async () => {
      db.query.mockResolvedValue([[]]);

      await RefurbishmentPackage.findAll({ limit: 50, offset: 100 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ? OFFSET ?'),
        expect.arrayContaining([50, 100])
      );
    });

    it('should order by display_order ASC by default', async () => {
      db.query.mockResolvedValue([[]]);

      await RefurbishmentPackage.findAll({});

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY display_order ASC'),
        expect.any(Array)
      );
    });
  });

  describe('count', () => {
    it('should return total count without filters', async () => {
      db.query.mockResolvedValue([[{ total: 25 }]]);

      const result = await RefurbishmentPackage.count({});

      expect(result).toBe(25);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as total FROM refurbishment_packages'),
        []
      );
    });

    it('should return count with category filter', async () => {
      db.query.mockResolvedValue([[{ total: 5 }]]);

      const result = await RefurbishmentPackage.count({ category: 'electrical' });

      expect(result).toBe(5);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('category = ?'),
        expect.arrayContaining(['electrical'])
      );
    });

    it('should return count with is_active filter', async () => {
      db.query.mockResolvedValue([[{ total: 10 }]]);

      const result = await RefurbishmentPackage.count({ is_active: true });

      expect(result).toBe(10);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = ?'),
        expect.arrayContaining([1])
      );
    });
  });

  describe('findById', () => {
    it('should return package when found', async () => {
      const mockPackage = { id: 'pkg-1', package_name: 'Test Package' };
      db.query.mockResolvedValue([[mockPackage]]);

      const result = await RefurbishmentPackage.findById('pkg-1');

      expect(result).toEqual(mockPackage);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM refurbishment_packages WHERE id = ?'),
        ['pkg-1']
      );
    });

    it('should return null when package not found', async () => {
      db.query.mockResolvedValue([[]]);

      const result = await RefurbishmentPackage.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByIdWithCourses', () => {
    it('should return package with courses array', async () => {
      const mockResult = {
        id: 'pkg-1',
        package_name: 'Test Package',
        courses:
          '{"course_id":"c1","course_name":"Course 1"},{"course_id":"c2","course_name":"Course 2"}',
      };
      db.query.mockResolvedValue([[mockResult]]);

      const result = await RefurbishmentPackage.findByIdWithCourses('pkg-1');

      expect(result.id).toBe('pkg-1');
      expect(Array.isArray(result.courses)).toBe(true);
      expect(result.courses.length).toBeGreaterThan(0);
    });

    it('should handle package with no courses', async () => {
      const mockResult = {
        id: 'pkg-1',
        package_name: 'Test Package',
        courses: null,
      };
      db.query.mockResolvedValue([[mockResult]]);

      const result = await RefurbishmentPackage.findByIdWithCourses('pkg-1');

      expect(result.courses).toEqual([]);
    });

    it('should return null when package not found', async () => {
      db.query.mockResolvedValue([[]]);

      const result = await RefurbishmentPackage.findByIdWithCourses('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should return package with exact name match', async () => {
      const mockPackage = { id: 'pkg-1', package_name: 'Test Package' };
      db.query.mockResolvedValue([[mockPackage]]);

      const result = await RefurbishmentPackage.findByName('Test Package');

      expect(result).toEqual(mockPackage);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE package_name = ?'), [
        'Test Package',
      ]);
    });

    it('should return null when no match found', async () => {
      db.query.mockResolvedValue([[]]);

      const result = await RefurbishmentPackage.findByName('Non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create package with provided data', async () => {
      const mockPackage = { id: 'new-id', package_name: 'New Package', display_order: 999 };

      db.query
        .mockResolvedValueOnce([{ insertId: 'new-id' }]) // INSERT
        .mockResolvedValueOnce([[mockPackage]]); // findById

      const packageData = {
        package_name: 'New Package',
        description: 'Test description',
        category: 'electrical',
      };

      const result = await RefurbishmentPackage.create(packageData);

      expect(result).toEqual(mockPackage);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refurbishment_packages'),
        expect.any(Array)
      );
    });

    it('should use provided display_order if specified', async () => {
      const mockPackage = { id: 'new-id', package_name: 'New Package', display_order: 5 };

      db.query
        .mockResolvedValueOnce([{ insertId: 'new-id' }])
        .mockResolvedValueOnce([[mockPackage]]);

      const packageData = {
        package_name: 'New Package',
        display_order: 5,
      };

      const result = await RefurbishmentPackage.create(packageData);

      expect(result.display_order).toBe(5);
    });

    it('should default is_active to 1', async () => {
      const mockPackage = { id: 'new-id', is_active: 1 };

      db.query
        .mockResolvedValueOnce([{ insertId: 'new-id' }])
        .mockResolvedValueOnce([[mockPackage]]);

      const result = await RefurbishmentPackage.create({ package_name: 'Test' });

      expect(result.is_active).toBe(1);
    });
  });

  describe('update', () => {
    it('should update package fields', async () => {
      const mockUpdatedPackage = { id: 'pkg-1', package_name: 'Updated Name' };

      db.query
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE
        .mockResolvedValueOnce([[mockUpdatedPackage]]); // findById

      const updates = {
        package_name: 'Updated Name',
        description: 'Updated description',
      };

      const result = await RefurbishmentPackage.update('pkg-1', updates);

      expect(result).toEqual(mockUpdatedPackage);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refurbishment_packages'),
        expect.arrayContaining(['Updated Name', 'Updated description', 'pkg-1'])
      );
    });

    it('should handle single field update', async () => {
      const mockPackage = { id: 'pkg-1', package_name: 'Test' };

      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([[mockPackage]]);

      await RefurbishmentPackage.update('pkg-1', { package_name: 'Updated' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('package_name = ?'),
        expect.any(Array)
      );
    });

    it('should handle multiple field updates', async () => {
      const mockPackage = { id: 'pkg-1', package_name: 'Updated' };

      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([[mockPackage]]);

      const updates = {
        package_name: 'Updated',
        description: 'New desc',
        category: 'equipment',
        is_active: false,
      };

      await RefurbishmentPackage.update('pkg-1', updates);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('package_name = ?'),
        expect.any(Array)
      );
    });
  });

  describe('softDelete', () => {
    it('should set is_active to 0', async () => {
      db.query.mockResolvedValue([{ affectedRows: 1 }]);

      await RefurbishmentPackage.softDelete('pkg-1');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refurbishment_packages'),
        ['pkg-1']
      );
    });

    it('should return true when package found', async () => {
      db.query.mockResolvedValue([{ affectedRows: 1 }]);

      const result = await RefurbishmentPackage.softDelete('pkg-1');

      expect(result).toBe(true);
    });

    it('should return false when package not found', async () => {
      db.query.mockResolvedValue([{ affectedRows: 0 }]);

      const result = await RefurbishmentPackage.softDelete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('hardDelete', () => {
    it('should delete package permanently when not linked', async () => {
      db.query
        .mockResolvedValueOnce([[{ count: 0 }]]) // checkLinkedCourses
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE

      await RefurbishmentPackage.hardDelete('pkg-1');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM refurbishment_packages'),
        ['pkg-1']
      );
    });

    it('should return true when package deleted', async () => {
      db.query.mockResolvedValueOnce([[{ count: 0 }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await RefurbishmentPackage.hardDelete('pkg-1');

      expect(result).toBe(true);
    });

    it('should return false when package not found', async () => {
      db.query.mockResolvedValueOnce([[{ count: 0 }]]).mockResolvedValueOnce([{ affectedRows: 0 }]);

      const result = await RefurbishmentPackage.hardDelete('non-existent');

      expect(result).toBe(false);
    });

    it('should throw error when package is linked to courses', async () => {
      db.query.mockResolvedValueOnce([[{ count: 3 }]]);

      await expect(RefurbishmentPackage.hardDelete('pkg-1')).rejects.toThrow(
        'Cannot delete package that is linked to courses'
      );
    });
  });

  describe('getNextDisplayOrder', () => {
    it('should return next available display_order', async () => {
      db.query.mockResolvedValue([[{ next_order: 11 }]]);

      const result = await RefurbishmentPackage.getNextDisplayOrder();

      expect(result).toBe(11);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('COALESCE(MAX(display_order), 0) + 1')
      );
    });

    it('should return 1 when no packages exist', async () => {
      db.query.mockResolvedValue([[{ next_order: 1 }]]);

      const result = await RefurbishmentPackage.getNextDisplayOrder();

      expect(result).toBe(1);
    });
  });

  describe('reorder', () => {
    it('should update display_order for multiple packages in transaction', async () => {
      const mockConnection = {
        beginTransaction: jest.fn(),
        query: jest.fn().mockResolvedValue([{ affectedRows: 1 }]),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      db.getConnection.mockResolvedValue(mockConnection);

      const orderMap = { 'pkg-1': 1, 'pkg-2': 2, 'pkg-3': 3 };
      await RefurbishmentPackage.reorder(orderMap);

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalledTimes(3);
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const mockConnection = {
        beginTransaction: jest.fn(),
        query: jest.fn().mockRejectedValue(new Error('DB error')),
        rollback: jest.fn(),
        release: jest.fn(),
      };
      db.getConnection.mockResolvedValue(mockConnection);

      await expect(RefurbishmentPackage.reorder({ 'pkg-1': 1 })).rejects.toThrow('DB error');

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should call query for each package in orderMap', async () => {
      const mockConnection = {
        beginTransaction: jest.fn(),
        query: jest.fn().mockResolvedValue([{ affectedRows: 1 }]),
        commit: jest.fn(),
        release: jest.fn(),
      };
      db.getConnection.mockResolvedValue(mockConnection);

      const orderMap = { 'pkg-1': 1, 'pkg-2': 2 };
      await RefurbishmentPackage.reorder(orderMap);

      expect(mockConnection.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('UPDATE refurbishment_packages'),
        [1, 'pkg-1']
      );
      expect(mockConnection.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('UPDATE refurbishment_packages'),
        [2, 'pkg-2']
      );
    });
  });
});
