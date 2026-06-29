import { describe, it, expect } from "vitest";
import {
  getRefurbishmentDisplayStatus,
  getPartnerRefurbishmentDisplayStatus,
  getRefurbishmentStatusLabel,
  getRefurbishmentStatusBadgeClass,
  buildPartnerAcknowledgmentConsentText,
  REFURBISHMENT_WORKFLOW_STEPS,
  PARTNER_ACK_STEP_IDX,
  INSTALLATION_STEP_IDX,
  REFURBISHMENT_PAST_REQUEST_STATUSES,
  isPartnerImageFile,
  resolvePartnerFileUrl,
} from "../../utils/refurbishmentUtils";

describe("Refurbishment workflow — frontend display logic", () => {
  describe("TC-F1: Workflow has 4 steps with partner ack as step 4", () => {
    it("defines exactly 4 workflow steps ending with partner acknowledgment", () => {
      expect(REFURBISHMENT_WORKFLOW_STEPS).toHaveLength(4);
      expect(REFURBISHMENT_WORKFLOW_STEPS[PARTNER_ACK_STEP_IDX].key).toBe(
        "partner_acknowledgment",
      );
      expect(REFURBISHMENT_WORKFLOW_STEPS[INSTALLATION_STEP_IDX].key).toBe(
        "installation_in_progress",
      );
      expect(
        REFURBISHMENT_WORKFLOW_STEPS.some((s) => s.key === "completed"),
      ).toBe(false);
    });
  });

  describe("TC-F2: Past requests status labels", () => {
    it.each([
      [
        "Acknowledgement Pending",
        {
          status: "installation_in_progress",
          completion_notified_at: "2026-04-15T09:00:00.000Z",
        },
        "Acknowledgement Pending",
      ],
      [
        "Ready to Complete",
        {
          status: "installation_in_progress",
          partner_completed_at: "2026-04-20T09:00:00.000Z",
        },
        "Ready to Complete",
      ],
      [
        "uses backend display_status when provided",
        {
          status: "installation_in_progress",
          display_status: "ready_to_complete",
          display_status_label: "Ready to Complete",
        },
        "Ready to Complete",
      ],
    ])("%s", (_name, request, expectedLabel) => {
      expect(getRefurbishmentStatusLabel(request)).toBe(expectedLabel);
    });
  });

  describe("TC-F3: Badge classes for new display statuses", () => {
    it("uses emerald badge for ready_to_complete", () => {
      const cls = getRefurbishmentStatusBadgeClass({
        status: "installation_in_progress",
        partner_completed_at: "2026-04-20T09:00:00.000Z",
      });
      expect(cls).toContain("emerald");
    });

    it("uses purple badge for acknowledgement_pending", () => {
      const cls = getRefurbishmentStatusBadgeClass({
        status: "installation_in_progress",
        completion_notified_at: "2026-04-15T09:00:00.000Z",
      });
      expect(cls).toContain("purple");
    });
  });

  describe("TC-F4: Partner consent text", () => {
    it("matches backend consent wording with upgradation", () => {
      const text = buildPartnerAcknowledgmentConsentText(true);
      expect(text).toContain("upgradation work");
      expect(text).toContain("true and accurate");
    });

    it("matches backend consent wording without upgradation", () => {
      const text = buildPartnerAcknowledgmentConsentText(false);
      expect(text).not.toContain("upgradation work");
    });
  });

  describe("TC-F5: Past request filter options include new statuses", () => {
    it("includes acknowledgement_pending and ready_to_complete in filter list", () => {
      const values = REFURBISHMENT_PAST_REQUEST_STATUSES.map((s) => s.value);
      expect(values).toContain("acknowledgement_pending");
      expect(values).toContain("ready_to_complete");
    });
  });

  describe("TC-F6: getRefurbishmentDisplayStatus priority", () => {
    it("prefers ready_to_complete over acknowledgement_pending when partner submitted", () => {
      const status = getRefurbishmentDisplayStatus({
        status: "installation_in_progress",
        completion_notified_at: "2026-04-15T09:00:00.000Z",
        partner_completed_at: "2026-04-20T09:00:00.000Z",
      });
      expect(status.key).toBe("ready_to_complete");
    });
  });

  describe("TC-F6b: getPartnerRefurbishmentDisplayStatus", () => {
    it("shows acknowledgement_pending when admin requested partner acknowledgment", () => {
      const status = getPartnerRefurbishmentDisplayStatus({
        status: "installation_in_progress",
        completion_notified_at: "2026-04-15T09:00:00.000Z",
        partner_completed_at: null,
      });
      expect(status.key).toBe("acknowledgement_pending");
      expect(status.label).toBe("Acknowledgement Pending");
    });

    it("shows completion_pending after partner submitted acknowledgment", () => {
      const status = getPartnerRefurbishmentDisplayStatus({
        status: "installation_in_progress",
        completion_notified_at: "2026-04-15T09:00:00.000Z",
        partner_completed_at: "2026-04-20T09:00:00.000Z",
      });
      expect(status.key).toBe("completion_pending");
      expect(status.label).toBe("Completion Pending");
    });
  });

  describe("TC-F7: isPartnerImageFile", () => {
    it("detects images by mime type", () => {
      expect(isPartnerImageFile({ type: "image/png", name: "doc" })).toBe(true);
    });

    it("detects images by filename when mime is generic", () => {
      expect(
        isPartnerImageFile({
          type: "application/octet-stream",
          name: "refurbishment-photo.jpeg",
        }),
      ).toBe(true);
    });

    it("detects images by URL extension", () => {
      expect(
        isPartnerImageFile({
          url: "/uploads/refurbishment/abc123.png",
          name: "refurbishment-document",
        }),
      ).toBe(true);
    });

    it("returns false for non-image PDFs", () => {
      expect(
        isPartnerImageFile({
          type: "application/pdf",
          name: "report.pdf",
        }),
      ).toBe(false);
    });
  });

  describe("TC-F8: resolvePartnerFileUrl", () => {
    it("rewrites absolute localhost upload URLs to same-origin relative paths", () => {
      expect(
        resolvePartnerFileUrl(
          "http://localhost:5000/uploads/refurbishment/sample.png",
        ),
      ).toBe("/uploads/refurbishment/sample.png");
    });

    it("keeps relative upload paths unchanged", () => {
      expect(resolvePartnerFileUrl("/uploads/refurbishment/sample.png")).toBe(
        "/uploads/refurbishment/sample.png",
      );
    });
  });
});
