        // --- Utility Functions (exposed globally for HTML onclick) ---
        
        // Simple JavaScript for mobile menu toggling
        function toggleMenu() {
            const menu = document.getElementById('mobile-menu');
            menu.classList.toggle('hidden');
        }
        
        // Expose toggleMenu globally for inline onclick attributes
        window.toggleMenu = toggleMenu; 

        // --- Core Application Logic ---
        
        let cart = {};
        // NEW GLOBAL STATE FOR DISCOUNT
        let discountPercentage = 0;
        const VALID_COUPON_CODE = 'SOHAN420';
        const MIN_PURCHASE = 500; 

        // DOM elements
        const cartCountEl = document.getElementById('cart-count');
        const cartTotalEl = document.getElementById('cart-total');
        const cartItemsListEl = document.getElementById('cart-items-list');
        const emptyCartMessageEl = document.getElementById('empty-cart-message');
        const checkoutBtn = document.getElementById('checkout-btn');
        const successMessageEl = document.getElementById('success-message');
        const checkoutModal = document.getElementById('checkout-modal'); 
        const numberErrorEl = document.getElementById('number-error'); 
        
        // PRICE BREAKDOWN ELEMENTS (MAIN)
        const rawTotalEl = document.getElementById('raw-total');
        const discountDisplayEl = document.getElementById('discount-display');
        const discountAmountEl = document.getElementById('discount-amount');
        
        // PRICE BREAKDOWN ELEMENTS (MODAL)
        const modalRawTotalEl = document.getElementById('modal-raw-total');
        const modalDiscountDisplayEl = document.getElementById('modal-discount-display');
        const modalDiscountAmountEl = document.getElementById('modal-discount-amount');
        const modalCartTotalEl = document.getElementById('modal-cart-total'); 
        const couponInput = document.getElementById('coupon-input');
        const applyCouponBtn = document.getElementById('apply-coupon-btn');
        const couponMessageEl = document.getElementById('coupon-message');
        
        // STICKY BAR ELEMENTS
        const stickyCheckoutBar = document.getElementById('sticky-checkout-bar');
        const stickyItemCountEl = document.getElementById('sticky-item-count');
        const stickyCartTotalEl = document.getElementById('sticky-cart-total');
        
        // COUPON ELEMENTS
        const copyNotificationEl = document.getElementById('copy-notification');


        const bnNumerals = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        
        /**
         * Converts number to Bengali formatted string (e.g., 1200.00 -> ১,২০০.০০).
         * Used for currency/total price.
         */
        function formatToBengali(number) {
            let parts = number.toFixed(2).split('.');
            // Format integer part with commas (thousand separator)
            let integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            
            // Convert digits to Bengali numerals
            let bengaliFormatted = Array.from(integerPart).map(char => {
                const digit = parseInt(char);
                return isNaN(digit) ? char : bnNumerals[digit];
            }).join('');
            
            return bengaliFormatted + '.' + Array.from(parts[1]).map(digit => bnNumerals[parseInt(digit)]).join('');
        }

        /**
         * Converts integer to Bengali number string (e.g., 5 -> ৫).
         * Used for item count.
         */
        function numberToBengali(number) {
            return String(Math.round(number)).split('').map(char => {
                const digit = parseInt(char);
                return isNaN(digit) ? char : bnNumerals[digit];
            }).join('');
        }

        /**
         * Renders the current state of the cart to the UI, applying discount if applicable.
         */
        function updateCartUI() {
            let totalItems = 0;
            let rawTotal = 0;
            
            cartItemsListEl.innerHTML = ''; // Clear existing items
            const itemEntries = Object.entries(cart);

            itemEntries.forEach(([id, item]) => {
                totalItems += item.quantity;
                rawTotal += item.price * item.quantity;
                
                // Renders the cart item dynamically
                const itemEl = document.createElement('div');
                itemEl.className = 'flex flex-col sm:flex-row justify-between items-start sm:items-center text-gray-700 border-b border-gray-100 py-2';
                itemEl.innerHTML = `
                    <span class="text-base font-medium mb-1 sm:mb-0">${item.name}</span>
                    <div class="flex items-center space-x-3 mt-1 sm:mt-0">
                        <!-- Quantity Controls -->
                        <div class="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                            <button onclick="decreaseQuantity('${id}')" class="text-sm w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition duration-150">-</button>
                            <span class="text-sm font-medium px-2">${numberToBengali(item.quantity)}</span>
                            <button onclick="increaseQuantity('${id}')" class="text-sm w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition duration-150">+</button>
                        </div>
                        <!-- Price -->
                        <span class="text-base font-semibold w-24 text-right">৳ ${formatToBengali(item.price * item.quantity)}</span>
                        <!-- Remove Button -->
                        <button onclick="removeItem('${id}')" class="text-sm w-6 h-6 flex items-center justify-center text-red-500 hover:text-red-700 transition duration-150" aria-label="Remove item">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                `;
                cartItemsListEl.appendChild(itemEl);
            });
            
            // --- Discount Calculation ---
            let finalPrice = rawTotal;
            let discount = 0;
            let isDiscountApplicable = discountPercentage > 0 && rawTotal >= MIN_PURCHASE;

            if (isDiscountApplicable) {
                discount = rawTotal * (discountPercentage / 100);
                finalPrice = rawTotal - discount;
            } else {
                // If cart changes and total is now below minimum, reset discount state
                if (discountPercentage > 0) {
                    discountPercentage = 0;
                    // Reset coupon UI in modal if discount is no longer applicable
                    if (couponInput) {
                         couponInput.value = '';
                         couponInput.disabled = false;
                         applyCouponBtn.disabled = false;
                         couponMessageEl.textContent = '';
                    }
                }
            }

            // --- Update UI Elements (Main) ---
            if (itemEntries.length === 0) {
                emptyCartMessageEl.style.display = 'block';
                checkoutBtn.disabled = true;
                // Show sticky bar only if items exist, otherwise hide it
                stickyCheckoutBar.classList.add('hidden'); 
            } else {
                emptyCartMessageEl.style.display = 'none';
                checkoutBtn.disabled = false;
                stickyCheckoutBar.classList.remove('hidden'); 
            }

            // Update Price Breakdown (Main)
            rawTotalEl.textContent = formatToBengali(rawTotal);
            cartTotalEl.textContent = formatToBengali(finalPrice);

            if (isDiscountApplicable) {
                discountDisplayEl.classList.remove('hidden');
                discountAmountEl.textContent = `- ৳ ${formatToBengali(discount)}`;
                // Update Modal Breakdown
                modalDiscountDisplayEl.classList.remove('hidden');
                modalDiscountAmountEl.textContent = `- ৳ ${formatToBengali(discount)}`;
            } else {
                discountDisplayEl.classList.add('hidden');
                modalDiscountDisplayEl.classList.add('hidden');
            }
            
            // Update UI Elements (Header and Sticky Bar)
            stickyItemCountEl.textContent = numberToBengali(totalItems);
            stickyCartTotalEl.textContent = formatToBengali(finalPrice); // Show final price on sticky bar
            cartCountEl.textContent = numberToBengali(totalItems); 

            // Update Modal UI
            modalRawTotalEl.textContent = formatToBengali(rawTotal);
            modalCartTotalEl.textContent = formatToBengali(finalPrice);
        }

        /**
         * Handles the click event for 'Add to Cart' buttons.
         */
        function handleAddToCart(event) {
            const button = event.currentTarget;
            const id = button.getAttribute('data-id');
            const name = button.getAttribute('data-name');
            const price = parseInt(button.getAttribute('data-price'));

            if (cart[id]) {
                cart[id].quantity += 1;
            } else {
                cart[id] = { id, name, price, quantity: 1 };
            }

            updateCartUI();
            showSuccessMessage();
        }
        
        // --- Cart Control Functions ---
        function increaseQuantity(id) {
            if (cart[id]) {
                cart[id].quantity += 1;
                updateCartUI();
            }
        }

        function decreaseQuantity(id) {
            if (cart[id] && cart[id].quantity > 1) {
                cart[id].quantity -= 1;
            } else if (cart[id] && cart[id].quantity === 1) {
                delete cart[id];
            }
            updateCartUI();
        }

        function removeItem(id) {
            if (cart[id]) {
                delete cart[id];
                updateCartUI();
            }
        }
        
        /**
         * Shows a temporary success message in the corner.
         */
        function showSuccessMessage() {
            clearTimeout(window.successTimer);
            successMessageEl.classList.remove('hidden', 'fade-out');
            
            window.successTimer = setTimeout(() => {
                successMessageEl.classList.add('fade-out');
                setTimeout(() => {
                    successMessageEl.classList.add('hidden');
                    successMessageEl.classList.remove('fade-out');
                }, 500); 
            }, 2000);
        }

        // --- Coupon Code Functionality (Main Bar Copy) ---
        function copyCouponCode() {
            const code = document.getElementById('coupon-code').textContent.trim();
            const tempInput = document.createElement('input');
            document.body.appendChild(tempInput);
            tempInput.setAttribute('value', code);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            
            // Show notification
            copyNotificationEl.classList.remove('hidden');
            setTimeout(() => {
                copyNotificationEl.classList.add('hidden');
            }, 1500);
        }
        
        // --- Coupon Modal Functions ---
        const couponModal = document.getElementById('coupon-modal');

        function openCouponModal() {
            couponModal.classList.remove('hidden');
            setTimeout(() => {
                couponModal.classList.add('active');
            }, 10);
        }

        function closeCouponModal() {
            couponModal.classList.remove('active');
             setTimeout(() => {
                couponModal.classList.add('hidden');
            }, 300); 
        }
        
        function copyModalCouponCode() {
            const code = document.getElementById('modal-coupon-code').textContent.trim();
            const tempInput = document.createElement('input');
            document.body.appendChild(tempInput);
            tempInput.setAttribute('value', code);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            
            // Show notification
            copyNotificationEl.textContent = 'কুপন কোড (SOHAN420) কপি করা হয়েছে!';
            copyNotificationEl.classList.remove('hidden');
            setTimeout(() => {
                copyNotificationEl.classList.add('hidden');
            }, 1500);
        }
        
        function closeFloatingDiscount(event) {
            if (event) event.stopPropagation();
            document.getElementById('floating-discount-card').style.display = 'none';
        }
        
        // --- Coupon Application Logic ---
        function applyCoupon() {
            const coupon = couponInput.value.trim().toUpperCase();
            let rawTotal = Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            if (rawTotal < MIN_PURCHASE) {
                couponMessageEl.className = 'text-xs mt-1 text-red-600';
                couponMessageEl.textContent = `কুপনটি ব্যবহার করতে ৳ ${formatToBengali(MIN_PURCHASE)} টাকার বেশি কেনাকাটা করতে হবে।`;
                discountPercentage = 0;
                updateCartUI(); 
                return;
            }

            if (coupon === VALID_COUPON_CODE) {
                discountPercentage = 20;
                couponMessageEl.className = 'text-xs mt-1 text-green-600 font-semibold';
                couponMessageEl.textContent = `কুপন সফল! আপনি ২০% ছাড় পেয়েছেন।`;
                couponInput.disabled = true;
                applyCouponBtn.disabled = true;
            } else {
                discountPercentage = 0;
                couponMessageEl.className = 'text-xs mt-1 text-red-600';
                couponMessageEl.textContent = 'ভুল কুপন কোড।';
                couponInput.disabled = false;
                applyCouponBtn.disabled = false;
            }
            updateCartUI();
        }

        // --- Checkout Modal Functions ---

        function openCheckoutModal() {
            if (Object.keys(cart).length === 0) {
                return;
            }
            // Reset modal specific elements before opening
            numberErrorEl.classList.add('hidden');
            
            // Ensure coupon input state reflects current global state
            if(discountPercentage > 0) {
                couponInput.value = VALID_COUPON_CODE;
                couponInput.disabled = true;
                applyCouponBtn.disabled = true;
                couponMessageEl.className = 'text-xs mt-1 text-green-600 font-semibold';
                couponMessageEl.textContent = `কুপন (${VALID_COUPON_CODE}) সফলভাবে প্রয়োগ করা আছে।`;
            } else {
                couponInput.value = '';
                couponInput.disabled = false;
                applyCouponBtn.disabled = false;
                couponMessageEl.textContent = '';
            }

            updateCartUI(); // Update final price/breakdown before modal opens
            
            checkoutModal.classList.remove('hidden');
            setTimeout(() => {
                checkoutModal.classList.add('active');
            }, 10);
        }

        function closeCheckoutModal() {
            checkoutModal.classList.remove('active');
             setTimeout(() => {
                checkoutModal.classList.add('hidden');
            }, 300); 
        }

     function handleOrderSubmission(event) {
        event.preventDefault(); 
        
        const name = document.getElementById('customer-name').value;
        const numberInput = document.getElementById('customer-number');
        const number = numberInput.value.trim();
        const address = document.getElementById('customer-address').value;
        const total = cartTotalEl.textContent; // Final price from main display
        const submitButton = event.submitter;

        // 11-Digit Validation
        const numberPattern = /^[0-9]{11}$/;

        if (!numberPattern.test(number)) {
            numberErrorEl.classList.remove('hidden');
            numberInput.reportValidity(); 
            return;
        }
        numberErrorEl.classList.add('hidden'); 
        
        submitButton.disabled = true;
        submitButton.textContent = 'অর্ডার প্রক্রিয়া চলছে...';
        
        // --- START OF REQUIRED CHANGE FOR GOOGLE FORM DATA ---
        
        // Create a human-readable summary string of the cart items
        const orderDetailsArray = Object.values(cart).map(item => {
            return `${item.name} (${numberToBengali(item.quantity)}টি x ৳${formatToBengali(item.price)})`;
        });
        const orderSummary = orderDetailsArray.join('; ');
        
        // --- END OF REQUIRED CHANGE FOR GOOGLE FORM DATA ---

        setTimeout(() => {
            // --------------------------
            // ✅ Google Form Submission (Simulated, as actual submission is outside control)
            // --------------------------
            const formData = new FormData();
            formData.append('entry.260989365', name);       // Name field
            formData.append('entry.1366617880', number);    // Phone field
            formData.append('entry.1200344149', address);   // Address field
            
            // --- UPDATED: Pass the clean string instead of the raw JSON object ---
            formData.append('entry.2023324239', orderSummary); // Order details as clean string
            // ---------------------------------------------------------------------

            formData.append('entry.1477066146', total);      // Total price

            // Using fetch with no-cors mode, as cross-origin POST to Google Forms is restricted
            fetch('https://docs.google.com/forms/d/e/1FAIpQLSdX46pqs5XZbpBUTUIXjIHIb1XxmT-Axp7mE_NCNHzB67xlDQ/formResponse', {
                method: 'POST',
                mode: 'no-cors',
                body: formData
            })
            .then(() => {
                console.log('✅ Google Form submission attempt initiated (no-cors mode)');
            })
            .catch(err => {
                console.error('❌ Google Form submission failed', err);
            });

            // --------------------------
            // Confirmation Message Box 
            // --------------------------
            const confirmationBox = document.createElement('div');
            confirmationBox.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]'; 
            confirmationBox.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full text-center">
                    <h4 class="text-xl font-bold text-green-600 mb-3">✅ সফলভাবে অর্ডার করা হয়েছে!</h4>
                    <p class="text-gray-700 mb-4 font-semibold">পরিশোধযোগ্য মূল্য: ৳ ${total}</p>
                    <p class="text-sm text-gray-600 mb-4 text-left break-words">আপনার দেওয়া তথ্য: <br> 
                        নাম: ${name} <br> ফোন: ${number} <br> ঠিকানা: ${address.substring(0, 50)}...</p>
                    <p class="text-sm text-gray-500">আপনাকে খুব দ্রুত কল করে অর্ডারটি নিশ্চিত করা হবে।</p>
                    <button class="btn-primary mt-4 px-4 py-2 rounded-lg" onclick="this.closest('.fixed').remove(); closeCheckoutModal(); window.location.reload();">ধন্যবাদ! (পেজ রিফ্রেশ করুন)</button>
                </div>
            `;
            document.body.appendChild(confirmationBox);

            // Clear the cart locally and reset state
            cart = {};
            discountPercentage = 0;
            updateCartUI();
            document.getElementById('checkout-form').reset();
            
            submitButton.disabled = false;
            submitButton.textContent = 'অর্ডার নিশ্চিত করুন';
        }, 1500); 
    }


        // --- Initialization ---
        
        // Simple Intersection Observer for animation (Professional touch)
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in-active');
                    entry.target.style.animationPlayState = 'running';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.addEventListener('DOMContentLoaded', () => {
            // 1. Attach event listeners to all 'Add to Cart' buttons
            const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
            addToCartButtons.forEach(button => {
                button.addEventListener('click', handleAddToCart);
            });
            
            // 2. Attach open function to checkout button
            document.getElementById('checkout-btn').addEventListener('click', openCheckoutModal);

            // 3. Initialize the cart display
            updateCartUI();

            // 4. Set up animations for sections (Initial delay is in the HTML style attribute)
            document.querySelectorAll('.animate-fade-in').forEach(section => {
                // Remove initial opacity and transform styles to rely on Intersection Observer
                section.style.opacity = '0';
                section.style.transform = 'translateY(20px)';
                observer.observe(section);
            });

            // 5. Attach event listener for mobile menu button
            document.getElementById('mobile-menu-btn').addEventListener('click', toggleMenu);
        });


        // --- Utility Functions (exposed globally for HTML onclick) ---
        window.increaseQuantity = increaseQuantity;
        window.decreaseQuantity = decreaseQuantity;
        window.removeItem = removeItem;
        window.handleOrderSubmission = handleOrderSubmission;
        window.closeCheckoutModal = closeCheckoutModal;
        window.openCheckoutModal = openCheckoutModal; 
        window.copyCouponCode = copyCouponCode; 
        window.closeFloatingDiscount = closeFloatingDiscount; 
        window.openCouponModal = openCouponModal;
        window.closeCouponModal = closeCouponModal;
        window.copyModalCouponCode = copyModalCouponCode;
        window.applyCoupon = applyCoupon;