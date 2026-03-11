package com.alx.ecommerce.order.controller;

import com.alx.ecommerce.common.ApiResponse;
import com.alx.ecommerce.order.dto.AddToCartRequest;
import com.alx.ecommerce.order.dto.CartDTO;
import com.alx.ecommerce.order.service.CartService;
import com.alx.ecommerce.user.service.CustomUserDetailsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
@Tag(name = "Shopping Cart", description = "API for managing user's shopping cart")
@SecurityRequirement(name = "bearerAuth")
public class CartController {

    private final CartService cartService;
    private final CustomUserDetailsService userDetailsService; // To get user ID from authenticated principal

    private Long getUserIdFromPrincipal(UserDetails userDetails) {
        // In a real application, you might have a custom UserDetails object
        // that directly holds the user ID. For simplicity, we fetch the user
        // from the repository based on username.
        return userDetailsService.loadUserByUsername(userDetails.getUsername()).getId();
    }

    @PostMapping("/add")
    @Operation(summary = "Add item to cart", description = "Adds a product with specified quantity to the authenticated user's cart.")
    public ResponseEntity<ApiResponse<CartDTO>> addToCart(@AuthenticationPrincipal UserDetails userDetails, @Valid @RequestBody AddToCartRequest request) {
        Long userId = getUserIdFromPrincipal(userDetails);
        CartDTO cart = cartService.addToCart(userId, request);
        return new ResponseEntity<>(new ApiResponse<>(true, "Product added to cart", cart), HttpStatus.OK);
    }

    @GetMapping
    @Operation(summary = "Get user's cart", description = "Retrieves the authenticated user's current shopping cart.")
    public ResponseEntity<ApiResponse<CartDTO>> getCart(@AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserIdFromPrincipal(userDetails);
        CartDTO cart = cartService.getCartByUserId(userId);
        return new ResponseEntity<>(new ApiResponse<>(true, "Cart fetched successfully", cart), HttpStatus.OK);
    }

    @PutMapping("/update/{productId}")
    @Operation(summary = "Update cart item quantity", description = "Updates the quantity of a specific product in the user's cart. If quantity is 0 or less, the item is removed.")
    public ResponseEntity<ApiResponse<CartDTO>> updateCartItemQuantity(@AuthenticationPrincipal UserDetails userDetails,
                                                                      @PathVariable Long productId,
                                                                      @RequestParam Integer quantity) {
        Long userId = getUserIdFromPrincipal(userDetails);
        CartDTO cart = cartService.updateCartItemQuantity(userId, productId, quantity);
        return new ResponseEntity<>(new ApiResponse<>(true, "Cart item quantity updated", cart), HttpStatus.OK);
    }

    @DeleteMapping("/remove/{productId}")
    @Operation(summary = "Remove item from cart", description = "Removes a specific product from the authenticated user's cart.")
    public ResponseEntity<ApiResponse<CartDTO>> removeCartItem(@AuthenticationPrincipal UserDetails userDetails, @PathVariable Long productId) {
        Long userId = getUserIdFromPrincipal(userDetails);
        CartDTO cart = cartService.removeCartItem(userId, productId);
        return new ResponseEntity<>(new ApiResponse<>(true, "Product removed from cart", cart), HttpStatus.OK);
    }

    @DeleteMapping("/clear")
    @Operation(summary = "Clear cart", description = "Clears all items from the authenticated user's cart.")
    public ResponseEntity<ApiResponse<?>> clearCart(@AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserIdFromPrincipal(userDetails);
        cartService.clearCart(userId);
        return new ResponseEntity<>(new ApiResponse<>(true, "Cart cleared successfully"), HttpStatus.NO_CONTENT);
    }
}