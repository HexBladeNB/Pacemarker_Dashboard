/**
 * app.js - Main Controller for Pacemaker Dashboard
 */

// State
let allPatients = [];
let currentPatient = null;
let currentTab = 'overview';

// Elements
const elList = document.getElementById('patientList');
const elSearch = document.getElementById('patientSearch');
const elCount = document.getElementById('patientCount');
const elEmpty = document.getElementById('emptyState');
const elDetail = document.getElementById('patientDetail');
const elTabs = document.querySelectorAll('.tab-btn');
const elPanes = document.querySelectorAll('.tab-pane');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Ensure charts are ready
    if (window.initCharts) window.initCharts();

    // Check for data bundle with a small delay to allow script parsing
    setTimeout(loadIndex, 50);

    setupEventListeners();
});

// --- Data Loading ---

function loadIndex() {
    try {
        if (!window.PACEMAKER_DATA) {
            throw new Error('Data bundle not found. Please run dashboard_ui/scripts/generate_data.py');
        }
        allPatients = window.PACEMAKER_DATA.index;
        renderList(allPatients);
    } catch (err) {
        console.error(err);
        elList.innerHTML = `<div class="error" style="padding:20px; color:var(--accent-rose)">Error loading data.<br>Make sure data_bundle.js exists.<br>${err.message}</div>`;
    }
}

function loadPatientDetails(filename) {
    try {
        // Fetch from global object instead of file fetch
        const data = window.PACEMAKER_DATA.records[filename];

        if (!data) throw new Error('Record not found in bundle');

        // Parse and Normalize Data
        currentPatient = parsePatientData(data);
        renderPatient(currentPatient);

        // Update Charts
        if (window.updateCharts) {
            window.updateCharts(currentPatient.history);
        }

        // Show UI
        elEmpty.classList.add('hidden');
        elDetail.classList.remove('hidden');

    } catch (err) {
        console.error(err);
        alert('Could not load patient data: ' + err.message);
    }
}

// --- Data Parsing ---

function parsePatientData(json) {
    const rawRecords = json['程控记录'] || [];

    // Convert records to a cleaner format
    const history = rawRecords.map(r => {
        const h = r.header || {};
        const basic = r.basic_params || {};
        const test = r.test_params || {};
        const meas = basic.measurements || {};
        const thresh = test.threshold_tests || {};
        const batt = test.battery_and_leads || {};
        const events = r.events_and_footer || {};
        const meta = r.meta || {};
        const footerMeta = r.footer_meta || {};

        // Helper to safe parse floats
        const f = (val) => {
            if (!val) return null;
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
        };

        // Priority: footer_meta.程控日期 > meta.程控日期 > fallback to implant date
        const rawVisitDate = footerMeta['程控日期'] || meta['程控日期'] || null;
        const rawImplantDate = h['植入日期'] || null;

        return {
            // Visit (program control) date
            dateStr: rawVisitDate ? formatDate(rawVisitDate) : 'Unknown',
            timestamp: rawVisitDate ? parseToTimestamp(rawVisitDate) : 0,
            // Implant date (separate)
            implantDateStr: rawImplantDate ? formatDate(rawImplantDate) : '--',
            header: h,
            mode: basic.settings?.['模式'] || '--',
            lowerRate: basic.settings?.['低限频率（次/分）'] || '--',
            upperRate: basic.settings?.['上限跟踪频率（次/分）'] || '--',

            // Battery
            battery: {
                voltage: f(batt['电池电压（V）']),
                life: batt['预估寿命'] || '--',
                status: batt['电池状态'] || 'OK'
            },

            // Events - Deep extraction from all possible field names
            events: {
                // Mode Switch / AMS
                ams_count: events['模式转换次数'] || events['房室传导模式转换（%）'] || events['运动模式转换（%）'] || null,
                ams_duration: events['持续最长时间'] || null,

                // AT/AF Load
                ataf_load: events['AT/AF负荷%'] || events['AT/AF负荷'] || null,
                ataf_count: events['AT/AF事件次数'] || null,
                ataf_desc: events['快心房率事件说明'] || events['AT/AF事件说明'] || null,

                // VT/Fast Ventricular
                vt_count: events['快心室率次数'] || events['快心室率事件次数'] || null,
                vt_desc: events['快心室率事件说明'] || events['快心室率说明'] || null,

                // Other
                other: events['其余事件'] || events['其他事件'] || null,

                // Footer
                conclusion: events['结论'] || '无记录',
                next_visit: events['建议下次程控时间'] || '未指定'
            },

            // Thresholds (V) - Keep raw string for display (may contain > < symbols)
            rv_threshold: thresh['右心室_阈值'] || '--',
            lv_threshold: thresh['左心室_阈值'] || '--',
            ra_threshold: thresh['心房_阈值'] || '--',

            // Impedance (Ohms) - Keep raw string
            rv_impedance: thresh['右心室_阻抗'] || '--',
            lv_impedance: thresh['左心室_阻抗'] || '--',
            ra_impedance: thresh['心房_阻抗'] || '--',

            // Sensing (mV) - Keep raw string
            rv_sense: thresh['右心室_感知'] || '--',
            lv_sense: thresh['左心室_感知'] || '--',
            ra_sense: thresh['心房_感知'] || '--',

            // Output settings from measurements
            rv_output: meas['右心室_输出电压'] ? `${meas['右心室_输出电压']}V/${meas['右心室_输出脉宽'] || '?'}ms` : '--',
            ra_output: meas['心房_输出电压'] ? `${meas['心房_输出电压']}V/${meas['心房_输出脉宽'] || '?'}ms` : '--',
            lv_output: meas['左心室_输出电压'] ? `${meas['左心室_输出电压']}V/${meas['左心室_输出脉宽'] || '?'}ms` : '--',

            measurement_raw: meas,
            settings_raw: basic.settings || {},
            thresholds_raw: thresh,
            battery_raw: batt,
            events_raw: events,
            header_raw: h,
            footer_meta_raw: footerMeta
        };
    });

    // Sort by Date Descending
    history.sort((a, b) => b.timestamp - a.timestamp);

    // Get latest brand/model
    const latestRec = history.length > 0 ? history[0] : null;

    return {
        id: json['登记号'],
        name: json['姓名'],
        brand: latestRec ? latestRec.header['品牌'] : 'Unknown',
        model: latestRec ? latestRec.header['型号'] : 'Unknown',
        implantDate: latestRec ? latestRec.implantDateStr : '--',
        history: history,
        file_name: json.file_name // Pass through for reference
    };
}

// Helper: Excel Serial Date to JS Date
function parseToTimestamp(dateInput) {
    if (!dateInput) return 0;

    // Check if it's an Excel serial number (e.g. 44894)
    if (/^\d{5}$/.test(dateInput)) {
        // Excel base date is Dec 30, 1899
        const date = new Date((dateInput - 25569) * 86400 * 1000);
        return date.getTime();
    }

    // Try standard parsing
    let str = String(dateInput).replace(/\./g, '-').replace(/年|月/g, '-').replace(/日|号/g, '');
    const ts = Date.parse(str);
    return isNaN(ts) ? 0 : ts;
}

function formatDate(dateInput) {
    if (!dateInput) return 'Unknown Date';

    let dateObj;

    // Excel Serial
    if (/^\d{5}$/.test(dateInput)) {
        dateObj = new Date((dateInput - 25569) * 86400 * 1000);
    } else {
        // Standard String
        let str = String(dateInput).replace(/\./g, '-').replace(/年|月/g, '-').replace(/日|号/g, '');
        const ts = Date.parse(str);
        if (isNaN(ts)) return dateInput; // Return original if parse fails
        dateObj = new Date(ts);
    }

    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// --- UI Rendering ---

function renderList(patients) {
    elList.innerHTML = '';
    elCount.textContent = patients.length;

    patients.forEach(p => {
        const item = document.createElement('div');
        item.className = 'patient-item';
        item.innerHTML = `
            <div class="patient-avatar">${p.name[0]}</div>
            <div class="patient-meta">
                <span class="patient-name">${p.name}</span>
                <span class="patient-id">ID: ${p.id}</span>
            </div>
        `;
        item.addEventListener('click', () => {
            // Highlight active
            document.querySelectorAll('.patient-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            loadPatientDetails(p.file_name);
        });
        elList.appendChild(item);
    });
}

function renderPatient(patient) {
    // Use first record (sorted DESC, so this is the latest)
    const lat = patient.history && patient.history.length > 0 ? patient.history[0] : null;
    if (!lat) return;

    // Header
    document.getElementById('pName').textContent = patient.name;
    document.getElementById('pId').textContent = `ID: ${patient.id}`;
    document.getElementById('dBrand').textContent = patient.brand;
    document.getElementById('dModel').textContent = patient.model;
    document.getElementById('dDate').textContent = patient.implantDate;

    // Overview Tab
    // Battery
    const v = lat.battery.voltage;
    document.getElementById('batStatus').textContent = v !== null ? v.toFixed(2) : '--';
    const batLife = lat.battery.life;
    document.getElementById('batLife').textContent = batLife ? `预估剩余: ${batLife}` : '预估剩余: --';
    const batInd = document.getElementById('batIndicator');

    // Simple Battery Color Logic
    if (v && v < 2.6) batInd.style.backgroundColor = 'var(--accent-rose)';
    else if (v && v < 2.8) batInd.style.backgroundColor = 'var(--accent-amber)';
    else batInd.style.backgroundColor = 'var(--accent-teal)';

    // Mode
    document.getElementById('pacingMode').textContent = lat.mode;
    document.getElementById('lowerRate').textContent = lat.lowerRate;
    document.getElementById('upperRate').textContent = lat.upperRate;

    // Summary Card
    document.getElementById('visitConclusion').textContent = lat.events.conclusion || '无记录';
    document.getElementById('nextVisitDate').textContent = lat.events.next_visit || '未指定';

    // Events Card - using new deep extracted fields
    const ev = lat.events;

    // AMS / Mode Switch
    let amsDisplay = '无';
    if (ev.ams_count) {
        amsDisplay = ev.ams_count;
        if (ev.ams_duration) amsDisplay += ` (最长 ${ev.ams_duration})`;
    }
    document.getElementById('amsSwitch').textContent = amsDisplay;

    // AT/AF Load
    let atafDisplay = '无';
    if (ev.ataf_load) {
        atafDisplay = `${ev.ataf_load}%`;
        if (ev.ataf_desc) atafDisplay += ` - ${ev.ataf_desc}`;
    } else if (ev.ataf_count) {
        atafDisplay = `${ev.ataf_count} 次`;
        if (ev.ataf_desc) atafDisplay += ` - ${ev.ataf_desc}`;
    }
    document.getElementById('atafLoad').textContent = atafDisplay;

    // VT / Fast Ventricular Rate
    let vtDisplay = '无';
    if (ev.vt_count) {
        vtDisplay = `${ev.vt_count} 次`;
        if (ev.vt_desc) vtDisplay += ` - ${ev.vt_desc}`;
    } else if (ev.vt_desc) {
        vtDisplay = ev.vt_desc;
    }
    document.getElementById('vtEvents').textContent = vtDisplay;

    // Other Events
    const otherVal = ev.other;
    document.getElementById('otherEvents').textContent = otherVal || '无';

    // Lead Table
    const tbody = document.getElementById('leadTableBody');
    tbody.innerHTML = '';

    const chambers = [
        { name: 'RA (右房)', imp: lat.ra_impedance, sens: lat.ra_sense, thr: lat.ra_threshold, out: lat.ra_output },
        { name: 'RV (右室)', imp: lat.rv_impedance, sens: lat.rv_sense, thr: lat.rv_threshold, out: lat.rv_output },
        { name: 'LV (左室)', imp: lat.lv_impedance, sens: lat.lv_sense, thr: lat.lv_threshold, out: lat.lv_output }
    ];

    chambers.forEach(c => {
        // Show row if any value exists and is not just '--'
        const hasData = (c.imp && c.imp !== '--') || (c.sens && c.sens !== '--') || (c.thr && c.thr !== '--') || (c.out && c.out !== '--');
        if (hasData) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${c.name}</td>
                <td>${c.imp || '--'}</td>
                <td>${c.sens || '--'}</td>
                <td>${c.thr || '--'}</td>
                <td>${c.out || '--'}</td>
            `;
            tbody.appendChild(tr);
        }
    });

    // Records Timeline (Detailed)
    const timeline = document.getElementById('recordTimeline');
    timeline.innerHTML = '';

    // History is already sorted date DESC
    patient.history.forEach((rec, index) => {
        const div = document.createElement('div');
        div.className = 'history-card';
        // Unique ID for accordion
        const collapseId = `rec-${index}`;

        div.innerHTML = `
            <div class="history-header" onclick="toggleHistory('${collapseId}')">
                <div class="history-main-meta">
                    <span class="history-date">程控日期: ${rec.dateStr}</span>
                    <span class="badge mode-badge">${rec.mode}</span>
                </div>
                <div class="history-sub-meta">
                    <span>${rec.battery.voltage ? '电池: ' + rec.battery.voltage + 'V' : ''}</span>
                    <span class="arrow-icon">▼</span>
                </div>
            </div>
            
            <div id="${collapseId}" class="history-body hidden">
                <!-- 严格按照JSON结构展示 -->
                
                <!-- 1. header - 患者/设备信息 -->
                <div class="json-section">
                    <h4 class="section-title">📋 患者/设备信息</h4>
                    <div class="kv-grid">
                        ${renderKeyValue(rec.header_raw)}
                    </div>
                </div>
                
                <!-- 2. basic_params.settings - 起搏参数 -->
                <div class="json-section">
                    <h4 class="section-title">⚙️ 起搏参数</h4>
                    <div class="kv-grid">
                        ${renderKeyValue(rec.settings_raw)}
                    </div>
                </div>
                
                <!-- 3. basic_params.measurements - 输出设置 -->
                <div class="json-section">
                    <h4 class="section-title">📊 输出设置</h4>
                    <div class="kv-grid">
                        ${renderKeyValue(rec.measurement_raw)}
                    </div>
                </div>
                
                <!-- 4. test_params.battery_and_leads - 电池与导线 -->
                <div class="json-section">
                    <h4 class="section-title">🔋 电池信息</h4>
                    <div class="kv-grid">
                        ${renderKeyValue(rec.battery_raw)}
                    </div>
                </div>
                
                <!-- 5. test_params.threshold_tests - 阈值测试 -->
                <div class="json-section">
                    <h4 class="section-title">🔌 阈值测试</h4>
                    <div class="kv-grid">
                        ${renderKeyValue(rec.thresholds_raw)}
                    </div>
                </div>
                
                <!-- 6. events_and_footer - 事件与结论 -->
                <div class="json-section">
                    <h4 class="section-title">⚠️ 事件与结论</h4>
                    <div class="kv-grid">
                        ${renderKeyValue(rec.events_raw)}
                    </div>
                </div>
                
                <!-- 7. footer_meta - 签名信息 -->
                <div class="json-section">
                    <h4 class="section-title">📝 签名信息</h4>
                    <div class="kv-grid">
                        ${renderKeyValue(rec.footer_meta_raw || {})}
                    </div>
                </div>
            </div>
        `;
        timeline.appendChild(div);
    });
}

// Helper to render key-value pairs
function renderKeyValue(obj) {
    if (!obj || Object.keys(obj).length === 0) return '<span class="text-muted text-sm">No data</span>';

    return Object.entries(obj).map(([k, v]) => {
        if (v === null || v === undefined || v === '' || v === '/') return '';

        let displayVal = v;

        // Format date fields
        if (k.includes('日期') || k.includes('时间')) {
            displayVal = formatDate(v);
        } else if (typeof v === 'object') {
            displayVal = `<pre style="margin:0; font-size:0.75rem">${JSON.stringify(v, null, 2)}</pre>`;
        }

        // Clean up keys for display
        const label = k.replace(/（.*?）/g, '').replace(/_/g, ' ');
        return `
            <div class="kv-row">
                <span class="kv-key">${label}</span>
                <span class="kv-val">${displayVal}</span>
            </div>
        `;
    }).join('');
}

// Global toggle function
window.toggleHistory = function (id) {
    const el = document.getElementById(id);
    const card = el.parentElement;

    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        card.classList.add('expanded');
    } else {
        el.classList.add('hidden');
        card.classList.remove('expanded');
    }
};

// --- Interaction ---

function setupEventListeners() {
    // Tabs
    elTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            elTabs.forEach(b => b.classList.remove('active'));
            elPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Search
    elSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const filtered = allPatients.filter(p =>
            (p.name && p.name.toLowerCase().includes(term)) ||
            (p.id && String(p.id).toLowerCase().includes(term))
        );
        renderList(filtered);
    });
}
