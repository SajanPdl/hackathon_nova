(function() {
    // Inject Styles
    const style = document.createElement('style');
    style.textContent = `
        .back-to-top {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            cursor: pointer;
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 4px 15px rgba(234, 88, 12, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .back-to-top.show {
            opacity: 1;
            visibility: visible;
            bottom: 40px;
            animation: nova-pulse 2s infinite;
        }

        .back-to-top:hover {
            transform: scale(1.1) translateY(-5px);
            background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
            box-shadow: 0 0 25px rgba(234, 88, 12, 0.8), 0 0 40px rgba(6, 182, 212, 0.4);
            border-color: rgba(6, 182, 212, 0.5);
        }

        .back-to-top i {
            transition: transform 0.3s ease;
        }

        .back-to-top:hover i {
            transform: translateY(-3px);
            animation: rocket-vibrate 0.1s infinite;
        }

        @keyframes nova-pulse {
            0% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.4); }
            70% { box-shadow: 0 0 0 15px rgba(234, 88, 12, 0); }
            100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0); }
        }

        @keyframes rocket-vibrate {
            0% { transform: translateY(-3px) translateX(0); }
            25% { transform: translateY(-3px) translateX(1px); }
            50% { transform: translateY(-3px) translateX(0); }
            75% { transform: translateY(-3px) translateX(-1px); }
            100% { transform: translateY(-3px) translateX(0); }
        }

        @media (max-width: 768px) {
            .back-to-top {
                bottom: 20px;
                right: 20px;
                width: 45px;
                height: 45px;
            }
            .back-to-top.show {
                bottom: 25px;
            }
        }
    `;
    document.head.appendChild(style);

    // Create Button
    const button = document.createElement('div');
    button.className = 'back-to-top';
    button.id = 'backToTop';
    button.innerHTML = '<i class="fas fa-rocket"></i>';
    button.setAttribute('title', 'Return to Atmosphere');
    document.body.appendChild(button);

    // Scroll Logic
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            button.classList.add('show');
        } else {
            button.classList.remove('show');
        }
    });

    // Click Logic
    button.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // Brief burst effect on click
        button.style.transform = 'scale(0.9) translateY(10px)';
        setTimeout(() => {
            button.style.transform = '';
        }, 200);
    });
})();
