/**
 * charts.js - Handles Chart.js visualizations for the Pacemaker Dashboard
 */

let thresholdChartInstance = null;
let impedanceChartInstance = null;

// Chart Configuration (Medical Theme)
const chartConfig = {
    color: {
        grid: 'rgba(51, 65, 85, 0.5)',
        text: '#94a3b8',
        line: '#06b6d4',
        fill: 'rgba(6, 182, 212, 0.1)'
    }
};

function initCharts() {
    // Threshold Chart
    const ctxThr = document.getElementById('thresholdChart').getContext('2d');
    thresholdChartInstance = new Chart(ctxThr, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: getChartOptions('输出阈值 (V)')
    });

    // Impedance Chart
    const ctxImp = document.getElementById('impedanceChart').getContext('2d');
    impedanceChartInstance = new Chart(ctxImp, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: getChartOptions('导线阻抗 (Ω)')
    });
}
// ...
// Update Threshold Chart
thresholdChartInstance.data.labels = labels;
thresholdChartInstance.data.datasets = [
    createDataset('RA (右房) 阈值', raThr, '#f59e0b'),
    createDataset('RV (右室) 阈值', rvThr, '#06b6d4'),
    createDataset('LV (左室) 阈值', lvThr, '#14b8a6')
].filter(ds => ds.data.some(v => v !== null)); // Remove empty datasets
thresholdChartInstance.update();

// Update Impedance Chart
impedanceChartInstance.data.labels = labels;
impedanceChartInstance.data.datasets = [
    createDataset('RA (右房) 阻抗', raImp, '#f59e0b'),
    createDataset('RV (右室) 阻抗', rvImp, '#06b6d4'),
    createDataset('LV (左室) 阻抗', lvImp, '#14b8a6')
].filter(ds => ds.data.some(v => v !== null));
impedanceChartInstance.update();
}

function createDataset(label, data, color) {
    // Hex to RGBA Helper
    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    return {
        label: label,
        data: data,
        borderColor: color,
        backgroundColor: hexToRgba(color, 0.1),
        borderWidth: 2,
        tension: 0.4, // Smooth curve
        pointBackgroundColor: '#0f172a',
        pointBorderColor: color,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true
    };
}

// Expose to window
window.initCharts = initCharts;
window.updateCharts = updateCharts;
