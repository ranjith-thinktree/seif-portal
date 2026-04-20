const { deriveReviewProgress, deriveUploadStatus } = require('../../src/utils/uploadStatus.util');

describe('uploadStatus.util', () => {
  it('keeps untouched uploads as pending and not_started', () => {
    const counts = {
      totalCenters: 3,
      approvedCenters: 0,
      rejectedCenters: 0,
      pendingCenters: 3,
    };

    expect(deriveReviewProgress(counts)).toBe('not_started');
    expect(deriveUploadStatus(counts, 'pending')).toBe('pending');
  });

  it('marks mixed reviewed and pending uploads as partial and in_progress', () => {
    const counts = {
      totalCenters: 4,
      approvedCenters: 2,
      rejectedCenters: 0,
      pendingCenters: 2,
    };

    expect(deriveReviewProgress(counts)).toBe('in_progress');
    expect(deriveUploadStatus(counts, 'pending')).toBe('partial');
  });

  it('marks fully approved uploads as approved and completed', () => {
    const counts = {
      totalCenters: 2,
      approvedCenters: 2,
      rejectedCenters: 0,
      pendingCenters: 0,
    };

    expect(deriveReviewProgress(counts)).toBe('completed');
    expect(deriveUploadStatus(counts, 'pending')).toBe('approved');
  });

  it('marks fully rejected uploads as rejected and completed', () => {
    const counts = {
      totalCenters: 2,
      approvedCenters: 0,
      rejectedCenters: 2,
      pendingCenters: 0,
    };

    expect(deriveReviewProgress(counts)).toBe('completed');
    expect(deriveUploadStatus(counts, 'pending')).toBe('rejected');
  });

  it('marks mixed approved and rejected uploads as partial and completed', () => {
    const counts = {
      totalCenters: 5,
      approvedCenters: 3,
      rejectedCenters: 2,
      pendingCenters: 0,
    };

    expect(deriveReviewProgress(counts)).toBe('completed');
    expect(deriveUploadStatus(counts, 'pending')).toBe('partial');
  });
});
