document.addEventListener('DOMContentLoaded', () => {
            const audio = document.getElementById('blockSound');
            audio.play().catch(err => {
            // If autoplay is prevented, optionally handle it
            console.warn('Autoplay was blocked:', err);
            });
        });