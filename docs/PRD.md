# PRD: FazalDataConverter — Product Requirements Document

---

## 1. Product Overview

FazalDataConverter is a web-based tool that converts Excel files to JSON and JSON files to Excel. It includes two JSON output modes: Normal Data JSON and metadata-preserving Workbook JSON. Browser processing is the default method, while optional server processing is available for eligible large jobs.

---

## 2. Problem & Goals

### 2.1 Problem Statement

Manually converting data between Excel and JSON can be time-consuming and difficult. During conversion, there is a risk of losing supported data, structure, or metadata from the workbook. Properly handling large file processing, invalid files, and conversion errors is also essential.

FazalDataConverter will solve these problems by providing Excel-to-JSON and JSON-to-Excel conversion. Its focus will be on accurate conversion, preserving supported information, efficient processing, and complete verification of converted output.

### 2.2 Key Problems

- **Manual Conversion Difficulty:** Manually converting data between Excel and JSON can be time-consuming and error-prone.
- **Data & Metadata Loss:** During conversion, supported workbook structure, values, or metadata may be lost or incorrectly converted.
- **Large File Processing:** Efficiently processing large files and achieving defined processing targets can be challenging.
- **File & Conversion Errors:** Properly identifying and handling invalid, unsupported, or corrupted files and conversion failures is essential.
- **Output Accuracy & Verification:** Verifying the correctness of supported data in converted output is necessary to prevent silent data loss or incorrect conversion.

### 2.3 Product Goals

- **Conversion Accuracy:** The target is 100% correctness for officially supported data. Unsupported or partially supported features will not be included in this guarantee and will be clearly reported.
- **Maximum File Size:** The initial maximum input file size is 50 MB per file. Browser processing is the default, while optional server processing is available for eligible files. Server processing also falls within the same 50 MB limit.
- **Conversion Processing Time:** The following processing targets apply for supported files:
  - Files up to 10 MB: Within 10 seconds.
  - Files up to 50 MB: Within 60 seconds.
  - These targets will be measured in a documented test environment. Upload and download time is not included in this measurement.
- **Successful Conversion Rate:** The target is a 99% success rate for eligible conversion attempts.
  - Valid and supported file converted successfully: Success.
  - Valid and supported file encountering a system failure: Failure.
  - Invalid or unsupported file: Excluded from the metric.
  - User-cancelled conversion: Excluded from the metric.
  - Formula: Successful eligible attempts / Total eligible attempts × 100.
- **Output Verification Coverage:** 100% of officially supported data elements will be verified in each conversion output. Verification will check values, structure, and supported metadata according to conversion rules. Unsupported or partially supported features will be clearly reported; their preservation is not guaranteed.

---

## 3. Users & Roles

### 3.1 User Types & Role Structure

The website will have exactly three user types:

1. **Guest:** A visitor who uses the website without logging in.
2. **Registered User:** A user authenticated through Google Login.
3. **Admin:** The sole administrative account for the website, responsible for managing all administrative operations.

Only one Admin account is allowed on the website. No additional user types or administrative roles will exist. Unrecognized or unauthorized user types will be denied access to website features and protected resources. Appropriate security controls, including safeguarded IP blocking, will apply to unauthorized access attempts.

### 3.2 Guest Permissions

A Guest can use Excel ↔ JSON conversion without creating an account.

**Allowed:**

- Excel to JSON conversion.
- JSON to Excel conversion.
- Using available conversion options and supported features.
- Immediately downloading the conversion result.

**Restrictions:**

- Conversion history will not be saved.
- Original uploaded files and converted outputs will not be permanently stored.
- Guests will not have access to Registered User history, account features, or the Admin panel.
- If server processing is used for an eligible large conversion, processing files will be temporary and removed according to the defined cleanup policy.

### 3.3 Registered User Permissions

A Registered User accesses their account through Google Login.

**Allowed:**

- Using Excel ↔ JSON conversion.
- Viewing their own conversion history.
- Managing their own original uploaded files and converted outputs.
- Re-downloading available converted outputs.
- Deleting individual history entries.
- Clearing complete conversion history.
- Independently deleting original uploaded files and converted outputs.
- Permanently deleting their own account.

**File & History Storage Rules:**

- Original uploaded files and converted outputs remain stored in the account until the user deletes them.
- Both files are managed independently.
- Deleting the original file does not delete the converted output.
- Deleting the converted output does not delete the history metadata.
- Deleting a history entry does not delete the original file or converted output.
- Clearing complete history deletes only history records; original files and converted outputs remain.

**Account Suspension:**

- A suspended user cannot log in, perform conversions, or access stored history/files.
- User data is preserved during suspension.
- At the time of suspension, all active sessions across devices are immediately revoked.
- The Admin can reactivate the account.
- After reactivation, the user must log in again.

**Account Self-Deletion:**

- A Registered User can permanently delete their own account.
- Re-authentication and explicit final confirmation are required before deletion.
- After confirmation, deletion executes immediately.
- The account, conversion history, original uploaded files, and converted outputs are permanently deleted.
- Required security/audit records may be preserved according to their separate retention policy.

### 3.4 Admin Permissions

There will be exactly one Admin account on the website. The sole Admin will manage all administrative operations.

**Admin Responsibilities:**

- Managing Registered User accounts.
- Viewing, suspending, reactivating, and permanently deleting user accounts.
- Monitoring users' conversion activity and history metadata.
- Monitoring conversion failures and system issues.
- Managing system-level configurable settings.
- Enabling/disabling Maintenance Mode.
- Reviewing security logs and administrative audit records.

**User Data Visibility:**

The Admin can view all Registered Users' conversion activity and history metadata, including:

- File names.
- File sizes.
- Conversion type.
- Conversion status.
- Timestamps.

The Admin will **not** have permission to access users' original uploaded files or converted file contents.

**Admin Account Deletion:**

- The Admin can permanently delete any Registered User account.
- Before deletion, identifying the target account, displaying a clear warning, and obtaining explicit confirmation are required.
- After confirmation, the account, history, original files, and converted outputs are permanently deleted.
- The deletion action is recorded in the audit log.

**Admin System Settings:**

The Admin can manage configurable conversion-related settings, including:

- Per-file size limit.
- Processing limits.
- Maintenance Mode.

The per-file size limit cannot exceed a maximum of 50 MB. A formally approved PRD change is required for a value higher than this limit. Important settings changes are recorded in the audit log.

### 3.5 Admin Authentication & Recovery

- The Admin account is created securely by the Project Owner during the initial setup.
- Public Admin registration is not available.
- No other user can create an Admin account.
- Admin login uses a registered email and password.
- Password recovery is available through a secure, time-limited reset link sent to the registered email.
- Secure verification is required for Admin password recovery.

### 3.6 Admin Failed Login Protection & Lockout

Temporary lockout protection exists against repeated failed login attempts on the Admin account.

**Lockout Rules:**

- After 5 consecutive failed login attempts, the Admin account is temporarily locked for 15 minutes.
- Failed attempts are counted on the basis of the Admin account, not the IP address.
- Failed attempts from different IP addresses also count in the same account counter.
- During lockout, the Admin cannot log in.
- After the lockout expires, the Admin can try logging in again.
- The failed-attempt counter resets to zero only on a successful login.
- The counter does not reset when the lockout expires.
- If the next attempt fails after lockout expiry, another 15-minute lockout immediately applies.
- After a successful login, the counter resets to zero.
- Permanent lockout does not apply.

**Lockout Message:**

The Admin is shown a clear message with dynamically remaining lockout time.

Example: "Too many failed login attempts. Try again in 14 minutes."

### 3.7 Admin Security Logs

Detailed records are maintained for Admin login failures, lockouts, and relevant security events.

**Security Log Fields:**

- Timestamp.
- Event type.
- Failed-attempt count.
- Source IP.
- Lockout start time.
- Lockout end time.
- Event result.
- Successful Admin login/recovery details.

**Security Log Access & Protection:**

- Security logs can only be viewed by the sole Admin.
- Logs are read-only.
- The Admin cannot manually edit or delete logs.
- Security logs are preserved for 1 year.
- After the retention period, they are automatically deleted according to the applicable retention policy.

**Security Log Export:**

- The Admin can export security logs in CSV format.
- The Admin can export all available logs or logs for a selected date range.
- The exported CSV includes complete security details.
- Each export action is separately audit-logged.
- CSV export does not modify or delete the original security logs.

### 3.8 Maintenance Mode

The Admin can enable or disable Maintenance Mode.

**When Maintenance Mode Is Enabled:**

- Guest conversion is unavailable.
- Registered User conversion is unavailable.
- Registered Users cannot log in.
- Registered Users cannot access history or stored files.
- The Admin panel remains accessible.
- An appropriate maintenance message is displayed to users.
- Existing user data is not deleted.
- After Maintenance Mode is disabled, normal website access is restored.

### 3.9 Role-Based Access Restrictions

Each user will only have access to features and data according to their assigned role. Unauthorized access attempts will be denied, and applicable security events will be logged.

---

## 4. Scope & Features

### 4.1 Product Scope

The scope of FazalDataConverter is to provide a web-based tool that enables users to perform two-way conversion between Excel files and JSON data.

The product's primary scope is focused on conversion accuracy, supported workbook data preservation, validation, output verification, file management, and user access management.

The product includes three user types:

1. Guest
2. Registered User
3. Admin

### 4.2 MVP Features (First Release)

The MVP includes conversion functionality along with user account, history, file management, and Admin management features.

#### A. Core Conversion Features

1. **Excel to JSON Conversion**
   - Convert supported Excel files to JSON format.
   - Allow the user to select from available JSON modes.

2. **JSON to Excel Conversion**
   - Convert supported JSON data to Excel format.
   - Generate output according to conversion rules.

3. **Normal Data JSON**
   - Convert Excel data to normal structured JSON format.
   - Preserve supported data values and structure.

4. **Workbook JSON**
   - Preserve supported workbook information and metadata in JSON format.
   - Convert Workbook JSON to Excel according to supported rules.

5. **File Validation**
   - Validate uploaded files and provided JSON data.
   - Identify invalid, corrupt, and unsupported input.

6. **Conversion Error Reporting**
   - Provide information on conversion failures and validation errors.
   - Clearly report unsupported or partially supported features.

7. **Output Verification**
   - 100% verification coverage for officially supported data elements in conversion output.
   - Verify supported values, structure, and metadata according to applicable conversion rules.

8. **File Size and Processing**
   - Maximum input file size of 50 MB per file.
   - Browser processing is the default.
   - Optional server processing is available for eligible large jobs.

9. **Download**
   - Allow downloading the generated conversion output.

#### B. Guest Features

1. Guests can use conversion without logging in.
2. Guests can perform Excel to JSON and JSON to Excel conversion.
3. Guests can immediately download the generated output.
4. Guest conversion history is not saved.
5. Guest output has no permanent server-side storage.
6. Guests cannot access Registered User accounts, history, or files.

#### C. Registered User Features

1. Account access through Google Login.
2. Use conversion functionality.
3. Save and view their own conversion history.
4. Re-download available converted outputs.
5. Manage original uploaded files and converted outputs.
6. Delete individual history entries or clear complete history.
7. Independently delete original files and converted outputs.
8. Account self-deletion capability.

#### D. Admin Features

1. **Single Admin Account**
   - The product will have exactly one Admin account.
   - The Admin account is created securely by the Project Owner during initial setup.
   - Public Admin registration is not available.

2. **Admin Authentication**
   - Admin login through registered email and password.
   - Secure, time-limited password reset link sent to registered email.
   - Temporary account lockout on repeated failed login attempts.

3. **User Account Management**
   - View Registered Users' account details.
   - Suspend and reactivate user accounts.
   - Permanently delete user accounts.

4. **Conversion Monitoring**
   - View users' conversion activity and history metadata.
   - Monitor conversion failures and system issues.
   - Admin history access is limited to metadata.

5. **System Settings**
   - Manage conversion-related configurable settings.
   - Manage file-size and processing limits within the approved maximum limit.
   - Enable and disable Maintenance Mode.

6. **Security Logs**
   - Record Admin login failures, lockouts, and successful login/recovery events.
   - View and export security logs in CSV format.
   - Security logs remain read-only.

7. **Admin Audit Logging**
   - Maintain an audit record of important Admin actions and settings changes.

### 4.3 Later Features (Future Releases)

- Only explicitly planned and confirmed future features will be added to this subsection.
- No additional future features have been confirmed at this time.
- Features that are decided in the future will be marked as [PENDING].
- Speculative or unapproved features will not be included as planned features.

### 4.4 Out-of-Scope Features

- Only explicitly confirmed excluded features will be listed as Out-of-Scope.
- No specific feature has been formally confirmed as Out-of-Scope at this time.
- Exclusions identified in the future will be marked as [PENDING] until the decision is confirmed.
- No feature will be assumed Out-of-Scope without confirmation.

### 4.5 Scope Classification Rules

1. **MVP Features:** Approved features to be delivered in the first release.
2. **Later Features:** Features explicitly planned and confirmed for a future release.
3. **Out-of-Scope:** Features explicitly excluded and confirmed from the product scope.
4. **Pending Items:** Features or exclusions not yet decided will be marked as [PENDING].
5. **Scope Changes:** Any change to MVP, Later Features, or Out-of-Scope will be reviewed and documented through the approved change process.

---

## 5. User Workflows

### 5.1 Guest Conversion Workflow

1. The Guest opens the website and selects the conversion direction:
   - Excel to JSON
   - JSON to Excel
2. The Guest selects/uploads the corresponding input file.
3. The system validates the uploaded file. For invalid, corrupt, or unsupported files, an appropriate error is displayed.
4. For a valid Excel file, the Guest selects the required JSON mode:
   - Normal Data JSON
   - Workbook JSON
5. The Guest clicks the Convert button, and the system starts the conversion process.
6. The system generates the conversion output and verifies the officially supported data elements.
7. After successful conversion, the Guest immediately downloads the generated output.
8. Guest conversion history is not permanently saved, and there is no permanent server-side storage for the output.

### 5.2 Registered User Conversion Workflow

1. The Registered User logs into their account through Google Login.
2. The user selects the conversion direction:
   - Excel to JSON
   - JSON to Excel
3. The user selects/uploads the corresponding input file.
4. The system validates the selected file. For invalid, corrupt, or unsupported files, an appropriate error is displayed.
5. For a valid Excel file, the user selects the required JSON mode:
   - Normal Data JSON
   - Workbook JSON
6. The user clicks the Convert button, and the system starts the conversion process.
7. The system generates the output and verifies the officially supported data elements. After successful conversion, the original uploaded file, converted output, and conversion history entry are automatically saved in the user's account.
8. The user can download the generated output and re-download available output from their conversion history in the future.

### 5.3 Registered User Conversion History Workflow

1. The Registered User logs into their account.
2. The user opens the Conversion History section.
3. The system displays the user's saved conversion history.
4. The user can view details of any history entry and available file information.
5. The user can re-download available converted output.
6. The user can delete individual history entries or clear complete history.
7. The user can independently delete original uploaded files and converted outputs.
8. Deleting a history entry does not automatically delete the original file or converted output. Clearing complete history also leaves stored original files and converted outputs intact.

### 5.4 Workflow Rules

1. The conversion direction is selected before file selection.
2. File validation occurs before the conversion process.
3. Appropriate error information is displayed for invalid, corrupt, and unsupported input.
4. In Excel to JSON conversion, the user selects the JSON mode.
5. After successful Registered User conversion, the original file, converted output, and history are automatically saved.
6. Permanent server-side output storage and conversion history are not available for Guest conversions.
7. Registered User's original files and converted outputs remain stored until deleted by the user.
8. Original files, converted outputs, and history entries are managed independently.

---

## 6. Conversion Requirements

### 6.1 Supported Input Formats

#### A. Excel Input Formats

1. The system will support the following Excel file formats:
   - .xlsx
   - .xls
   - .xlsm
2. Additional Excel formats have not been confirmed yet. They will be kept as [PENDING].

#### B. JSON Input Formats

The system will support general valid JSON structures, including:

1. JSON Objects
2. JSON Arrays
3. Nested Objects
4. Nested Arrays
5. Strings
6. Numbers
7. Boolean Values (true/false)
8. Null Values

The system will not be limited to only arrays of objects.

### 6.2 Excel Workbook and Sheet Handling

1. The system will identify available sheets in the Excel workbook.
2. When the workbook has multiple sheets, a sheet-selection popup will be displayed to the user before conversion.
3. By default, the entire workbook and all its sheets will be selected.
4. The user will have the following selection options:
   - Select the entire workbook.
   - Select specific individual sheets.
   - Convert with multiple selected sheets.
5. The user will decide whether to convert the entire workbook or only selected sheets based on their requirement.
6. Data from selected sheets will be included in the conversion process.
7. Sheet identity and available supported workbook information will be preserved according to applicable JSON conversion rules.

### 6.3 Formula Handling

1. When formulas are present in Excel, the system will preserve formula expressions in the JSON output.
2. The formula key will be present in both JSON modes:
   - Normal Data JSON
   - Workbook JSON
3. When a formula is available, its expression will be stored in the formula key.
4. When a formula is not available, the formula key's value will be null.
5. The formula key will be consistently present in the JSON output, whether or not the Excel cell contains a formula.
6. Formula expressions and available calculated values will be handled according to conversion rules.
7. Formula recalculation behavior is currently [PENDING]. The system preserving formula expressions should not be assumed to mean automatic recalculation.

### 6.4 Styling and Formatting Handling

1. Available supported styling information from Excel will be preserved in the JSON output.
2. A styling key will be present in the JSON output.
3. When styling is available, applicable styling information will be stored in the styling key.
4. When styling is not available, the styling key's value will be null.
5. The styling key will be consistently present in the JSON output, whether or not styling exists on the Excel cell or applicable data element.
6. Supported Excel styling information will be preserved during conversion.
7. In JSON to Excel conversion, available styling information will be handled according to applicable output rules.

### 6.5 Data Editing and Correction

#### A. Before Conversion

1. After file validation, the user will have the ability to review data before conversion.
2. The user can manually edit and correct incorrect values.
3. The user can manually fix broken or invalid data.
4. The user can proceed with conversion using the corrected data.

#### B. After Conversion

1. After successful conversion, the user can review the generated output.
2. The user can edit values and fix incorrect data in the converted output.
3. After changes, the updated output will reflect the latest corrected data.
4. Registered User changes are immediately saved in their conversion history.
5. Subsequent downloads will provide the output with the latest saved values.

### 6.6 Validation and Error Handling

1. The system will validate uploaded Excel files and provided JSON data before conversion.
2. It will identify invalid, corrupt, or unsupported input.
3. The system will clearly report affected data and validation errors.
4. Invalid or broken data will be identified and highlighted for the user.
5. The user will have the ability to manually correct or fix affected data.
6. The user can continue conversion after completing corrections.
7. Unsupported data and partially supported features will be clearly reported.
8. The system will not automatically modify or assume corrections to user data.

### 6.7 Output Generation and Verification

1. The system will generate output according to the selected conversion direction and applicable JSON mode.
2. In Excel to JSON conversion, selected sheets and applicable data conversion rules will be followed.
3. In JSON to Excel conversion, supported JSON structures will be converted to Excel output.
4. Formula and styling keys will be consistently present in the applicable JSON output.
5. Output verification will cover 100% of officially supported data elements.
6. Verification will check supported values, data structure, and supported metadata according to applicable conversion rules.
7. Unsupported and partially supported features will not be included in the 100% accuracy guarantee; they will be clearly reported.
8. After user corrections, the generated and downloaded output should reflect the latest corrected values.

### 6.8 File Size and Processing Rules

1. The maximum input file size is 50 MB per file.
2. Browser processing is the default method.
3. Optional server processing is available for eligible large conversion jobs.
4. Server processing also falls within the approved maximum 50 MB input file limit.

### 6.9 Complex Conversion Rules

1. The formula key and styling key will be consistently present in both JSON modes.
2. When a formula or styling is not available, the respective key's value will be null; the key will not be omitted.
3. The entire workbook is the default selection, but the user can also select specific sheets.
4. The user can correct and edit data both before and after conversion.
5. Registered User changes are immediately saved in the conversion history.
6. Downloaded output will reflect the latest saved corrections and updated values.
7. Unsupported data will not be silently treated as supported data; its information will be clearly provided to the user.
8. Complete output verification coverage will be maintained for officially supported data elements.

---

## 7. Accounts & History

### 7.1 Signup and Login

1. Registered Users access their account through Google Login.
2. On the first successful Google Login, the system automatically creates a Registered User account.
3. On subsequent Google Logins by an existing user, the system accesses their existing account.
4. A separate manual signup form is not required.

### 7.2 Login, Logout, and Session Management

1. A Registered User can log in simultaneously on multiple devices.
2. Each device's login session is managed independently.
3. On logout, only the current device/session is logged out.
4. Active sessions on other devices remain unaffected.
5. When the Admin suspends an account, all of the user's active sessions are immediately revoked.
6. After account reactivation, the user must log in again.

### 7.3 Conversion History

1. Registered User's successful conversions are automatically saved in their account history.
2. The Conversion History displays the following information:
   - Original file name.
   - File size.
   - Conversion direction/type.
   - Selected JSON mode, where applicable.
   - Conversion date and time.
   - Conversion status.
3. The user can view their saved conversion history.
4. Download options for available original files and converted outputs are available in the history.
5. The user can delete individual history entries or clear complete history.
6. Deleting a history entry or clearing complete history does not automatically delete original files and converted outputs.

### 7.4 Saved Files Management

1. Original uploaded files and converted outputs are independently stored and managed in the user's account.
2. The user can independently download or delete the original uploaded file.
3. The user can independently download or delete the converted output.
4. Deleting the original file leaves the converted output unaffected.
5. Deleting the converted output leaves the original uploaded file unaffected.
6. After a file is deleted, its history metadata is retained, but the download option for the deleted file becomes unavailable.

### 7.5 File Retention and Download Rules

1. Registered User's original uploaded files and converted outputs remain stored until the user deletes them.
2. No automatic 24-hour, 7-day, or 30-day expiry applies to files.
3. The user can re-download available original files and converted outputs.
4. If the user edits or fixes data after conversion, changes are immediately saved in the conversion history.
5. Subsequent downloads provide the converted output with the latest saved values.
6. Original files, converted outputs, and history metadata are managed independently.

### 7.6 Account and Data Deletion

1. A Registered User can permanently delete their account.
2. Re-authentication and explicit final confirmation are required before account self-deletion.
3. Confirmed account deletion is immediate and permanent.
4. On account deletion, the user account, conversion history, original uploaded files, and converted outputs are permanently deleted.
5. Required security and audit records may be separately retained according to the applicable retention policy.

---

## 8. Admin Requirements

### 8.1 Admin Dashboard

- The dashboard displays the total count of Registered Users and active/suspended accounts.
- Statistics for total conversions, successful conversions, and failed conversions are displayed.
- Separate statistics for Excel to JSON and JSON to Excel conversions are available.
- An overview of recent conversion activity and recent failures is displayed.
- Current system status and Maintenance Mode status are visible on the dashboard.

### 8.2 User Management

- The Admin can view a list of all Registered Users and their account details.
- User account status — Active, Suspended, or Deleted — is displayed.
- The Admin can view user-wise conversion activity and conversion history metadata.
- Search, filtering, and sorting facilities are available in the user list.
- The Admin can suspend, reactivate, and permanently delete accounts according to existing permissions.

> **Note:** The Admin does not have permission to access users' original uploaded files or converted content.

### 8.3 Conversion Jobs & Failures

- The Admin can view a list of conversion jobs including file name, file size, conversion type, and applicable JSON mode.
- The status and date/time of each conversion job is displayed.
- Jobs can be filtered by status, conversion type, and date.
- Failed conversion jobs display the failure reason and error category.
- The Admin can monitor user/account-wise conversion activity but cannot access original files or converted content.

### 8.4 Reports & Logs

- The Admin can view conversion success and failure reports.
- Separate reports for Excel to JSON and JSON to Excel conversions are available.
- Reports can be filtered by date range and conversion type.
- Reports on system failures and reported issues are available to the Admin.
- The Admin can export conversion and system reports in CSV format.

> **Note:**
> - Conversion/system report export is separate from the existing security-log CSV export.
> - Security logs' existing read-only access, one-year retention, CSV export, and audit-logging rules remain according to Section 3.

### 8.5 Permissions & Admin Security

- There is exactly one Admin account in the system. Admin access is controlled according to existing permission-based rules.
- Explicit confirmation is required before permanent Registered User account deletion.
- Explicit confirmation is required before enabling or disabling Maintenance Mode.
- Explicit confirmation is required before changing sensitive system settings.
- Important Admin actions are recorded in the audit log.

> **Note:**
> - Admin authentication, password recovery, failed-login lockout, security logs, account-management permissions, and other security controls will be implemented according to the requirements defined in Section 3.
> - The Admin cannot access users' original uploaded files or converted content.

---

## 9. Security & Privacy

### 9.1 User Consent

- Both Guest and Registered User must accept the Privacy Policy and Terms of Use before their first conversion.
- Conversion will not start without user consent.
- The system will maintain a record of user consent.
- If material changes are made to the Privacy Policy or Terms of Use, updated consent will be obtained from users.

### 9.2 File Access & User Data Isolation

- A Registered User can only access their own uploaded files, converted outputs, and conversion history.
- One user cannot view, download, edit, or delete another user's data.
- Each uploaded file, converted output, and history record is associated with the correct user account.
- Unauthorized data access requests are denied.
- The Admin receives only approved conversion metadata access; they have no access to original files or converted content.

### 9.3 File Retention & Temporary Data Cleanup

- Guest conversion temporary files are automatically deleted after conversion is complete.
- Registered User temporary processing files are automatically deleted after successful conversion and permanent storage.
- Temporary files from failed or cancelled conversions are also automatically cleaned.
- Registered User permanently saved original files and converted outputs remain stored until the user deletes them.

### 9.4 Data Deletion & Backup

- User-deleted files and converted outputs are permanently deleted from active storage.
- On account self-deletion, account-related files, converted outputs, and conversion history are permanently deleted.
- Deleted data present in backup copies is also permanently removed according to the defined backup cleanup cycle.
- Required security and audit records may be retained according to their separately approved retention policy.

### 9.5 User Data Usage & Privacy

- Uploaded files and conversion content are used only for the requested conversion and related user-facing features.
- User data is not used for advertising or unrelated purposes.
- User files and converted content are not shared with third parties, except for necessary service processing under approved privacy terms.
- Required activity metadata may be used for system monitoring.

---

## 10. UI/UX Expectations

### 10.1 Responsive Layout

- The application will be usable on desktop, laptop, tablet, and mobile across all screen sizes.
- The layout will automatically adjust according to screen size.
- Forms, tables, file upload, and conversion controls will remain accessible on small screens.
- Horizontal overflow and overlapping elements will be avoided.

### 10.2 Processing Status & User Feedback

- Clear statuses for file validation, processing, and conversion will be displayed to users.
- During processing, a loading indicator and progress information (where available) will be displayed.
- On successful conversion, a clear success message and download option will be provided.
- On failed or cancelled conversion, a clear status and next action will be shown.
- Duplicate submissions and unnecessary repeated actions will be prevented.

### 10.3 Error Messages & Recovery

- Error messages will be in simple and understandable language.
- The reason for the error and the affected file/data will be identified.
- Invalid or unsupported data will be clearly highlighted.
- The user will be informed of possible corrective actions.
- After correction, the user can retry the conversion.

### 10.4 Accessibility & Usability

- Main features and controls can be operated via keyboard.
- Text, buttons, and controls will be readable and clearly identifiable.
- Errors and status will not be communicated only through color; text indicators will also be available.
- Forms and upload controls will have clear labels and instructions.
- Important controls and status information will be accessible to screen readers.

### 10.5 Global Visual Design & Colour System

The application follows a single, consistent, premium SaaS design system inspired by Apple-inspired minimalism and Google Antigravity futuristic gradients. The interface is clean, white-first, with rich indigo/violet accents, subtle pink highlights, and soft ambient glows.

#### A. Design System Identity & Rules
- **Clean white-first interface:** Main workspace uses `#F8F9FC`, with cards, dialogs, forms, and tables on pure `#FFFFFF`.
- **Selective gradients:** Gradients are reserved for primary conversion CTAs, high-priority actions, and subtle ambient glows; never overused.
- **Consistent token usage:** The same design tokens apply across the entire project (Guest, Registered User, and Admin views).
- **Preserved layouts:** Screen layouts and workflows remain strictly aligned with the PRD and Figma UI designs (`FIGMA.zip`).

#### B. Primary & Secondary Palettes
- **Primary Brand (Indigo):** Primary `#5145E5`, Deep `#3730A3`, Dark `#4338CA`, Bright `#6366F1`, Light `#818CF8`, Soft `#EEF2FF`, Surface `#E0E7FF`, Border `#C7D2FE`.
- **Secondary Brand (Violet):** Secondary `#7C3AED`, Deep `#5B21B6`, Dark `#6D28D9`, Bright `#9333EA`, Light `#A78BFA`, Soft `#F5F0FF`, Surface `#EDE9FE`, Border `#DDD6FE`.
- **Supporting Accents:**
  - **Blue:** Blue `#3B82F6`, Deep `#1D4ED8`, Light `#93C5FD`, Soft `#EFF6FF`, Border `#BFDBFE`.
  - **Cyan:** Cyan `#06B6D4`, Deep `#0891B2`, Light `#67E8F9`, Soft `#ECFEFF`, Border `#A5F3FC`.
  - **Pink:** Pink `#EC4899`, Deep `#DB2777`, Light `#F9A8D4`, Soft `#FDF2F8`, Border `#FBCFE8`.

#### C. Surfaces & Backgrounds
- **App Background / Main Canvas:** `#F8F9FC`
- **Primary Surface:** `#FFFFFF`
- **Secondary Surface:** `#F5F6FC`
- **Tertiary Surface:** `#F0F2F8`
- **Cool Surface:** `#F0F3FF`
- **Violet Surface:** `#F6F1FF`
- **Muted Surface:** `#F3F4F6`
- **Inverse Surface:** `#151525`

#### D. Typography & Text Hierarchy
- **Text Primary:** `#151525` (main headings and content)
- **Text Secondary:** `#55566F` (descriptions and subtitles)
- **Text Muted:** `#85869B` (supporting text and icons)
- **Text Subtle:** `#A1A1B5` (placeholders and tertiary text)
- **Text Disabled:** `#B8BAC9`
- **Text Inverse:** `#FFFFFF`
- **Text Brand Link:** `#4F46E5` (Hover: `#3730A3`)

#### E. Buttons & Interactive Controls
- **Primary Button:** Background `#5145E5`, Hover `#4338CA`, Active `#3730A3`, Text `#FFFFFF`, Focus Ring `#A5B4FC`.
- **Secondary Button:** Background `#FFFFFF`, Hover `#F5F6FC`, Active `#EEF2FF`, Text `#3730A3`, Border `#E6E8F0`.
- **Outline Button:** Background `#FFFFFF`, Text `#5145E5`, Border `#C7D2FE`, Hover Background `#EEF2FF`.
- **Ghost Button:** Transparent Background, Hover `#F5F6FC`, Text `#55566F`, Hover Text `#3730A3`.
- **Destructive Button:** Background `#DC2626`, Hover `#B91C1C`, Active `#991B1B`, Text `#FFFFFF`.
- **Signature Gradient Button:** `linear-gradient(120deg, #4F46E5 0%, #7C3AED 48%, #A855F7 100%)` (Hover: `#4338CA` to `#9333EA`, Text `#FFFFFF`) for primary conversion CTAs.

#### F. Forms, Inputs, Dropzones & Modals
- **Inputs:** White background, `#151525` text, `#85869B` placeholder, `#E6E8F0` border, `#6366F1` focus border, `#C7D2FE` focus ring.
- **Dropzone (File Upload):** Soft `#F6F5FF` background, `#C7D2FE` border, `#3730A3` text, `#6366F1` icon. Hover: `#EEF2FF` / `#818CF8`. Drag Active: `#E0E7FF` / `#5145E5`.
- **Cards & Dialogs:** Pure `#FFFFFF` background, `#E6E8F0` border, `#151525` title, `#55566F` description, modal overlay `rgba(21, 21, 37, 0.50)`.
- **Tables & Data Grids:** `#FFFFFF` background, `#F8F9FC` header with `#55566F` text, `#E6E8F0` subtle borders, row hover `#F8F9FC`, selected row `#EEF2FF` with `#3730A3` text. Tabular numerals for numeric data.

#### G. Semantic Badges, Status & Alerts
- **Success:** Background `#ECFDF5`, Text `#047857`, Border `#A7F3D0`, Icon `#10B981`.
- **Warning:** Background `#FFFBEB`, Text `#B45309`, Border `#FDE68A`, Icon `#F59E0B`.
- **Error / Failed:** Background `#FEF2F2`, Text `#B91C1C`, Border `#FECACA`, Icon `#EF4444`.
- **Information:** Background `#EFF6FF`, Text `#1D4ED8`, Border `#BFDBFE`, Icon `#3B82F6`.
- **Processing:** Background `#EEF2FF`, Text `#4338CA`, Border `#C7D2FE`, Icon `#6366F1`.
- **Neutral:** Background `#F3F4F6`, Text `#4B5563`, Border `#E5E7EB`, Icon `#6B7280`.

#### H. Approved Gradient Library
- **Gradient 1 (Signature Brand):** `linear-gradient(120deg, #4F46E5 0%, #7C3AED 48%, #A855F7 100%)`
- **Gradient 2 (Electric Blue Violet):** `linear-gradient(135deg, #2563EB 0%, #6366F1 48%, #9333EA 100%)`
- **Gradient 3 (Aurora):** `linear-gradient(120deg, #6366F1 0%, #8B5CF6 35%, #D946EF 68%, #38BDF8 100%)`
- **Gradient 4 (Soft Lavender):** `linear-gradient(135deg, #EEF2FF 0%, #F5F0FF 55%, #FDF2F8 100%)`
- **Gradient 5 (Ice Blue):** `linear-gradient(135deg, #EFF6FF 0%, #ECFEFF 50%, #F0FDFA 100%)`
- **Gradient 6 (Deep Premium):** `linear-gradient(135deg, #312E81 0%, #4F46E5 50%, #7C3AED 100%)`
- **Gradient 7 (Indigo Cyan):** `linear-gradient(120deg, #4F46E5 0%, #3B82F6 55%, #06B6D4 100%)`
- **Gradient 8 (Violet Pink):** `linear-gradient(120deg, #7C3AED 0%, #A855F7 55%, #EC4899 100%)`
- **Gradient 9 (White Lavender):** `linear-gradient(180deg, #FFFFFF 0%, #F8F9FC 100%)`
- **Gradient 10 (Ambient Glow):** `radial-gradient(ellipse at top left, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0) 55%)`

### 10.6 Unified Typography System (Inter Only)

**Inter is the ONLY font family used across the entire FazalDataConverter project without exception.** Plus Jakarta Sans is completely removed.

#### A. Typography Rules
- Use Inter everywhere: headings, body text, sidebar, navigation, buttons, inputs, tables, cards, dialogs, Admin Panel, and User Panel.
- Do not introduce any other font family.
- Use tabular numerals (`tnum`) for file sizes, timestamps, row counts, and numeric grid data.
- Strict adherence to WCAG 2.2 AA contrast standards. Status is never indicated by color alone.

#### B. Typography Scale

| Style | Font Family | Size | Weight | Line Height | Letter Spacing |
|---|---|---:|---:|---:|---:|
| Display Large | Inter | 36px | 700 | 44px | -0.02em |
| Display Large Mobile | Inter | 28px | 700 | 36px | -0.02em |
| Headline Large | Inter | 28px | 600 | 36px | -0.015em |
| Headline Medium | Inter | 22px | 600 | 30px | -0.01em |
| Headline Small | Inter | 18px | 600 | 26px | -0.005em |
| Body Large | Inter | 16px | 400 | 24px | Normal |
| Body Medium | Inter | 14px | 400 | 20px | Normal |
| Body Small | Inter | 13px | 400 | 18px | Normal |
| Label Large | Inter | 14px | 500 | 20px | 0.005em |
| Label Medium | Inter | 12px | 500 | 16px | 0.02em |
| Label Small | Inter | 11px | 600 | 14px | 0.04em |

> **Note:** The visual source of truth for all screen layouts is the Figma design archive (`FIGMA.zip`), strictly aligned with this unified Inter typography and global colour token system.

---

## 11. Non-Functional Needs

### 11.1 Performance & Speed

- Conversion of supported files up to 10 MB should complete within 10 seconds in the documented test environment.
- Conversion of supported files up to 50 MB should complete within 60 seconds in the documented test environment.
- Upload and download time is not included in the processing-time measurement.

### 11.2 Reliability & Accuracy

- A minimum 99% success rate should be achieved for eligible conversion attempts.
- 100% verification coverage should be achieved for officially supported data elements.
- Invalid, unsupported, and user-cancelled attempts are excluded from the success-rate calculation.

### 11.3 Supported File-Size Limits

- The maximum input file size is 50 MB per file.
- The Admin can adjust the configurable file-size limit within the 50 MB maximum cap.
- Browser processing is the default; optional server processing is available for eligible large jobs.

### 11.4 Usability & Accessibility

- The application should be usable on desktop, laptop, tablet, and mobile devices.
- Accessibility requirements should follow WCAG 2.1 Level AA.
- Main workflows will be keyboard-operable, and important status/error messages will be accessible to screen readers.

### 11.5 Availability

- The minimum monthly availability target for the application is 99.5%.
- Availability will be measured on a monthly basis.
- Approved scheduled maintenance windows will be excluded from availability measurement.

---

## 12. Acceptance Criteria

### 12.1 Excel ↔ JSON Conversion

- Supported .xlsx, .xls, and .xlsm files should convert successfully to JSON.
- Valid JSON objects, arrays, and nested data should convert successfully to Excel.
- Both Normal Data JSON and Workbook JSON modes should produce expected output.
- Officially supported values, structure, and metadata should be preserved and verified according to conversion rules.
- On invalid, corrupt, or unsupported input, a clear error should be displayed, and incorrect successful output should not be generated.

### 12.2 Validation & Data Editing

- The system should identify and highlight invalid or broken data.
- The user should be able to manually correct/fix data before conversion.
- Before Workbook JSON conversion, the user should be able to select the entire workbook or specific sheets.
- The user should be able to edit/fix values in the converted output after conversion.
- Registered User edits should be saved immediately, and subsequent downloads should have the latest saved values available.

### 12.3 Accounts, History & File Management

- A Registered User account should be automatically created on the first successful Google sign-in.
- Registered User's successful conversions should be automatically saved in the account history.
- Original files and converted outputs should be independently downloadable and deletable.
- Deleting a history entry or clearing complete history should not delete saved original files and converted outputs.
- After account self-deletion, the account, history, original files, and converted outputs should be permanently deleted, subject to separately retained required security/audit records.

### 12.4 Admin Panel & Security

- Only the authorized single Admin account should be able to log in and access the Admin Panel.
- Admin dashboard, user management, and conversion monitoring should work according to approved permissions.
- The Admin should be able to view and use approved CSV export functionality for conversion/system reports and security logs.
- Explicit confirmation should be required before permanent account deletion, Maintenance Mode enable/disable, and sensitive system settings changes.
- Important Admin actions should be recorded in the audit log.

### 12.5 Security, Privacy & Non-Functional Requirements

- Registered Users should not be able to access each other's files, converted outputs, or history.
- Temporary files should be deleted according to approved automatic cleanup rules.
- User consent, data deletion, backup cleanup, and privacy requirements should work according to approved policies.
- Performance targets should be met: supported files up to 10 MB should convert within 10 seconds, and supported files up to 50 MB should convert within 60 seconds; upload/download time is excluded.
- The eligible conversion success rate should be a minimum of 99%, monthly availability should be a minimum of 99.5%, and the accessibility target should be WCAG 2.1 Level AA conformance.

---

## 13. Open Questions

### 13.1 Additional Supported Excel Formats

- Currently confirmed formats: .xlsx, .xls, and .xlsm.
- Whether to support additional Excel formats beyond these is a pending decision.
- **Owner:** [NOT ASSIGNED]
- **Target Resolution Date:** [NOT DECIDED]

### 13.2 Formula Recalculation Behavior

- The formula key will always be present in both Normal Data JSON and Workbook JSON modes.
- When a formula expression is available, it will be preserved; when absent, the value will be null.
- Whether formulas should be automatically recalculated during conversion is a pending decision.
- **Owner:** [NOT ASSIGNED]
- **Target Resolution Date:** [NOT DECIDED]

### 13.3 Guest Edited-Data Persistence

- Permanent server-side output storage and conversion history are not available for Guest conversions.
- The persistence of data edited during Guest conversion and subsequent download behavior has not been decided yet.
- **Owner:** [NOT ASSIGNED]
- **Target Resolution Date:** [NOT DECIDED]
