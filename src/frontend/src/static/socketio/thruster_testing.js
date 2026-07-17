var socket = io();

let isSending = false;
let sendInterval = null;
let displayMode = "absolute";
let NEUTRAL_VALUE = 127;

// Connection status tracking
let coreLastHeartbeat = {
  'ROV_main': 0,
  'thrust_to_spi': 0
};

// --------- CONNECTION STATUS FUNCTIONS --------- //

// Update the frontend connection status display
function updateFrontendStatus(connected) {
  const indicator = document.getElementById('frontend-status-indicator');
  const text = document.getElementById('frontend-status-text');
  
  if (connected) {
    indicator.className = 'status-indicator status-connected';
    text.textContent = 'Connected';
  } else {
    indicator.className = 'status-indicator status-disconnected';
    text.textContent = 'Disconnected';
  }
}

// Update the core connection status based on heartbeats
function updateCoreStatus() {
  const indicator = document.getElementById('core-status-indicator');
  const text = document.getElementById('core-status-text');
  
  const now = Date.now();
  const staleThreshold = 5000; // 5 seconds
  const disconnectedThreshold = 10000; // 10 seconds
  
  // Get the most recent heartbeat time
  const lastHeartbeat = coreLastHeartbeat['thrust_to_uart'] || 0;
  
  const timeSinceHeartbeat = now - lastHeartbeat;
  
  if (lastHeartbeat === 0) {
    // No heartbeats received yet
    indicator.className = 'status-indicator status-disconnected';
    text.textContent = 'Disconnected';
  } else if (timeSinceHeartbeat > disconnectedThreshold) {
    indicator.className = 'status-indicator status-disconnected';
    text.textContent = 'Disconnected';
  } else if (timeSinceHeartbeat > staleThreshold) {
    indicator.className = 'status-indicator status-stale';
    text.textContent = 'Stale';
  } else {
    indicator.className = 'status-indicator status-connected';
    text.textContent = 'Connected';
  }
}

// Check core status every second
setInterval(updateCoreStatus, 1000);

// --------- PAGE SPECIFIC FUNCTIONS --------- //

function updateAllValues() {
    const masterValue = document.getElementById('master-slider').value;
    document.getElementById('master-slider-value').textContent = masterValue;
    for (let i = 1; i <= 8; i++) {
        toggleThrusterInput(`thruster${i}`);
    }
}

function toggleAllCheckboxes() {
    const selectAll = document.getElementById('select-all').checked;
    for (let i = 1; i <= 8; i++) {
        const checkbox = document.getElementById(`thruster${i}-check`);
        checkbox.checked = selectAll;
        toggleThrusterInput(`thruster${i}`);
    }
}

function toggleThrusterInput(thruster) {
    const checkbox = document.getElementById(`${thruster}-check`);
    const input = document.getElementById(thruster);
    input.readOnly = checkbox.checked;
    if (checkbox.checked) {
        const masterValue = document.getElementById('master-slider').value;
        input.value = masterValue;
    }
}

function resetValues() {
    const defaultValue = displayMode === "absolute" ? 127 : 0;
    // Stop continuous sending if active
    if(isSending) {
        clearInterval(sendInterval);
        isSending = false;
        document.getElementById("toggle-send").textContent = "Send Values";
        document.getElementById("toggle-send").className = "btn btn-primary";
        document.getElementById("send-once").style.display = "inline-block";
    }
    // Reset master slider and its display
    document.getElementById('master-slider').value = defaultValue;
    document.getElementById('master-slider-value').value = defaultValue;
    // Uncheck the select-all checkbox
    document.getElementById('select-all').checked = false;
    // Reset each thruster input and checkbox
    for (let i = 1; i <= 8; i++) {
        const input = document.getElementById(`thruster${i}`);
        const checkbox = document.getElementById(`thruster${i}-check`);
        input.value = defaultValue;
        input.readOnly = false;
        checkbox.checked = false;
    }
    // Send the reset values
    sendThrusterValues();
}

function toggleSendValues() {
    const toggleBtn = document.getElementById("toggle-send");
    const sendOnceBtn = document.getElementById("send-once");
    if (!isSending) {
        // Start sending continuously
        isSending = true;
        toggleBtn.textContent = "Stop Sending Values";
        toggleBtn.className = "btn btn-danger";
        sendOnceBtn.style.display = "none";
        sendInterval = setInterval(sendThrusterValues, 0); // Adjust interval as needed
    } else {
        // Stop continuous sending
        isSending = false;
        toggleBtn.textContent = "Send Values";
        toggleBtn.className = "btn btn-primary";
        sendOnceBtn.style.display = "inline-block";
        clearInterval(sendInterval);
    }
}

function updateFinalThrustDisplay(thrusters) {
    thrusters = JSON.parse(thrusters).thrusters;
    for (let i = 1; i <= 8; i++) {
        const id = `final-thrust${i}`;
        if (thrusters[i - 1] !== undefined) {
            document.getElementById(id).textContent = thrusters[i - 1].toString();
        }
    }
}

function updateAllValues() {
    const masterValue = document.getElementById('master-slider').value;
    // Update textbox value since it's now editable
    document.getElementById('master-slider-value').value = masterValue;
    for (let i = 1; i <= 8; i++) {
        toggleThrusterInput(`thruster${i}`);
    }
}

function updateSliderFromTextbox() {
    const newVal = document.getElementById('master-slider-value').value;
    document.getElementById('master-slider').value = newVal;
    updateAllValues();
}

function toggleDisplayMode() {
    // If the display mode is 
    let displayModeLabel = document.getElementById('display-mode-label');
    if (displayMode === "absolute") {
        displayMode = "relative";
        displayModeLabel.textContent = "Relative (-127 - 127)";

        // Update all input fields to show relative values
        for (let i = 1; i <= 8; i++) {
            const input = document.getElementById(`thruster${i}`);
            const currentValue = parseInt(input.value);
            input.value = currentValue - NEUTRAL_VALUE;
            input.min = -127;
            input.max = 128;
        }

        // Update master slider
        const masterSlider = document.getElementById('master-slider');
        const masterValue = document.getElementById('master-slider-value');
        masterSlider.min = -127;
        masterSlider.max = 128;
        masterSlider.value = parseInt(masterValue.value) - NEUTRAL_VALUE;
        masterValue.value = masterSlider.value;

    } else {
        displayMode = "absolute";
        displayModeLabel.textContent = "Absolute (0 - 255)";

        // Update all input fields to show absolute values
        for (let i = 1; i <= 8; i++) {
            const input = document.getElementById(`thruster${i}`);
            const currentValue = parseInt(input.value);
            input.value = currentValue + 127;
            input.min = 0;
            input.max = 255;
        }

        // Update master slider
        const masterSlider = document.getElementById('master-slider');
        const masterValue = document.getElementById('master-slider-value');
        masterSlider.min = 0;
        masterSlider.max = 255;
        masterSlider.value = parseInt(masterValue.value) + NEUTRAL_VALUE;
        masterValue.value = masterSlider.value;
    }
}

// --------- SOCKET EVENT HANDLERS --------- //

// Handle connection and disconnection events
socket.on('connect', function() {
  console.log("Socket connected");
  updateFrontendStatus(true);
});

socket.on('disconnect', function() {
  console.log("Socket disconnected");
  updateFrontendStatus(false);
  
  // Optional: mark core as disconnected immediately on socket disconnect
  // updateCoreStatus('disconnected');
});

// Handle heartbeat events to track core status
socket.on('heartbeat', function(msg) {
  try {
    const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
    
    // Only track core nodes
    if (data.location === 'core' && data.node === 'thrust_to_uart') {
      if (data.status === 'active') {
        coreLastHeartbeat[data.node] = Date.now();
        updateCoreStatus();
      } else {
        coreLastHeartbeat[data.node] = 0;
        updateCoreStatus();
      }
    }
  } catch (err) {
    console.error('Error processing heartbeat:', err);
  }
});

// Update final thrust display when a "final_thrust" message is received
socket.on('final_thrust', function(msg) {
  console.log("Final thrust message received:", msg);
  updateFinalThrustDisplay(msg);
});

// Dummy send once function (can be modified as needed)
function sendThrusterValues() {
    // Get the values from the input fields
    const thrusterValues = {
        thruster1: parseInt(document.getElementById('thruster1').value, 10),
        thruster2: parseInt(document.getElementById('thruster2').value, 10),
        thruster3: parseInt(document.getElementById('thruster3').value, 10),
        thruster4: parseInt(document.getElementById('thruster4').value, 10),
        thruster5: parseInt(document.getElementById('thruster5').value, 10),
        thruster6: parseInt(document.getElementById('thruster6').value, 10),
        thruster7: parseInt(document.getElementById('thruster7').value, 10),
        thruster8: parseInt(document.getElementById('thruster8').value, 10)
    };
    // Check if we are in absolute or relative mode
    if (displayMode === "relative") {
        for (let i = 1; i <= 8; i++) {
            thrusterValues[`thruster${i}`] += NEUTRAL_VALUE;
        }
    }
    // Send the thruster values to the backend
    socket.emit('frontend-sendThrusterValues', thrusterValues);
}
