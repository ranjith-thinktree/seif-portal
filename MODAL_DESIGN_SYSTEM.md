# Modal Design System Update

## Overview

All modals in the SEIF Portal have been updated to follow a new design system with nonagon-shaped icons and consistent styling.

## New Modal Components

### 1. SuccessModal

**Location:** `frontend/src/components/common/SuccessModal.jsx`

**Design Features:**

- ✅ White checkmark icon
- 🟢 Green nonagon background with sharp edges
- Title (e.g., "Batch Details Approved")
- Description text
- Partner name and center name in grey background box
- Green "Return to Dashboard" button (rounded pill shape)

**Props:**

```javascript
{
  isOpen: boolean,              // Controls modal visibility
  onClose: function,            // Callback when modal should close
  title: string,                // Modal title (default: "Success")
  description: string,          // Description text below title
  partnerName: string,          // Partner name to display
  centerName: string,           // Center name to display
  returnRoute: string,          // Route to navigate on button click (optional)
  buttonText: string,           // Custom button text (default: "Return to Dashboard")
  onConfirm: function,          // Callback for confirmation action (for confirmation mode)
  isLoading: boolean,           // Loading state for confirmation button
  showCancel: boolean,          // Show cancel button for confirmation mode
}
```

**Usage Example:**

```javascript
<SuccessModal
  isOpen={showApproveModal}
  onClose={() => setShowApproveModal(false)}
  title="Center Approved"
  description="This center has been successfully approved and moved to the main system."
  partnerName="ABC Training Center"
  centerName="Mumbai Branch"
  returnRoute={ROUTES.REVIEW}
  buttonText="Return to Dashboard"
/>
```

**Confirmation Mode:**

```javascript
<SuccessModal
  isOpen={showApproveModal}
  onClose={() => setShowApproveModal(false)}
  title="Approve Center"
  description="Are you sure you want to approve this center?"
  partnerName="ABC Training Center"
  centerName="Mumbai Branch"
  onConfirm={handleApproveConfirm}
  isLoading={isApproving}
  showCancel={true}
  buttonText="Confirm Approval"
/>
```

### 2. RejectionModal

**Location:** `frontend/src/components/common/RejectionModal.jsx`

**Design Features:**

- ❌ White X mark icon
- 🔴 Red nonagon background with sharp edges
- Title (e.g., "Batch Details Rejected")
- Description text
- Two input fields:
  - Reason for Rejection (required, min 10 characters)
  - Remarks (optional)
- Two buttons: Cancel (grey) and Submit (red, rounded pill shape)

**Props:**

```javascript
{
  isOpen: boolean,              // Controls modal visibility
  onClose: function,            // Callback when modal should close
  title: string,                // Modal title (default: "Rejected")
  description: string,          // Description text below title
  onSubmit: function,           // Callback when form is submitted: ({ reason, remarks }) => void
  isLoading: boolean,           // Loading state for submit button
  reasonLabel: string,          // Custom label for reason field (default: "Reason for Rejection")
  remarksLabel: string,         // Custom label for remarks field (default: "Remarks")
  reasonPlaceholder: string,    // Placeholder for reason input
  remarksPlaceholder: string,   // Placeholder for remarks input
  minReasonLength: number,      // Minimum character length for reason (default: 10)
}
```

**Usage Example:**

```javascript
<RejectionModal
  isOpen={showRejectModal}
  onClose={() => setShowRejectModal(false)}
  title="Reject Center: Mumbai Branch"
  description="Please provide a reason for rejecting this center. This will be sent to the partner for review."
  onSubmit={async ({ reason, remarks }) => {
    try {
      setIsRejecting(true);
      await reviewService.rejectCenter(uploadId, centerId, reason, remarks);
      showToast.success("Center rejected successfully");
      setShowRejectModal(false);
      navigate(ROUTES.REVIEW);
    } catch (error) {
      showToast.error("Failed to reject center");
    } finally {
      setIsRejecting(false);
    }
  }}
  isLoading={isRejecting}
  reasonLabel="Reason for Rejection"
  remarksLabel="Additional Remarks"
  reasonPlaceholder="Enter the reason for rejection (minimum 10 characters)"
  remarksPlaceholder="Enter any additional remarks or comments"
  minReasonLength={10}
/>
```

## Updated Pages

### 1. ReviewStudentsPage.jsx

**Location:** `frontend/src/pages/Review/ReviewStudentsPage.jsx`

**Changes:**

- ✅ Replaced old `Modal` component with `SuccessModal` for approval
- ✅ Replaced old `Modal` component with `RejectionModal` for rejection
- ✅ Updated imports
- ✅ Approval modal now shows partner and center names
- ✅ Rejection modal now has integrated form handling

### 2. ReviewPage.jsx

**Location:** `frontend/src/pages/Review/ReviewPage.jsx`

**Changes:**

- ✅ Replaced custom rejection modal HTML with `RejectionModal` component
- ✅ Updated imports
- ✅ Rejection modal now has consistent styling and validation

## Design Specifications

### Nonagon Shape

The nonagon (9-sided polygon) is created using CSS clip-path:

```css
clip-path: polygon(
  50% 0%,
  83% 12%,
  100% 43%,
  94% 78%,
  68% 100%,
  32% 100%,
  6% 78%,
  0% 43%,
  17% 12%
);
```

### Color Palette

- **Success Green:** `bg-green-500` (#10b981)
- **Error Red:** `bg-red-500` (#ef4444)
- **Grey Background:** `bg-gray-100` (#f3f4f6)
- **Text Colors:**
  - Title: `text-gray-900` (#111827)
  - Description: `text-gray-600` (#4b5563)
  - Labels: `text-gray-700` (#374151)

### Typography

- **Title:** `text-2xl font-bold`
- **Description:** `text-sm text-gray-600`
- **Labels:** `text-sm font-semibold`
- **Input Text:** `text-base`

### Spacing

- **Modal Padding:** `p-8`
- **Icon Size:** `w-24 h-24` (nonagon), `h-12 w-12` (inner icon)
- **Button Padding:** `px-6 py-3`
- **Gap Between Elements:** `mb-6` (24px)

### Animations

- **Modal Entry:** Fade in overlay + scale up modal
- **Loading Spinner:** Animated rotation
- **Button Hover:** Color transition + shadow lift

## Migration Guide

### Old Modal → New Success Modal

**Before:**

```javascript
<Modal
  isOpen={showApproveModal}
  onClose={() => setShowApproveModal(false)}
  title="Approve Center"
  actions={[
    { label: "Cancel", onClick: handleCancel, variant: "secondary" },
    { label: "Approve", onClick: handleApprove, variant: "success" },
  ]}
>
  <p>Are you sure you want to approve this center?</p>
</Modal>
```

**After:**

```javascript
<SuccessModal
  isOpen={showApproveModal}
  onClose={() => setShowApproveModal(false)}
  title="Approve Center"
  description="Are you sure you want to approve this center?"
  partnerName={center?.partner_name}
  centerName={center?.center_name}
  onConfirm={handleApprove}
  isLoading={isApproving}
  showCancel={true}
  buttonText="Confirm Approval"
/>
```

### Old Modal → New Rejection Modal

**Before:**

```javascript
<Modal isOpen={showRejectModal} onClose={handleClose} title="Reject Center">
  <div>
    <input
      value={reason}
      onChange={(e) => setReason(e.target.value)}
      placeholder="Reason for rejection"
    />
    <textarea
      value={remarks}
      onChange={(e) => setRemarks(e.target.value)}
      placeholder="Additional remarks"
    />
  </div>
  <button onClick={handleReject}>Submit</button>
</Modal>
```

**After:**

```javascript
<RejectionModal
  isOpen={showRejectModal}
  onClose={handleClose}
  title="Reject Center"
  description="Please provide a reason for rejecting this center."
  onSubmit={async ({ reason, remarks }) => {
    await handleReject(reason, remarks);
  }}
  isLoading={isRejecting}
/>
```

## Benefits

1. **Consistency:** All modals follow the same design language
2. **Accessibility:** Proper ARIA labels and keyboard navigation
3. **Validation:** Built-in form validation for rejection reasons
4. **Reusability:** Single component can be reused across the entire application
5. **Maintainability:** Changes to modal design only need to be made in one place
6. **UX:** Clear visual distinction between success and error states
7. **Responsive:** Works on all screen sizes

## Future Enhancements

- Add more modal variants (Warning, Info, Confirmation)
- Add animation customization options
- Add sound effects for success/error
- Add keyboard shortcuts (Enter to confirm, Esc to cancel)
- Add auto-close timer option
- Add custom icon support
- Add dark mode support
