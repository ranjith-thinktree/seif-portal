/**
 * Default editable email drafts.
 * Placeholders: {{partnerName}} {{centerName}} {{year}} {{dueDate}} {{date}}
 * {{adminName}} {{packageName}} {{batchNumber}} {{assessmentDate}} {{location}}
 * {{yourName}} {{workStatus}} {{supportRequired}}
 *
 * Audience: admin | partner | essci
 */
module.exports = [
  {
    key: 'refurbishment.eligible_partner',
    name: 'Refurbishment – Eligible center (to partner)',
    category: 'Refurbishment',
    audience: 'partner',
    subject: 'Submission of Refurbishment & Upgradation detail for FY {{year}}',
    body: `Dear Partner,

As part of the Refurbishment & Upgradation process for the current year, your center/Centers has been identified as eligible.

Kindly provide the following details:
• Please fill in the attached Excel file with the required information.
• Please share recent geo-tagged photographs of the existing equipment and infrastructure.

Kindly submit the completed Excel file and supporting documents on or before {{dueDate}}.

For any queries or assistance, please feel free to contact us.

Regards`,
  },
  {
    key: 'refurbishment.submitted_admin',
    name: 'Refurbishment – Partner submission (to admin)',
    category: 'Refurbishment',
    audience: 'admin',
    subject: 'Refurbishment & Upgradation Submission Received for Review',
    body: `Dear Admin,

This is to inform you that {{partnerName}} has submitted the required details for the Refurbishment & Upgradation process.

The following documents have been received:
• Completed Excel file
• Geo-tagged photographs of the existing equipment/infrastructure

Kindly review the submitted documents and take the necessary action.

Submission Details:
• Partner Name: {{partnerName}}
• Center Name: {{centerName}}
• Submission Date: {{date}}

For any clarifications, please contact the concerned partner.`,
  },
  {
    key: 'refurbishment.approved_partner',
    name: 'Refurbishment – Approved (to partner)',
    category: 'Refurbishment',
    audience: 'partner',
    subject: 'Refurbishment & Upgradation Proposal Approved',
    body: `Dear {{partnerName}},

We are pleased to inform you that your Refurbishment & Upgradation proposal has been reviewed and approved.

Thank you for submitting the required details and supporting documents. Based on the review, your request has been approved under the following package:

Details:
• Partner Name: {{partnerName}}
• Center Name: {{centerName}}
• Approved Package: {{packageName}}
• Approval Date: {{date}}

The next steps and further communication regarding the implementation process will be shared with you shortly.

For any queries or clarification, please feel free to contact us.

Regards,
{{adminName}}`,
  },
  {
    key: 'refurbishment.resend_partner',
    name: 'Refurbishment – Additional information required (to partner)',
    category: 'Refurbishment',
    audience: 'partner',
    subject: 'Refurbishment & Upgradation Submission – Additional Information Required',
    body: `Dear {{partnerName}},

Thank you for submitting the details for the Refurbishment & Upgradation process.

Upon review, we found that some required information and/or supporting documents are missing from your submission. We request you to kindly review the submitted details and provide the missing information.

Should you require any clarification or assistance, please feel free to contact us.

Thank you for your cooperation.

Regards,
{{adminName}}`,
  },
  {
    key: 'refurbishment.rejected_partner',
    name: 'Refurbishment – Not approved (to partner)',
    category: 'Refurbishment',
    audience: 'partner',
    subject: 'Refurbishment & Upgradation Request – Not Approved',
    body: `Dear {{partnerName}},

Thank you for submitting your proposal for the Refurbishment & Upgradation process.

After careful review, we regret to inform you that your request has not been approved for the current cycle due to eligibility and assessment criteria. This may be based on factors such as center performance, training outcomes, equipment condition, or other evaluation parameters.

We appreciate your participation and encourage you to apply in future cycles if eligible.

Regards,
{{adminName}}`,
  },
  {
    key: 'refurbishment.status_admin',
    name: 'Refurbishment – Partner status update (to admin)',
    category: 'Refurbishment',
    audience: 'admin',
    subject: 'Status Update on Refurbishment & Upgradation Activities',
    body: `Dear {{adminName}},

Please find below the current status of the Refurbishment & Upgradation activities at our center.

Status Details:
• Refurbishment/Upgradation Work Status: {{workStatus}}
• Support Required (if any): {{supportRequired}}
• Geo-tagged Photographs: Attached for your review

We are pleased to inform you that the refurbishment and upgradation activities have been completed as planned. Please find the attached geo-tagged photographs for your reference.

Kindly let us know if any additional information or documentation is required.

Thank you for your support.`,
  },
  {
    key: 'refurbishment.ack_partner',
    name: 'Refurbishment – Admin acknowledgement (to partner)',
    category: 'Refurbishment',
    audience: 'partner',
    subject: 'Acknowledgement of Refurbishment & Upgradation Status Update',
    body: `Dear {{partnerName}},

Thank you for sharing the status update on the Refurbishment & Upgradation activities at your center.

We acknowledge the receipt of the details and the geo-tagged photographs submitted by your team. We are pleased to note that the refurbishment and upgradation activities have been completed as planned.

The submitted information has been recorded and is under review. We will reach out to you if any additional information or documentation is required.

Thank you for your cooperation and continued support.`,
  },
  {
    key: 'assessment.request_admin',
    name: 'Assessment – Request received (to admin)',
    category: 'Certification',
    audience: 'admin',
    subject: 'Assessment Request Received',
    body: `Dear Admin,

A request has been received from a partner to conduct an assessment on {{assessmentDate}}.

Please find the details below:
• Partner Name: {{partnerName}}
• Center name: {{centerName}}
• Assessment Date: {{assessmentDate}}

Kindly review the request and take the necessary action.

Thank you.`,
  },
  {
    key: 'assessment.approved_partner',
    name: 'Assessment – Request approved (to partner)',
    category: 'Certification',
    audience: 'partner',
    subject: 'Assessment Request Approved',
    body: `Dear {{partnerName}},

We are happy to inform you that your request to conduct an assessment on {{assessmentDate}} has been approved.

Assessment Details:
• Assessment Date: {{assessmentDate}}
• Batch Name/ID: {{batchNumber}}
• Location: {{location}}

Please proceed with the necessary preparations. If you have any questions, feel free to contact us.

Thank you.`,
  },
  {
    key: 'assessment.approved_essci',
    name: 'Assessment – Approved notification (to ESSCI)',
    category: 'Certification',
    audience: 'essci',
    subject: 'Approved Assessment Notification',
    body: `Dear ESSCI Team,

This is to inform you that the assessment request submitted by {{partnerName}} has been approved.

Assessment Details:
• Partner Name: {{partnerName}}
• Center Name: {{centerName}}
• Batch Name/ID: {{batchNumber}}
• Assessment Date: {{assessmentDate}}

Kindly note the above assessment and take the necessary action from your end.
Please reach out using the provided email ID and contact number to complete the process.

Thank you.`,
  },
  {
    key: 'assessment.results_admin',
    name: 'Assessment – Results uploaded (to admin)',
    category: 'Certification',
    audience: 'admin',
    subject: 'Assessment Completed – Results & Certificates Uploaded',
    body: `Dear Admin,

This is to inform you that the assessment for {{batchNumber}} has been successfully completed by ESSCI.

The assessment results and certificates have been uploaded to the designated folder and are now available for review.

Details:
• Partner Name: {{partnerName}}
• Center Name: {{centerName}}
• Batch Name/ID: {{batchNumber}}
• Assessment Date: {{assessmentDate}}

Kindly review the uploaded documents and proceed with the necessary actions.

Regards,
{{yourName}}`,
  },
  {
    key: 'assessment.results_partner',
    name: 'Assessment – Results uploaded (to partner / center)',
    category: 'Certification',
    audience: 'partner',
    subject: 'Assessment Completed – Results & Certificates Available',
    body: `Dear {{partnerName}},

We are pleased to inform you that the assessment for {{batchNumber}} has been successfully completed by ESSCI.

The assessment results and certificates have been uploaded and are available for your reference.

Details:
• Batch Name/ID: {{batchNumber}}
• Assessment Date: {{assessmentDate}}

Please review the uploaded documents and let us know if you require any assistance.

Regards,
{{yourName}}`,
  },
  {
    key: 'trainee.new_admin',
    name: 'Trainee data – New upload (to admin)',
    category: 'Trainee Data',
    audience: 'admin',
    subject: 'New Trainee Data Upload Received',
    body: `Dear Admin,

A new trainee data file has been uploaded and submitted for review in the SEIF Portal.

Please log in to the portal to review and take the necessary action.

Regards,
SEIF Portal`,
  },
  {
    key: 'trainee.approved_partner',
    name: 'Trainee data – Approved (to partner)',
    category: 'Trainee Data',
    audience: 'partner',
    subject: 'Trainee Data Upload Approved',
    body: `Dear Partner,

Your trainee data upload has been reviewed and approved successfully.

You may log in to the SEIF Portal for further details.

Regards,
SEIF Portal`,
  },
  {
    key: 'trainee.rejected_partner',
    name: 'Trainee data – Rejected (to partner)',
    category: 'Trainee Data',
    audience: 'partner',
    subject: 'Trainee Data Upload Rejected',
    body: `Dear Partner,

Your trainee data upload has been reviewed and rejected.

Please check the comments provided in the SEIF Portal, make the necessary corrections, and resubmit the data for review.

Regards,
SEIF Portal`,
  },
  {
    key: 'trainee.resubmitted_admin',
    name: 'Trainee data – Resubmitted (to admin)',
    category: 'Trainee Data',
    audience: 'admin',
    subject: 'Trainee Data Resubmitted for Review',
    body: `Dear Admin,

A trainee data submission that was previously rejected has been corrected and resubmitted for review.

Please log in to the SEIF Portal and review the submission.

Regards,
SEIF Portal`,
  },
  {
    key: 'trainee.center_approved_partner',
    name: 'Trainee data – Center approved (to partner)',
    category: 'Trainee Data',
    audience: 'partner',
    subject: 'Center Approved',
    body: `Dear Partner,

Your center has been reviewed and approved successfully.

You may proceed with the next steps as applicable.

Regards,
SEIF Portal`,
  },
  {
    key: 'trainee.center_rejected_partner',
    name: 'Trainee data – Center rejected (to partner)',
    category: 'Trainee Data',
    audience: 'partner',
    subject: 'Center Rejected',
    body: `Dear Partner,

Your center has been reviewed and is not approved at this stage.

Please review the remarks available in the SEIF Portal, make the necessary updates, and resubmit for review.

Regards,
SEIF Portal`,
  },
  {
    key: 'employment.new_admin',
    name: 'Employment data – New upload (to admin)',
    category: 'Employment Data',
    audience: 'admin',
    subject: 'New Employment Data Upload Received',
    body: `Dear Admin,

A new employment data file has been uploaded and submitted for review in the SEIF Portal.

Please log in to the portal to review and take the necessary action.

Regards,
SEIF Portal`,
  },
  {
    key: 'employment.approved_partner',
    name: 'Employment data – Approved (to partner)',
    category: 'Employment Data',
    audience: 'partner',
    subject: 'Employment Data Upload Approved',
    body: `Dear Partner,

Your employment data upload has been reviewed and approved successfully.

You may log in to the SEIF Portal for further details.

Regards,
SEIF Portal`,
  },
  {
    key: 'employment.rejected_partner',
    name: 'Employment data – Rejected (to partner)',
    category: 'Employment Data',
    audience: 'partner',
    subject: 'Employment Data Upload Rejected',
    body: `Dear Partner,

Your employment data upload has been reviewed and rejected.

Please check the comments available in the SEIF Portal, make the necessary corrections, and resubmit the data for review.

Regards,
SEIF Portal`,
  },
  {
    key: 'employment.resubmitted_admin',
    name: 'Employment data – Resubmitted (to admin)',
    category: 'Employment Data',
    audience: 'admin',
    subject: 'Employment Data Resubmitted for Review',
    body: `Dear Admin,

An employment data submission that was previously rejected has been corrected and resubmitted for review.

Please log in to the SEIF Portal and review the submission.

Regards,
SEIF Portal`,
  },
  {
    key: 'tot.new_admin',
    name: 'TOT data – New upload (to admin)',
    category: 'TOT Data',
    audience: 'admin',
    subject: 'New TOT Data Upload Received',
    body: `Dear Admin,

A new TOT data file has been uploaded and submitted for review in the SEIF Portal.

Please log in to the portal to review and take the necessary action.

Regards,
SEIF Portal`,
  },
  {
    key: 'tot.approved_partner',
    name: 'TOT data – Approved (to partner)',
    category: 'TOT Data',
    audience: 'partner',
    subject: 'TOT Data Upload Approved',
    body: `Dear Partner,

Your TOT data upload has been reviewed and approved successfully.

You may log in to the SEIF Portal for further details.

Regards,
SEIF Portal`,
  },
  {
    key: 'tot.rejected_partner',
    name: 'TOT data – Rejected (to partner)',
    category: 'TOT Data',
    audience: 'partner',
    subject: 'TOT Data Upload Rejected',
    body: `Dear Partner,

Your TOT data upload has been reviewed and rejected.

Please check the comments available in the SEIF Portal, make the necessary corrections, and resubmit the data for review.

Regards,
SEIF Portal`,
  },
  {
    key: 'tot.resubmitted_admin',
    name: 'TOT data – Resubmitted (to admin)',
    category: 'TOT Data',
    audience: 'admin',
    subject: 'TOT Data Resubmitted for Review',
    body: `Dear Admin,

A TOT data submission that was previously rejected has been corrected and resubmitted for review.

Please log in to the SEIF Portal and review the submission.

Regards,
SEIF Portal`,
  },
  {
    key: 'center.pending_admin',
    name: 'Center – New pending approval (to admin)',
    category: 'Center Management',
    audience: 'admin',
    subject: 'New Center Pending Approval',
    body: `Dear Admin,

A new center has been submitted in the SEIF Portal and is pending your review and approval.

Please log in to the portal and take the necessary action.

Regards,
SEIF Portal`,
  },
  {
    key: 'center.approved_partner',
    name: 'Center – Approved (to partner)',
    category: 'Center Management',
    audience: 'partner',
    subject: 'Center Approved',
    body: `Dear Partner,

Your center has been reviewed and approved successfully.

You may now proceed with the relevant activities and updates through the SEIF Portal.

For more details, please log in to the portal.

Regards,
SEIF Portal`,
  },
  {
    key: 'center.rejected_partner',
    name: 'Center – Rejected (to partner)',
    category: 'Center Management',
    audience: 'partner',
    subject: 'Center Rejected',
    body: `Dear Partner,

Your center submission has been reviewed and rejected.

Please check the remarks available in the SEIF Portal, make the necessary corrections, and resubmit the center for review.

Regards,
SEIF Portal`,
  },
  {
    key: 'center.resubmitted_admin',
    name: 'Center – Resubmitted (to admin)',
    category: 'Center Management',
    audience: 'admin',
    subject: 'Center Resubmitted for Review',
    body: `Dear Admin,

A previously rejected center has been updated and resubmitted for review.

Please log in to the SEIF Portal and review the submission.

Regards,
SEIF Portal`,
  },
];
