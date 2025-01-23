// DOM Elements
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.querySelector('.browse-btn');
const uploadStatus = document.getElementById('uploadStatus');
const columnSection = document.getElementById('columnSection');
const aggColumns = document.getElementById('aggColumns');
const groupColumns = document.getElementById('groupColumns');
const operationsSection = document.getElementById('operationsSection');
const operations = document.getElementById('operations');
const generateBtn = document.getElementById('generateBtn');

// Available operations for aggregation
const AVAILABLE_OPERATIONS = ['sum', 'mean', 'count', 'min', 'max', 'median', 'std'];

// State management
let currentFile = null;
let selectedAggColumns = new Set();
let selectedGroupColumns = new Set();

// Event Listeners
browseBtn.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragging');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragging');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragging');
    const files = e.dataTransfer.files;
    if (files.length) {
        handleFileUpload(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFileUpload(e.target.files[0]);
    }
});

async function handleFileUpload(file) {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
        showStatus('Please upload an Excel file (.xlsx or .xls)', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        showStatus('Uploading file...', 'info');
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        if (data.columns && data.columns.length) {
            currentFile = data.filename;
            showStatus('File uploaded successfully!', 'success');
            displayColumnSelectors(data.columns);
        } else {
            throw new Error('No columns found in the file');
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
    }
}

function displayColumnSelectors(columns) {
    // Clear previous selections
    selectedAggColumns.clear();
    selectedGroupColumns.clear();
    aggColumns.innerHTML = '';
    groupColumns.innerHTML = '';
    operations.innerHTML = '';

    // Show sections
    columnSection.classList.remove('hidden');
    operationsSection.classList.remove('hidden');
    generateBtn.classList.remove('hidden');

    // Create column checkboxes
    columns.forEach((col, index) => {
        createColumnCheckbox(col, 'agg', aggColumns);
        createColumnCheckbox(col, 'group', groupColumns);
    });

    updateGenerateButton();
}

function createColumnCheckbox(columnName, type, container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'checkbox-wrapper';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${type}_${columnName}`;
    checkbox.value = columnName;

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = columnName;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    container.appendChild(wrapper);

    checkbox.addEventListener('change', () => {
        const targetSet = type === 'agg' ? selectedAggColumns : selectedGroupColumns;
        const oppositeSet = type === 'agg' ? selectedGroupColumns : selectedAggColumns;

        if (checkbox.checked) {
            // Remove from opposite set if selected there
            const oppositeCheckbox = document.getElementById(`${type === 'agg' ? 'group' : 'agg'}_${columnName}`);
            if (oppositeCheckbox) {
                oppositeCheckbox.checked = false;
                oppositeSet.delete(columnName);
            }
            targetSet.add(columnName);
        } else {
            targetSet.delete(columnName);
        }

        updateOperationsSection();
        updateGenerateButton();
    });
}

function updateOperationsSection() {
    operations.innerHTML = '';

    selectedAggColumns.forEach(col => {
        const row = document.createElement('div');
        row.className = 'operation-row';

        const label = document.createElement('label');
        label.textContent = `Operation for ${col}:`;

        const select = document.createElement('select');
        select.className = 'operation-select';
        select.dataset.column = col;

        AVAILABLE_OPERATIONS.forEach(op => {
            const option = document.createElement('option');
            option.value = op;
            option.textContent = op.charAt(0).toUpperCase() + op.slice(1);
            select.appendChild(option);
        });

        row.appendChild(label);
        row.appendChild(select);
        operations.appendChild(row);
    });
}

function updateGenerateButton() {
    generateBtn.disabled = selectedAggColumns.size === 0 || selectedGroupColumns.size === 0;
}

function showStatus(message, type) {
    uploadStatus.textContent = message;
    uploadStatus.className = `status ${type}`;
    uploadStatus.style.display = 'block';
}

generateBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    const operationsMap = {};
    selectedAggColumns.forEach(col => {
        const select = document.querySelector(`select[data-column="${col}"]`);
        operationsMap[col] = select.value;
    });

    const payload = {
        agg_columns: Array.from(selectedAggColumns),
        group_columns: Array.from(selectedGroupColumns),
        operations: operationsMap
    };

    try {
        generateBtn.disabled = true;
        const loadingSpinner = document.querySelector('.loading-spinner');
        loadingSpinner.classList.remove('hidden');

        const response = await fetch(`/aggregate/${currentFile}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Aggregation failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aggregated_${currentFile}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        showStatus('File generated successfully!', 'success');
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        generateBtn.disabled = false;
        document.querySelector('.loading-spinner').classList.add('hidden');
    }
});


async function displayData(tableData) {
    try {
        // Convert table data to Excel-like format for backend
        const formData = new FormData();
        const blob = new Blob([JSON.stringify(tableData)], { type: 'application/json' });
        formData.append('file', blob, 'pasted-data.xlsx');

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        if (data.columns?.length) {
            currentFile = data.filename;
            displayColumnSelectors(data.columns);
            showStatus('Data processed successfully!', 'success');
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
    }
}