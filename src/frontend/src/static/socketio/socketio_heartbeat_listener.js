var socket = io();

// Function to update the status of a node
function updateNodeStatus(nodeName, status, location) {
    try {
        const tableId = location === 'surface' ? 'surface-node-table' : 'core-node-table';
        const table = document.getElementById(tableId);
        
        if (!table) {
            console.error(`Table with id ${tableId} not found`);
            return;
        }
        
        const tbody = table.querySelector('tbody');
        
        if (!tbody) {
            console.error(`tbody not found in table ${tableId}`);
            return;
        }
        
        let row = document.getElementById(`node-${nodeName}`);
        
        if (!row) {
            // Create a new row if the node doesn't exist
            row = document.createElement('tr');
            row.id = `node-${nodeName}`;
            
            const nameCell = document.createElement('td');
            nameCell.textContent = nodeName;
            row.appendChild(nameCell);
            
            const statusCell = document.createElement('td');
            statusCell.className = 'text-center';
            const statusBadge = document.createElement('span');
            statusBadge.className = `status-badge ${status === 'active' ? 'active-node' : 'inactive-node'}`;
            statusBadge.textContent = status;
            statusCell.appendChild(statusBadge);
            row.appendChild(statusCell);
            
            tbody.appendChild(row);
        } else {
            // Update the status of the existing node
            const statusBadge = row.querySelector('.status-badge');
            if (statusBadge) {
                statusBadge.className = `status-badge ${status === 'active' ? 'active-node' : 'inactive-node'}`;
                statusBadge.textContent = status;
            }
        }
        
        // Sort the rows alphabetically by node name
        const rows = Array.from(tbody.querySelectorAll('tr'));
        rows.sort((a, b) => {
            const nameA = a.querySelector('td').textContent;
            const nameB = b.querySelector('td').textContent;
            return nameA.localeCompare(nameB);
        });
        
        // Clear the table
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }
        
        // Add the sorted rows back
        rows.forEach(row => tbody.appendChild(row));
        
        // Update counters
        updateNodeCounts();
        
    } catch (err) {
        console.error('Error updating node status:', err);
    }
}

// Function to update the node counts
function updateNodeCounts() {
    try {
        const surfaceTable = document.getElementById('surface-node-table');
        const coreTable = document.getElementById('core-node-table');
        
        if (surfaceTable) {
            const surfaceCount = surfaceTable.querySelectorAll('tbody tr').length;
            const surfaceCounter = document.getElementById('surface-node-count');
            if (surfaceCounter) surfaceCounter.textContent = surfaceCount;
        }
        
        if (coreTable) {
            const coreCount = coreTable.querySelectorAll('tbody tr').length;
            const coreCounter = document.getElementById('core-node-count');
            if (coreCounter) coreCounter.textContent = coreCount;
        }
        
        updateLastUpdatedTime();
    } catch (err) {
        console.error('Error updating node counts:', err);
    }
}

// Function to update the last updated time
function updateLastUpdatedTime() {
    try {
        const timeElement = document.getElementById('last-updated-time');
        if (timeElement) {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString();
        }
    } catch (err) {
        console.error('Error updating time:', err);
    }
}

// Handle socket connection and disconnection events
socket.on('connect', function() {
    console.log("Socket connected");
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        statusElement.textContent = "Connection Status: Connected";
        statusElement.className = "alert alert-success";
    }
});

socket.on('disconnect', function() {
    console.log("Socket disconnected");
    
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        statusElement.textContent = "Connection Status: Disconnected";
        statusElement.className = "alert alert-danger";
    }
    
    // Set all nodes to inactive
    ['surface-node-table', 'core-node-table'].forEach(tableId => {
        const table = document.getElementById(tableId);
        if (table) {
            const rows = table.querySelectorAll('tbody tr');
            for (let row of rows) {
                const statusBadge = row.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.className = 'status-badge inactive';
                    statusBadge.textContent = 'inactive';
                }
            }
        }
    });
});

// Handle the 'heartbeat' event
socket.on('heartbeat', function(msg) {
    try {
        // Parse the message if it's a string
        const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
        
        // Update node status and counts
        if (data && data.node && data.status && data.location) {
            updateNodeStatus(data.node, data.status, data.location);
        }
    } catch (err) {
        console.error('Error handling heartbeat:', err);
    }
});

// Initial update of the last updated time
document.addEventListener('DOMContentLoaded', function() {
    updateLastUpdatedTime();
});