document.addEventListener('DOMContentLoaded', () => {
    const hero = document.querySelector('.hero');
    const sharpBubble = document.querySelector('.hero-bg-sharp-bubble');

    if (hero && sharpBubble) {
        let mx = 0;
        let my = 0;
        
        let bx = 0;
        let by = 0;
        
        const lerpFactor = 0.08; 
        
        let isVisible = false;

        let isMoving = false;

        // --- ВІДСТЕЖЕННЯ МИШІ ---
        hero.addEventListener('mousemove', (e) => {
            mx = e.clientX;
            my = e.clientY;
            
            if (!isVisible) {
                isVisible = true;
                sharpBubble.style.setProperty('--mask-opacity', '1.0');
            }
        });

        hero.addEventListener('mouseleave', () => {
            isVisible = false;
            mx = -100;
            my = -100; 
            sharpBubble.style.setProperty('--mask-opacity', '0.0');
        });

        // --- ГОЛОВНИЙ ЦИКЛ АНІМАЦІЇ  ---
        function updateLiquidFocus() {
            if (isVisible) {

                const rect = hero.getBoundingClientRect();
                const heroWidth = rect.width;
                const heroHeight = rect.height;

                bx += (mx - bx) * lerpFactor;
                by += (my - by) * lerpFactor;

                const vx = mx - bx;
                const vy = my - by;
                const velocity = Math.min(100, Math.sqrt(vx*vx + vy*vy));
                
                const distortionPower = 0.02;
                const wobbleDistortion = 1.0 + (velocity * distortionPower);
                
                const maskXPercent = ((bx - rect.left) / heroWidth) * 100;
                const maskYPercent = ((by - rect.top) / heroHeight) * 100;

                sharpBubble.style.setProperty('--mask-x', `${maskXPercent}%`);
                sharpBubble.style.setProperty('--mask-y', `${maskYPercent}%`);
                sharpBubble.style.setProperty('--mask-wobble-w', wobbleDistortion.toFixed(3));
            }

            requestAnimationFrame(updateLiquidFocus);
        }

        updateLiquidFocus();
    }
});
