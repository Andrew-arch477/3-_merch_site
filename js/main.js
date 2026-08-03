document.addEventListener('DOMContentLoaded', () => {
    const images = document.querySelectorAll('.carousel-image');
    let currentIndex = 0;

    function showNextImage() {
        // Прибираємо клас active з поточного зображення
        images[currentIndex].classList.remove('active');
        
        // Обчислюємо індекс наступного зображення (по колу)
        currentIndex = (currentIndex + 1) % images.length;
        
        // Додаємо клас active наступному зображенню
        images[currentIndex].classList.add('active');
    }

    // Запускаємо зміну кожні 3000 мс (3 секунди)
    setInterval(showNextImage, 3000);
});   