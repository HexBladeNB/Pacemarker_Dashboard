# Pacemaker Dashboard Frontend Implementation Plan

## Goal
Create a cool, professional, and medically aesthetic frontend dashboard to visualize pacemaker patient data. The dashboard will be a static web application located in `dashboard_ui/` and will consume JSON data from `patient_records/`.

## User Review Required
> [!NOTE]
> The dashboard will use a generated `index.json` file to list patients, as static web pages cannot scan local directories. A Python script will be created to generate this index.

## Proposed Changes

### 1. Data Indexing Script
Create a script to scan existing patient records and generate a summary index for the frontend to consume.

#### [NEW] [backend/scripts/generate_patient_index.py](file:///E:/Gemini CLI 实战/Pacemarker_Dashboard/backend/scripts/generate_patient_index.py)
- **Functionality**:
    - Scans `patient_records/*.json`.
    - Extracts `姓名`, `登记号`, `程控次数` and the latest device model/brand.
    - Saves the list to `dashboard_ui/data/patient_index.json`.

### 2. Frontend Application (`dashboard_ui/`)
Create the frontend application in the root directory.

#### [NEW] [dashboard_ui/index.html](file:///E:/Gemini CLI 实战/Pacemarker_Dashboard/dashboard_ui/index.html)
- Main entry point.
- Layout: Sidebar (Patient List & Search), Main Content Area (Patient Details), Tab System (Overview, Trends, Records).

#### [NEW] [dashboard_ui/assets/css/style.css](file:///E:/Gemini CLI 实战/Pacemarker_Dashboard/dashboard_ui/assets/css/style.css)
- **Theme**: Dark Medical Aesthetic (Deep Blue/Black background, Cyan/Teal accents).
- **Features**: Glassmorphism cards, neon glows for critical values, responsive grid.
- **Typography**: Clean, sans-serif (Inter/SF Pro/Roboto).

#### [NEW] [dashboard_ui/assets/js/app.js](file:///E:/Gemini CLI 实战/Pacemarker_Dashboard/dashboard_ui/assets/js/app.js)
- **Data Loading**: Fetches `data/patient_index.json` on load.
- **Interaction**: Handles patient selection, searching, and rendering of patient details.
- **Visualization**: Prepares data for charts (e.g., Threshold trends over time).

#### [NEW] [dashboard_ui/assets/js/charts.js](file:///E:/Gemini CLI 实战/Pacemarker_Dashboard/dashboard_ui/assets/js/charts.js)
- Wraps Chart.js (via CDN) to render trend lines for:
    - Battery Voltage
    - Lead Impedance
    - Pacing Thresholds

## Verification Plan

### Automated Tests
- None for the frontend code itself (visual).
- Run `python backend/scripts/generate_patient_index.py` and verify `dashboard_ui/data/patient_index.json` is created and valid.

### Manual Verification
1.  **Run Indexer**: Execute the new Python script to generate the data index.
2.  **Launch Dashboard**: Open `dashboard_ui/index.html` in a browser (may leverage a simple Python HTTP server `python -m http.server` if file protocol restricts fetching).
3.  **UI Check**:
    -   Verify the patient list loads.
    -   Click a patient -> Verify details appear.
    -   Check "Cool Factors": Animations, dark mode colors, layout.
    -   Verify charts display data correctly (if multi-record patients exist).
