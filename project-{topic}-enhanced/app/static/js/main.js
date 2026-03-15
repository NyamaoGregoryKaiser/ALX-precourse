document.addEventListener('DOMContentLoaded', function() {
    // Example of client-side JS.
    // In a full SPA, most interactions would be handled here.
    // For this Flask Jinja2 setup, it's mostly illustrative.

    // A simple function to confirm actions
    window.confirmAction = function(message) {
        return confirm(message || 'Are you sure you want to proceed?');
    };

    // Add event listener for "Add to Cart" forms if needed
    // const addToCartForms = document.querySelectorAll('.add-to-cart-form');
    // addToCartForms.forEach(form => {
    //     form.addEventListener('submit', function(event) {
    //         // Client-side validation or animation here
    //         console.log('Adding to cart...');
    //     });
    // });

    // Handle quantity input changes in cart to prevent negative values
    const quantityInputs = document.querySelectorAll('input[name="quantity"]');
    quantityInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.value < 0) {
                this.value = 0; // Or 1, depending on desired behavior
            }
            // You might want to automatically submit the form or make an AJAX call here
            // For now, the user has to click "Update" button
        });
    });

    // Simple Flask JS utility for Jinja2 filters (if not using a dedicated library)
    window.Flask = {
        filters: {}
    };
});