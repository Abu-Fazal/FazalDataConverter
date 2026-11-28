export const PRODUCT_SUMMARY =
  'FazalDataConverter is a web-based converter for Excel and JSON data. It converts .xlsx, .xls, and .xlsm workbooks to Normal Data JSON or metadata-preserving Workbook JSON, and converts JSON back to Excel. Every supported data element is verified before delivery.';

export const CONVERSION_MATRIX = [
  {
    from: 'Excel (.xlsx, .xls, .xlsm)',
    to: 'Normal Data JSON',
    notes: 'Row-oriented JSON output with the formula key always present.',
  },
  {
    from: 'Excel (.xlsx, .xls, .xlsm)',
    to: 'Workbook JSON',
    notes: 'Metadata-preserving output with whole-workbook or per-sheet selection.',
  },
  {
    from: 'Normal or Workbook JSON',
    to: 'Excel (.xlsx)',
    notes: 'Rebuilds worksheets from supported JSON values and structure.',
  },
  {
    from: 'Excel (.xlsx, .xls, .xlsm)',
    to: 'BSON',
    notes: 'Serializes supported sheet data into binary BSON documents.',
  },
  {
    from: 'Static JavaScript data',
    to: 'JSON',
    notes: 'Data-only extraction. Dynamic code and functions are never executed.',
  },
];

export const DEFINITIONS = [
  {
    term: 'Normal Data JSON',
    definition:
      'A row-oriented JSON output where each sheet becomes an array of records. The formula key is always present so formulas stay identifiable in the output.',
  },
  {
    term: 'Workbook JSON',
    definition:
      'A metadata-preserving JSON output that keeps workbook structure such as sheet order, dimensions, and supported cell metadata alongside values and formulas.',
  },
  {
    term: 'Data Only Mode',
    definition:
      'A safety rule that blocks macros, embedded scripts, and dynamic code from running. Unsupported input is reported in the validation result instead of being guessed.',
  },
  {
    term: 'Ownership validation',
    definition:
      'A server-side check that limits every account to its own uploaded files, converted outputs, and conversion history.',
  },
];

export const HOW_IT_WORKS = [
  {
    name: 'Choose a direction and upload',
    text: 'Select Excel to JSON, JSON to Excel, Excel to BSON, or static JavaScript extraction, then drag in a supported file. Guests can convert without an account.',
  },
  {
    name: 'Pick conversion options',
    text: 'Choose Normal Data JSON or Workbook JSON, select whole-workbook or specific sheets, and review the data-processing consent notice.',
  },
  {
    name: 'Convert, verify, and download',
    text: 'The engine validates the file, converts within the size targets, verifies supported elements, and gives you the output to download. Signed-in users can reopen results from history.',
  },
];

export const HOME_FAQS = [
  {
    question: 'What is FazalDataConverter?',
    answer:
      'FazalDataConverter is a web-based tool that converts Excel workbooks (.xlsx, .xls, .xlsm) to Normal Data JSON or Workbook JSON and converts JSON back to Excel. It also supports Excel to BSON and data-only extraction from static JavaScript files.',
  },
  {
    question: 'Do I need an account to convert files?',
    answer:
      'No. Guests can run Excel to JSON and JSON to Excel conversions and download the result immediately. An account is only needed for saved conversion history and account features.',
  },
  {
    question: 'Which file formats and sizes are supported?',
    answer:
      'Supported inputs are .xlsx, .xls, and .xlsm workbooks, JSON, BSON, and static JavaScript data. The maximum input size is 50 MB per file.',
  },
  {
    question: 'How fast is a conversion?',
    answer:
      'In the documented test environment, supported files up to 10 MB convert within 10 seconds and files up to 50 MB convert within 60 seconds. Upload and download time is excluded from these targets.',
  },
  {
    question: 'Does FazalDataConverter run macros or scripts?',
    answer:
      'No. Macros, embedded scripts, and dynamic code are never executed. Static JavaScript extraction reads approved data only, and unsupported input is reported rather than guessed.',
  },
  {
    question: 'What happens to my files?',
    answer:
      'Each account can access only its own uploads, outputs, and history through server-side ownership checks. Temporary processing files are deleted after conversion, failure, or cancellation, and uploaded files are never used for advertising.',
  },
  {
    question: 'How is output accuracy verified?',
    answer:
      'Every officially supported data element is checked for values, structure, and supported metadata before delivery. Unsupported or partially supported features are clearly reported and are not covered by the accuracy guarantee.',
  },
];