/**
 * Controller Mapping Interface
 * Handles configuration, status monitoring, and UI for ROV controller mappings
 */

// Global state variables
let socket = io();
let lastHeartbeat = 0;
let checkStatusInterval;
let activeMappingName = 'None';
let currentConfig = null;
let currentConfigName = null;
let configurations = {};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadConfigurations();
    checkStatusInterval = setInterval(checkControllerStatus, 2000);
});

// -------------------- Socket Event Handlers --------------------

socket.on('connect', function() {
    // Log
    console.log("Socket connected");
});

socket.on('disconnect', function() {
    // Log
    console.log("Socket disconnected");
    updateControllerStatus('disconnected');
    
    // Clear active mapping when disconnected
    activeMappingName = 'None';
    document.getElementById('active-mapping-name').textContent = 'None';
    highlightActiveMapping(''); // Clear any active highlights
    
    if (checkStatusInterval) {
        clearInterval(checkStatusInterval);
    }
});

socket.on('rov_velocity', function(data) {
    data = typeof data === 'string' ? JSON.parse(data) : data;

    if (data.current_config !== activeMappingName) {
        highlightActiveMapping(data.current_config);
        activeMappingName = data.current_config;
        document.getElementById('active-mapping-name').textContent = activeMappingName;
    }
    
    // Update velocity display card
    updateVelocityDisplay(data);
});

// Function to update the velocity display card
function updateVelocityDisplay(data) {
    const velocityCard = document.getElementById('velocity-display');
    if (!velocityCard) return;
    
    // Format linear values
    const linear = data.twist.linear;
    const linearHTML = `
        <div class="mb-2">
            <strong>Linear:</strong>
            <div class="ms-3">
                X: <span class="badge bg-primary">${linear.x.toFixed(2)}</span>
                Y: <span class="badge bg-primary">${linear.y.toFixed(2)}</span>
                Z: <span class="badge bg-primary">${linear.z.toFixed(2)}</span>
            </div>
        </div>
    `;
    
    // Format angular values
    const angular = data.twist.angular;
    const angularHTML = `
        <div class="mb-2">
            <strong>Angular:</strong>
            <div class="ms-3">
                X (Pitch): <span class="badge bg-info">${angular.x.toFixed(2)}</span>
                Y (Roll): <span class="badge bg-info">${angular.y.toFixed(2)}</span>
                Z (Yaw): <span class="badge bg-info">${angular.z.toFixed(2)}</span>
            </div>
        </div>
    `;
    
    // Format other properties
    const otherPropsHTML = `
        <div>
            <strong>Settings:</strong>
            <div class="ms-3">
                Fine Mode: <span class="badge ${data.is_fine ? 'bg-success' : 'bg-secondary'}">${data.is_fine}</span>
                Pool Centric: <span class="badge ${data.is_pool_centric ? 'bg-success' : 'bg-secondary'}">${data.is_pool_centric ? 'ON' : 'OFF'}</span>
                Depth Lock: <span class="badge ${data.depth_lock ? 'bg-success' : 'bg-secondary'}">${data.depth_lock ? 'ON' : 'OFF'}</span>
                Pitch Lock: <span class="badge ${data.pitch_lock ? 'bg-success' : 'bg-secondary'}">${data.pitch_lock ? 'ON' : 'OFF'}</span>
            </div>
        </div>
    `;
    
    // Update the card content
    velocityCard.innerHTML = `
        <div class="card-header bg-dark text-white">
            Live ROV Velocity Data
        </div>
        <div class="card-body">
            ${linearHTML}
            ${angularHTML}
            ${otherPropsHTML}
            <div class="text-muted mt-3 small">
                Last updated: ${new Date().toLocaleTimeString()}
            </div>
        </div>
    `;
}

socket.on('heartbeat', function(msg) {
    try {
        const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
        
        if (data.node === 'controller' && data.status === 'active') {
            lastHeartbeat = Date.now();
            updateControllerStatus('connected');
        }
    } catch (err) {
        console.error('Error handling heartbeat:', err);
    }
});

socket.on('active-mapping-update', function(data) {
    if (data && data.name) {
        activeMappingName = data.name;
        document.getElementById('active-mapping-name').textContent = activeMappingName;
        highlightActiveMapping(activeMappingName);
    }
});

// -------------------- Status Monitoring Functions --------------------

function checkControllerStatus() {
    const now = Date.now();
    const timeSinceHeartbeat = now - lastHeartbeat;
    
    if (lastHeartbeat === 0) {
        updateControllerStatus('disconnected');
    } else if (timeSinceHeartbeat > 10000) {
        updateControllerStatus('disconnected');
    } else if (timeSinceHeartbeat > 5000) {
        updateControllerStatus('stale');
    } else {
        updateControllerStatus('connected');
    }
}

function updateControllerStatus(status) {
    const indicator = document.getElementById('controller-status-indicator');
    const text = document.getElementById('controller-status-text');
    
    if (status === 'connected') {
        indicator.className = 'status-indicator status-connected';
        text.textContent = 'Connected';
    } else if (status === 'stale') {
        indicator.className = 'status-indicator status-stale';
        text.textContent = 'Stale';
    } else {
        indicator.className = 'status-indicator status-disconnected';
        text.textContent = 'Disconnected';
    }
}

function highlightActiveMapping(mappingName) {
    const configItems = document.querySelectorAll('.config-item');
    configItems.forEach(item => {
        item.classList.remove('active-mapping');
        
        const namePart = item.querySelector('.config-name') || item;
        const nameText = namePart.textContent.replace('Active', '').trim();
        
        // Remove any existing badges
        const existingBadge = namePart.querySelector('.badge');
        if (existingBadge) existingBadge.remove();
        
        // Add badge if this is the active mapping
        if (nameText === mappingName) {
            const badge = document.createElement('span');
            badge.className = 'badge bg-success ms-2';
            badge.textContent = 'Active';
            namePart.appendChild(badge);
        }
    });
    
    // Update activate button state
    if (currentConfigName === mappingName) {
        document.getElementById('activateConfigBtn').textContent = 'Active';
        document.getElementById('activateConfigBtn').classList.add('active');
    } else {
        document.getElementById('activateConfigBtn').textContent = 'Activate';
        document.getElementById('activateConfigBtn').classList.remove('active');
    }
}

// -------------------- Configuration Management Functions --------------------

function loadConfigurations() {
    fetch('/api/controller/configs')
        .then(response => response.json())
        .then(data => {
            configurations = data;
            renderConfigList();
            
            if (currentConfigName && configurations.includes(currentConfigName)) {
                loadConfigForEditing(currentConfigName);
            } else if (configurations.length > 0) {
                loadConfigForEditing(configurations[0]);
            }
        })
        .catch(error => {
            console.error('Error loading configurations:', error);
            alert('Error loading configurations');
        });
}

function renderConfigList() {
    const configList = document.getElementById('configList');
    configList.innerHTML = '';

    configurations.forEach(configName => {
        const div = document.createElement('div');
        div.className = `config-item ${configName === currentConfigName ? 'active' : ''}`;
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'config-name';
        nameSpan.textContent = configName;
        div.appendChild(nameSpan);
        
        div.onclick = () => loadConfigForEditing(configName);
        configList.appendChild(div);
    });
    
    // Highlight active mapping after rendering the list
    highlightActiveMapping(activeMappingName);
}

function loadConfigForEditing(configName) {
    fetch(`/api/controller/configs/${configName}`)
    .then(response => response.json())
    .then(config => {
        currentConfig = config;
        currentConfigName = configName;
        
        // Update form with config values
        document.getElementById('configName').value = configName;
        
        // Load linear axes
        ['x', 'y', 'z'].forEach(axis => {
            const linearConfig = config.joystick.linear[axis];
            document.getElementById(`linear-${axis}-device`).value = linearConfig.device;
            document.getElementById(`linear-${axis}-axis`).value = linearConfig.axis;
            document.getElementById(`linear-${axis}-scale`).value = linearConfig.scale;
            document.getElementById(`linear-${axis}-invert`).checked = linearConfig.invert;
        });
        
        // Load angular axes
        ['x', 'y', 'z'].forEach(axis => {
            const angularConfig = config.joystick.angular[axis];
            document.getElementById(`angular-${axis}-device`).value = angularConfig.device;
            document.getElementById(`angular-${axis}-axis`).value = angularConfig.axis;
            document.getElementById(`angular-${axis}-scale`).value = angularConfig.scale;
            document.getElementById(`angular-${axis}-invert`).checked = angularConfig.invert;
        });
        
        // Load other settings
        document.getElementById('deadZone').value = config.dead_zone;
        
        // Update UI
        renderConfigList();
        highlightActiveMapping(activeMappingName);
    })
    .catch(error => {
        console.error('Error loading configuration:', error);
        alert('Error loading configuration');
    });
}

function saveCurrentConfig(callback) {
    if (!currentConfig) return;
    
    const saveName = document.getElementById('configName').value.trim();
    if (!saveName) {
        alert('Configuration name cannot be empty.');
        return;
    }
    if (/\s/.test(saveName)) {
        alert('Configuration name cannot contain spaces.');
        return;
    }
    
    // Check if this config is currently active
    const isActive = (saveName === activeMappingName);
    
    // Build config object from form values
    const config = {
        joystick: {
            linear: {},
            angular: {}
        },
        buttons: {
            tool_toggle: []
        },
        trims: { x: 0.0, y: 0.0, z: 0.0 },
        dead_zone: parseFloat(document.getElementById('deadZone').value) || 0.09,
        scale_factors: {
            translational_x: 1.0,
            translational_y: 1.0,
            translational_z: 1.0,
            rotational_x: 1.0,
            rotational_y: 1.0,
            rotational_z: 1.0
        }
    };
    
    // Gather linear axes configuration
    ['x', 'y', 'z'].forEach(axis => {
        config.joystick.linear[axis] = {
            device: document.getElementById(`linear-${axis}-device`).value,
            axis: parseInt(document.getElementById(`linear-${axis}-axis`).value) || 0,
            scale: parseFloat(document.getElementById(`linear-${axis}-scale`).value) || 1.0,
            invert: document.getElementById(`linear-${axis}-invert`).checked
        };
    });
    
    // Gather angular axes configuration
    ['x', 'y', 'z'].forEach(axis => {
        config.joystick.angular[axis] = {
            device: document.getElementById(`angular-${axis}-device`).value,
            axis: parseInt(document.getElementById(`angular-${axis}-axis`).value) || 0,
            scale: parseFloat(document.getElementById(`angular-${axis}-scale`).value) || 1.0,
            invert: document.getElementById(`angular-${axis}-invert`).checked
        };
    });
    
    // Send to server
    fetch('/api/controller/configs/' + saveName, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
    })
    .then(response => {
        if (response.ok) {
            console.log('Configuration saved successfully:', saveName);
            currentConfigName = saveName;
            loadConfigurations();
            
            // If this was the active configuration, re-activate it to apply changes
            if (isActive) {
                console.log('Re-activating configuration after save:', saveName);
                socket.emit('frontend-updateControllerMapping', { name: saveName });
            }
            
            if (typeof callback === 'function') callback();
        } else {
            console.error('Failed to save configuration:', response.statusText);
            alert('Failed to save configuration');
        }
    })
    .catch(error => {
        console.error('Error saving configuration:', error);
        alert('Error saving configuration');
    });
}

function createNewConfig() {
    const name = prompt('Enter a name for the new configuration:');
    if (!name || !name.trim()) return;
    
    const defaultConfig = {
        joystick: {
            linear: {
                x: {"device": "joystick_left", "axis": 1, "scale": 1.0, "invert": false},
                y: {"device": "joystick_left", "axis": 0, "scale": 1.0, "invert": false},
                z: {"device": "joystick_right", "axis": 2, "scale": 1.0, "invert": false}
            },
            angular: {
                x: {"device": "joystick_right", "axis": 1, "scale": 1.0, "invert": false},
                y: {"device": "joystick_right", "axis": 0, "scale": 1.0, "invert": false},
                z: {"device": "joystick_left", "axis": 2, "scale": 1.0, "invert": false}
            }
        },
        buttons: {
            tool_toggle: []
        },
        trims: { x: 0.0, y: 0.0, z: 0.0 },
        dead_zone: 0.09,
        scale_factors: {
            translational_x: 1.0,
            translational_y: 1.0,
            translational_z: 1.0,
            rotational_x: 1.0,
            rotational_y: 1.0,
            rotational_z: 1.0
        }
    };

    currentConfig = defaultConfig;
    currentConfigName = name;
    document.getElementById('configName').value = name;
    saveCurrentConfig();
}

function deleteCurrentConfig() {
    if (!currentConfigName) return;
    
    if (!confirm(`Are you sure you want to delete the "${currentConfigName}" configuration?`)) {
        return;
    }

    fetch(`/api/controller/configs/${currentConfigName}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            console.log(`Configuration "${currentConfigName}" deleted successfully.`);
            
            // Clear selection and reload
            currentConfig = null;
            currentConfigName = null;
            loadConfigurations();
        } else {
            console.error('Failed to delete configuration:', response.statusText);
            alert('Failed to delete configuration');
        }
    })
    .catch(error => {
        console.error('Error deleting configuration:', error);
        alert('Error deleting configuration');
    });
}

// -------------------- Action Functions --------------------

function activateCurrentConfig() {
    const configName = document.getElementById('configName').value;
    if (!configName) {
        alert('Please save the configuration before activating it.');
        return;
    }
    
    // Save first to ensure latest changes are activated
    saveCurrentConfig(() => {
        // Emit event to activate the mapping
        socket.emit('frontend-updateControllerMapping', { name: configName });
        
        // Update UI state
        activeMappingName = configName;
        document.getElementById('active-mapping-name').textContent = configName;
    });
}

/**
 * Sends a reset command to all thrusters
 */
function resetThrusters() {
    console.log("Sending reset thrusters command");
    
    // Send the reset thrusters event
    socket.emit('frontend-resetThrusters');
    
    // Provide visual feedback
    const resetBtn = document.getElementById('reset-thrusters-btn');
    const originalText = resetBtn.textContent;
    
    resetBtn.textContent = "Resetting...";
    resetBtn.disabled = true;
    
    // Re-enable the button after a short delay
    setTimeout(() => {
        resetBtn.textContent = originalText;
        resetBtn.disabled = false;
    }, 1000);
}