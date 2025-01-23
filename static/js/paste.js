const pasteArea = document.getElementById('pasteArea');


// Paste functionality
pasteArea.addEventListener('paste', async (e) => {
    e.preventDefault();
    const clipboardData = e.clipboardData;
    
    const tableData = await processClipboardData(clipboardData);
    if (tableData) {
        displayPastedData(tableData);
        handleDataUpload(tableData);
    }
});

async function processClipboardData(clipboardData) {
    // Try HTML format
    let content = clipboardData.getData('text/html');
    if (content) {
        const doc = new DOMParser().parseFromString(content, 'text/html');
        const tables = doc.getElementsByTagName('table');
        if (tables.length > 0) {
            return extractTableData(tables[0]);
        }
    }
    
    // Try plain text
    content = clipboardData.getData('text');
    return processTextData(content);
}

function extractTableData(table) {
    const headers = [];
    const data = [];
    
    // Extract headers
    table.querySelectorAll('tr:first-child th').forEach(th => 
        headers.push(th.textContent.trim())
    );
    
    // Extract rows
    table.querySelectorAll('tr:not(:first-child)').forEach(row => {
        const rowData = {};
        row.querySelectorAll('td').forEach((cell, i) => {
            rowData[headers[i]] = cell.textContent.trim();
        });
        data.push(rowData);
    });
    
    return { headers, data };
}

function processTextData(content) {
    const rows = content.split(/[\r\n]+/).filter(row => row.trim());
    if (!rows.length) return null;
    
    const headers = rows[0].split(/[\t,]/).map(h => h.trim());
    const data = rows.slice(1).map(row => {
        const values = row.split(/[\t,]/).map(v => v.trim());
        const rowData = {};
        headers.forEach((h, i) => rowData[h] = values[i]);
        return rowData;
    });
    
    return { headers, data };
}

async function handleDataUpload(tableData) {
    currentFile = 'pasted-data.xlsx';  // Add this line
    displayData(tableData);
    showStatus('Table data processed successfully!', 'success');
    try {
        const response = await fetch('/process-table', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tableData)
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        const data = await response.json();
        displayColumnSelectors(data.columns);
        showStatus('Table data processed successfully!', 'success');
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
    }
}

function displayPastedData(tableData) {
    const tableHTML = generateTableHTML(tableData); // Create a function to render the table
    document.getElementById('tableContainer').innerHTML = tableHTML;
    handleDataUpload(tableData);  // This calls your existing backend dispatch
}

function generateTableHTML(tableData) {
    return `
    <table>
      <thead>
        <tr>${tableData.headers.map(h => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${tableData.data.map(row => `
          <tr>${tableData.headers.map(h => `<td${!isNaN(row[h]) ? ' class="numeric"' : ''}>${row[h]}</td>`).join('')}</tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// In paste.js
document.getElementById('processButton').addEventListener('click', () => {
    const content = pasteArea.innerText;
    const tableData = processTextData(content);
    if (tableData) {
        handleDataUpload(tableData);
    }
});