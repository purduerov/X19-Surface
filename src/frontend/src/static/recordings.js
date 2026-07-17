document.addEventListener('DOMContentLoaded', function() {
    const recordingsGrid = document.getElementById('recordings-grid');
    const noRecordingsDiv = document.getElementById('no-recordings');
    const cameraFilter = document.getElementById('camera-filter');
    const dateFilter = document.getElementById('date-filter');
    const searchFilter = document.getElementById('search-filter');
    const clearSearchBtn = document.getElementById('clear-search');
    const videoPlayer = document.getElementById('video-player');
    const videoModalTitle = document.getElementById('videoModalLabel');
    const downloadVideoBtn = document.getElementById('download-video');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    
    let recordings = [];
    let currentFile = '';
    
    // Initialize the recordings page
    loadRecordings();
    
    // Set up event listeners for filters
    cameraFilter.addEventListener('change', filterRecordings);
    dateFilter.addEventListener('change', filterRecordings);
    searchFilter.addEventListener('input', filterRecordings);
    clearSearchBtn.addEventListener('click', function() {
        searchFilter.value = '';
        filterRecordings();
    });
    
    // Load all recordings from the server
    function loadRecordings() {
        fetch('/api/recordings')
            .then(response => response.json())
            .then(data => {
                console
                recordings = data;
                updateDateFilter(recordings);
                console.log('Recordings:', recordings);
                displayRecordings(recordings);
            })
            .catch(error => {
                console.error('Error loading recordings:', error);
                displayNoRecordings();
            });
    }
    
    // Update the date filter dropdown with unique dates from recordings
    function updateDateFilter(recordings) {
        // Clear existing options except the first one
        while (dateFilter.options.length > 1) {
            dateFilter.remove(1);
        }
        
        // Extract unique dates
        const dates = new Set();
        recordings.forEach(recording => {
            // Extract date part (YYYY-MM-DD) from recording.date
            const date = recording.date.split('_')[0];
            dates.add(date);
        });
        
        // Add options for each unique date, sorted most recent first
        Array.from(dates)
            .sort((a, b) => new Date(b) - new Date(a))
            .forEach(date => {
                const option = document.createElement('option');
                option.value = date;
                option.textContent = formatDate(date);
                dateFilter.appendChild(option);
            });
    }
    
    // Format a date string as a readable date
    function formatDate(dateStr) {
        // Convert YYYY-MM-DD to a more readable format
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    // Format a timestamp from filename (YYYY-MM-DD_HH-MM-SS)
    function formatTimestamp(timestamp) {
        const [datePart, timePart] = timestamp.split('_');
        
        // Format date
        const dateFormatted = formatDate(datePart);
        
        // Format time
        const timeFormatted = timePart.replace(/-/g, ':');
        
        return `${dateFormatted} at ${timeFormatted}`;
    }
    
    // Display all recordings in the grid
    function displayRecordings(recordings) {
        // Clear grid
        recordingsGrid.innerHTML = '';

        console.log('Recordings:', recordings);
        console.log('Recordings.length:', recordings.length);

        
        if (recordings.length === 0) {
            displayNoRecordings();
            return;
        }
        
        noRecordingsDiv.classList.add('d-none');
        recordingsGrid.classList.remove('d-none');
        console.log('recordingsGrid:', recordingsGrid);
        
        // Add recording cards
        recordings.forEach(recording => {
            console.log("Creating recording card");
            const col = document.createElement('div');
            col.className = 'col';
            
            // Extract camera number and timestamp
            const cameraNumber = recording.filename.match(/camera_(\d+)/)[1];
            const timestamp = recording.filename.match(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}/)[0];
            
            col.innerHTML = `
                <div class="video-card">
                    <div class="video-thumbnail">
                        <img src="/api/recordings/${recording.id}/thumbnail" alt="Video thumbnail">
                        <div class="video-duration">${recording.duration || '00:00'}</div>
                    </div>
                    <div class="video-info">
                        <div class="d-flex align-items-center">
                            <span class="camera-label">Camera ${cameraNumber}</span>
                        </div>
                        <div class="video-title">${recording.filename}</div>
                        <div class="video-date">${formatTimestamp(timestamp)}</div>
                        <div class="video-actions">
                            <span class="play-btn" data-file="${recording.filename}" data-id="${recording.id}">
                                <i class="bi bi-play-circle"></i> Play
                            </span>
                            <span class="delete-btn" data-file="${recording.filename}" data-id="${recording.id}">
                                <i class="bi bi-trash"></i> Delete
                            </span>
                        </div>
                    </div>
                </div>
            `;
            console.log('col:', col);
            recordingsGrid.appendChild(col);
        });
        
        // Set up event handlers for play and delete buttons
        setupPlayButtons();
        setupDeleteButtons();
    }
    
    // Display the no recordings message
    function displayNoRecordings() {
        recordingsGrid.classList.add('d-none');
        noRecordingsDiv.classList.remove('d-none');
    }
    
    // Filter recordings based on selected filters
    function filterRecordings() {
        const camera = cameraFilter.value;
        const date = dateFilter.value;
        const search = searchFilter.value.toLowerCase();
        
        const filtered = recordings.filter(recording => {
            // Camera filter
            if (camera !== 'all' && !recording.filename.includes(`camera_${camera}_`)) {
                return false;
            }
            
            // Date filter
            if (date !== 'all' && !recording.filename.includes(date)) {
                return false;
            }
            
            // Search filter
            if (search && !recording.filename.toLowerCase().includes(search)) {
                return false;
            }
            
            return true;
        });
        
        displayRecordings(filtered);
    }
    
    // Set up play buttons
    function setupPlayButtons() {
        const playButtons = document.querySelectorAll('.play-btn');
        const videoModal = new bootstrap.Modal(document.getElementById('videoModal'));
        
        playButtons.forEach(button => {
            button.addEventListener('click', function() {
                const fileId = this.getAttribute('data-id');
                const fileName = this.getAttribute('data-file');
                
                // Set video source
                videoPlayer.src = `/api/recordings/${fileId}/play`;
                videoModalTitle.textContent = fileName;
                downloadVideoBtn.href = `/api/recordings/${fileId}/download`;
                downloadVideoBtn.setAttribute('download', fileName);
                
                // Show modal
                videoModal.show();
                
                // Play video when modal is shown
                document.getElementById('videoModal').addEventListener('shown.bs.modal', function() {
                    videoPlayer.play();
                });
                
                // Pause video when modal is hidden
                document.getElementById('videoModal').addEventListener('hidden.bs.modal', function() {
                    videoPlayer.pause();
                });
            });
        });
    }
    
    // Set up delete buttons
    function setupDeleteButtons() {
        const deleteButtons = document.querySelectorAll('.delete-btn');
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const fileId = this.getAttribute('data-id');
                currentFile = fileId;
                deleteModal.show();
            });
        });
    }
    
    // Confirm delete button handler
    confirmDeleteBtn.addEventListener('click', function() {
        if (currentFile) {
            fetch(`/api/recordings/${currentFile}`, {
                method: 'DELETE',
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Remove the deleted recording from the array
                    recordings = recordings.filter(recording => recording.id !== currentFile);
                    // Update the UI
                    bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
                    filterRecordings();
                } else {
                    alert('Failed to delete recording: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error deleting recording:', error);
                alert('Error deleting recording. Check console for details.');
            });
        }
    });
});
