document.addEventListener('DOMContentLoaded', function() {
    const recordButton = document.getElementById('record-button');
    let isRecording = false;
    let currentCamera = '1'; // Default camera
    
    // Get initial camera from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    currentCamera = urlParams.get('camera') || '1';
    
    // Listen for camera changes via URL parameter
    window.addEventListener('popstate', function() {
        const urlParams = new URLSearchParams(window.location.search);
        currentCamera = urlParams.get('camera') || currentCamera;
    });
    
    // Handle recording button click
    recordButton.addEventListener('click', function() {
        if (isRecording) {
            stopRecording(currentCamera);
        } else {
            startRecording(currentCamera);
        }
    });
    
    // Start recording for the current camera
    function startRecording(cameraNumber) {
        fetch(`/api/record/start/${cameraNumber}`, {
            method: 'POST',
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                isRecording = true;
                recordButton.classList.add('recording');
                recordButton.innerHTML = '<span class="record-icon"></span> Stop';
            } else {
                alert('Failed to start recording: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error starting recording:', error);
            alert('Error starting recording. Check console for details.');
        });
    }
    
    // Stop recording for the current camera
    function stopRecording(cameraNumber) {
        fetch(`/api/record/stop/${cameraNumber}`, {
            method: 'POST',
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                isRecording = false;
                recordButton.classList.remove('recording');
                recordButton.innerHTML = '<span class="record-icon"></span> Record';
            } else {
                alert('Failed to stop recording: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error stopping recording:', error);
            alert('Error stopping recording. Check console for details.');
        });
    }
    
    // Listen for camera switching events from cameras.js
    document.addEventListener('cameraChanged', function(e) {
        currentCamera = e.detail.camera;
    });
});