document.addEventListener('DOMContentLoaded', () => {
    const hero = document.querySelector('.hero');
    const sharpBubble = document.querySelector('.hero-bg-sharp-bubble');

    if (hero && sharpBubble) {
        hero.addEventListener('mousemove', (e) => {
            const rect = hero.getBoundingClientRect();
            const heroWidth = rect.width;
            const heroHeight = rect.height;

            const mouseXPercent = ((e.clientX - rect.left) / heroWidth) * 100;
            const mouseYPercent = ((e.clientY - rect.top) / heroHeight) * 100;

            const bubbleSize = '15vw';

            sharpBubble.style.clipPath = `circle(${bubbleSize} at ${mouseXPercent}% ${mouseYPercent}%)`;
        });

        hero.addEventListener('mouseleave', () => {
            sharpBubble.style.clipPath = 'circle(0% at 50% 50%)';
        });
    }
});
