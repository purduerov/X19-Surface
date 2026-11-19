document.addEventListener('DOMContentLoaded', function() {
  // Setup fullscreen button actions
  const fullscreenButtons = document.querySelectorAll('.fullscreen-button');
  
  fullscreenButtons.forEach(button => {
    button.addEventListener('click', function() {
      const cameraNumber = this.getAttribute('data-camera');
      // Redirect to single camera view with the selected camera
      window.location.href = `/fullscreen-camera?camera=${cameraNumber}`;
    });
  });

  // Photo button action
  document.querySelectorAll('.photo-button').forEach(button => {
    button.addEventListener('click', async function (e) {
      e.stopPropagation(); // Prevent accidental fullscreen click

      const camera = this.getAttribute('data-camera');
      this.disabled = true;
      this.textContent = "⏳";

      try {
        const res = await fetch(`/api/photo/${camera}`, {
          method: "POST"
        });

        const data = await res.json();

        if (data.status === "ok") {
          this.textContent = "✅";
          setTimeout(() => this.textContent = "📸", 1000);
        } else {
          throw new Error("Photo failed");
        }
      } catch (err) {
        console.error(err);
        this.textContent = "❌";
        setTimeout(() => this.textContent = "📸", 1500);
      } finally {
        this.disabled = false;
      }
    });
  });
});
