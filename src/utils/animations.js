// Simple animation utility for staggered animations

export const ANIMATION_DURATION = 300; // ms

/**
 * Returns a delay based on index for staggered animations
 * @param {number} index - The element index 
 * @param {number} baseDelay - Base delay in ms
 * @returns {number} - Calculated delay in ms
 */
export const getStaggeredDelay = (index, baseDelay = 100) => {
  return index * baseDelay;
};

/**
 * Animates elements with a CSS class in a staggered manner
 * @param {string} selector - CSS selector for elements to animate
 * @param {string} animationClass - CSS class with the animation
 * @param {number} baseDelay - Base delay between animations
 */
export const animateElementsStaggered = (selector, animationClass, baseDelay = 100) => {
  const elements = document.querySelectorAll(selector);
  
  elements.forEach((el, index) => {
    setTimeout(() => {
      el.classList.add(animationClass);
    }, getStaggeredDelay(index, baseDelay));
  });
};