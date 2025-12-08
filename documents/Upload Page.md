# This is my design for the upload page, can you please explain this to my ai so that it will develop as i needed

please explain each and everything in detail line by line, without missing

Here’s a detailed, line-by-line breakdown of your upload page design to help your AI understand and develop it as you need. Each element, text, button, and instruction is explained for clarity and precision.

---

### **Page Overview**

**1. Top Navigation/Header**

- At the top left, there’s a placeholder text **“Partner name”** indicating where the organization or company name will appear.
- Top right contains an **Upload Data** button (prominent green button) and two icons: a gear (settings) and a bell (notifications/account activity).

**2. Sidebar Navigation (Left Panel)**

- Vertical menu for easy navigation:
  - **Home** - Main/Dashboard page link.
  - **Data** - Section to manage or view data.
  - **Inbox** - For messages or notifications.
  - **Upload (expanded)**:
    - **Upload data** - Current page, for uploading new files.
    - **Upload history** - To check previously uploaded files.
  - **Profile** - Link to access user account details.

---

### **Main Content (Upload Data Page)**

**3. Page Header**

- **Upload Data** (bold): Title of the main page section.
- **An overview of your program’s performance**: Subheading giving purpose/context of this section.

**4. Tab Navigation**

- **Upload**: Currently selected tab, showing the interface for new uploads.
- **Upload history**: Alternate tab to view previously uploaded files.

---

### **Central Upload Panel**

#### **Left Section: File Upload Area**

- Large boxed area labeled:
  - **Drag and Drop to upload data file (\*.xml) or import from your computer**
    - Users can either drag a file (with .xml extension) or use the computer file picker.
  - **Import** button: Clicking this lets users open a file dialog to select the file for upload.
- **Upload (green button)**: Triggers the final upload of the file (after selection via drag \& drop or file picker).

#### **Right Section: How to Upload Data**

- A step-by-step instruction block:

1. **Download the CSV Template** - Gives the user a direct way to **Download template** (button to the right) for correct data formatting. The template ensures users use the accepted file format/structure for upload.
2. **Update the data and rename the file as: Partnername_CenterID_BatchID** - Instructions clearly state: - Fill or update the downloaded CSV with new data. - Rename the file following the convention: Partnername_CenterID_BatchID (e.g., XYZ_105_202011 for tracking).
3. **Save the file and upload** - Reminds the user to save the file after editing and then proceed to upload using the interface provided on the left.

---

### **User Experience Flow**

- **Step 1:** User downloads the provided CSV template using the “Download template” button.
- **Step 2:** They fill in/update the required data and rename the file as instructed.
- **Step 3:** The user either drags and drops the file to the upload area or uses the import button.
- **Step 4:** After ensuring the correct file is selected, clicking the green “Upload” button submits the file to the system.
- **Step 5:** (Not shown, but expected): The user can check the “Upload history” tab for a log/status of their previous uploads.

---

### **Design and Functionality Guidance for AI Development**

- All buttons should be responsive and provide feedback (e.g., success/failure, loading indicators).
- Only allow upload of _.xml_ file types as specified. Optionally, allow _.csv_ if template is in CSV format.
- The file renaming rule must be validated: Before upload, check if the file name matches the required format.
- All steps and instructions should be clear, visible, and easy to follow.
- Accessibility (keyboard navigation, readable color contrast, alt text for icons) should be ensured.
- Error handling: Show clear messages if the file type is incorrect, if upload fails, or if template isn’t correctly used.
- Templates and instructions should be dynamic (e.g., if the partner name changes, update instruction texts).
- Use separate upload and upload history views for clarity in the workflow.
