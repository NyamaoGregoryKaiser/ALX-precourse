```yaml
openapi: 3.0.0
info:
  title: Payment Processing System API
  description: Comprehensive API for managing users, merchants, payment methods, and transactions.
  version: 1.0.0
servers:
  - url: http://localhost:5000/api/v1
    description: Local Development Server
  - url: https://api.yourdomain.com/api/v1
    description: Production Server

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        email:
          type: string
          format: email
        type:
          type: string
          enum: [user, merchant, admin]
        status:
          type: string
          enum: [active, inactive, suspended]
        merchant_id:
          type: string
          format: uuid
          nullable: true
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
      required:
        - id
        - name
        - email
        - type
        - status
    Merchant:
      type: object
      properties:
        id:
          type: string
          format: uuid
        user_id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
          nullable: true
        webhook_url:
          type: string
          format: uri
          nullable: true
        status:
          type: string
          enum: [active, inactive, suspended]
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
      required:
        - id
        - user_id
        - name
        - status
    PaymentMethod:
      type: object
      properties:
        id:
          type: string
          format: uuid
        user_id:
          type: string
          format: uuid
        type:
          type: string
          enum: [card, bank_account]
        card_holder_name:
          type: string
          description: Encrypted card holder name, or tokenized data.
        card_last_four:
          type: string
          description: Last four digits of the card (display only).
        card_brand:
          type: string
        is_default:
          type: boolean
        status:
          type: string
          enum: [active, inactive, expired]
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
      required:
        - id
        - user_id
        - type
        - status
    Transaction:
      type: object
      properties:
        id:
          type: string
          format: uuid
        user_id:
          type: string
          format: uuid
        merchant_id:
          type: string
          format: uuid
        payment_method_id:
          type: string
          format: uuid
          nullable: true
        amount:
          type: number
          format: float
        currency:
          type: string
          pattern: '^[A-Z]{3}$'
        description:
          type: string
          nullable: true
        type:
          type: string
          enum: [charge, refund]
        status:
          type: string
          enum: [pending, completed, failed, refunded, voided]
        gateway_transaction_id:
          type: string
          nullable: true
        parent_transaction_id:
          type: string
          format: uuid
          nullable: true
        gateway_response:
          type: object
          nullable: true
          description: Full JSON response from the payment gateway.
        card_last_four:
          type: string
          nullable: true
        card_brand:
          type: string
          nullable: true
        card_holder_name:
          type: string
          nullable: true
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
      required:
        - id
        - user_id
        - merchant_id
        - amount
        - currency
        - type
        - status
    Error:
      type: object
      properties:
        status:
          type: string
          example: error
        code:
          type: string
          example: GENERIC_ERROR
        message:
          type: string
          example: Something went wrong.
  responses:
    UnauthorizedError:
      description: Authentication required or token invalid/expired.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
            example: { status: "error", code: "UNAUTHENTICATED", message: "You are not logged in! Please log in to get access." }
    ForbiddenError:
      description: Insufficient permissions to perform the action.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
            example: { status: "error", code: "UNAUTHORIZED_ACTION", message: "You do not have permission to perform this action." }
    NotFoundError:
      description: Resource not found.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
            example: { status: "error", code: "NOT_FOUND", message: "Resource not found." }
    BadRequestError:
      description: Invalid request parameters or body.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
            example: { status: "error", code: "VALIDATION_FAILED", message: "Invalid input data." }

tags:
  - name: Authentication
    description: User registration and login
  - name: Users
    description: User profile management
  - name: Merchants
    description: Merchant account management
  - name: Payment Methods
    description: User's saved payment methods
  - name: Transactions
    description: Core payment processing operations
  - name: Webhooks
    description: Receiving and managing webhook notifications

paths:
  /auth/register:
    post:
      tags:
        - Authentication
      summary: Register a new user or merchant
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
                type:
                  type: string
                  enum: [user, merchant]
                  default: user
              required:
                - name
                - email
                - password
      responses:
        '201':
          description: User registered successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: success
                  token:
                    type: string
                  data:
                    type: object
                    properties:
                      user:
                        $ref: '#/components/schemas/User'
        '400':
          $ref: '#/components/responses/BadRequestError'
        '409':
          description: User with email already exists
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
                example: { status: "error", code: "DUPLICATE_EMAIL", message: "User with that email already exists." }
  /auth/login:
    post:
      tags:
        - Authentication
      summary: Log in an existing user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
              required:
                - email
                - password
      responses:
        '200':
          description: User logged in successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: success
                  token:
                    type: string
                  data:
                    type: object
                    properties:
                      user:
                        $ref: '#/components/schemas/User'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
  /auth/logout:
    get:
      tags:
        - Authentication
      summary: Log out the current user
      security:
        - bearerAuth: []
      responses:
        '200':
          description: User logged out successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: success
                  message:
                    type: string
                    example: Logged out successfully
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  /transactions:
    get:
      tags:
        - Transactions
      summary: Get all transactions (with filters)
      security:
        - bearerAuth: []
      parameters:
        - in: query
          name: status
          schema:
            type: string
            enum: [pending, completed, failed, refunded, voided]
          description: Filter by transaction status
        - in: query
          name: type
          schema:
            type: string
            enum: [charge, refund]
          description: Filter by transaction type
        - in: query
          name: merchantId
          schema:
            type: string
            format: uuid
          description: Filter by merchant ID (Admin/Merchant only)
        - in: query
          name: userId
          schema:
            type: string
            format: uuid
          description: Filter by user ID (Admin only)
        - in: query
          name: page
          schema:
            type: integer
            default: 1
          description: Page number for pagination
        - in: query
          name: limit
          schema:
            type: integer
            default: 20
          description: Number of items per page
        - in: query
          name: sortBy
          schema:
            type: string
            default: created_at
          description: Field to sort by
        - in: query
          name: sortOrder
          schema:
            type: string
            enum: [asc, desc]
            default: desc
          description: Sort order
      responses:
        '200':
          description: List of transactions
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: success
                  results:
                    type: integer
                  data:
                    type: object
                    properties:
                      transactions:
                        type: array
                        items:
                          $ref: '#/components/schemas/Transaction'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'
    post:
      tags:
        - Transactions
      summary: Create a new payment transaction
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                amount:
                  type: number
                  format: float
                  minimum: 0.01
                currency:
                  type: string
                  pattern: '^[A-Z]{3}$'
                  description: ISO 4217 currency code (e.g., USD, EUR)
                description:
                  type: string
                  nullable: true
                merchantId:
                  type: string
                  format: uuid
                  description: ID of the merchant to pay.
                paymentMethodId:
                  type: string
                  format: uuid
                  nullable: true
                  description: Optional. ID of a saved payment method. If provided, card details are not needed.
                cardHolderName:
                  type: string
                  description: Required if paymentMethodId is not provided.
                cardNumber:
                  type: string
                  pattern: '^\d{13,19}$' # Basic card number pattern
                  description: Required if paymentMethodId is not provided.
                expiryMonth:
                  type: integer
                  minimum: 1
                  maximum: 12
                  description: Required if paymentMethodId is not provided.
                expiryYear:
                  type: integer
                  description: Required if paymentMethodId is not provided.
                cvv:
                  type: string
                  pattern: '^\d{3,4}$' # Basic CVV pattern
                  description: Required for all card payments (not stored on server).
              required:
                - amount
                - currency
                - merchantId
              oneOf: # Either paymentMethodId OR card details must be present
                - required: [paymentMethodId]
                - required: [cardHolderName, cardNumber, expiryMonth, expiryYear, cvv]
      responses:
        '201':
          description: Transaction created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: success
                  data:
                    type: object
                    properties:
                      transaction:
                        $ref: '#/components/schemas/Transaction'
        '400':
          $ref: '#/components/responses/BadRequestError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'
        '404':
          description: Merchant or Payment Method not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
                example: { status: "error", code: "MERCHANT_NOT_FOUND", message: "Merchant not found." }
        '500':
          description: Internal server error or payment gateway error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
                example: { status: "error", code: "GATEWAY_DECLINED", message: "Payment declined by gateway." }

  /transactions/{transactionId}:
    get:
      tags:
        - Transactions
      summary: Get a single transaction by ID
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: transactionId
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the transaction to retrieve.
      responses:
        '200':
          description: Transaction retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: success
                  data:
                    type: object
                    properties:
                      transaction:
                        $ref: '#/components/schemas/Transaction'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'
        '404':
          $ref: '#/components/responses/NotFoundError'

  /transactions/{transactionId}/refund:
    post:
      tags:
        - Transactions
      summary: Refund a completed transaction
      security:
        - bearerAuth: []
      parameters:
        - in: path
          name: transactionId
          schema:
            type: string
            format: uuid
          required: true
          description: ID of the original transaction to refund.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                amount:
                  type: number
                  format: float
                  minimum: 0.01
                  nullable: true
                  description: Optional. Amount to refund. If not provided, defaults to full remaining amount.
                reason:
                  type: string
                  nullable: true
                  description: Reason for the refund.
              required: []
      responses:
        '200':
          description: Refund processed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: success
                  data:
                    type: object
                    properties:
                      refund:
                        $ref: '#/components/schemas/Transaction'
        '400':
          $ref: '#/components/responses/BadRequestError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'
        '404':
          description: Original transaction not found or not eligible for refund.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
                example: { status: "error", code: "TRANSACTION_NOT_FOUND", message: "Completed transaction not found or not eligible for refund." }
        '500':
          description: Internal server error or payment gateway error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
                example: { status: "error", code: "GATEWAY_REFUND_FAILED", message: "Refund failed by gateway." }

  /webhooks/incoming/{source}:
    post:
      tags:
        - Webhooks
      summary: Receive incoming webhooks from external services
      description: This endpoint is for external payment gateways or services to send notifications. It requires signature verification for security.
      parameters:
        - in: path
          name: source
          schema:
            type: string
          required: true
          description: Identifier for the webhook source (e.g., 'stripe', 'mock-gateway').
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              description: Generic webhook payload from the external service. Structure varies by source.
      responses:
        '200':
          description: Webhook received and processed successfully.
          content:
            application/json:
              schema:
                type: object
                properties:
                  received:
                    type: boolean
                    example: true
                  message:
                    type: string
                    example: Webhook processed.
        '400':
          $ref: '#/components/responses/BadRequestError'
        '403':
          description: Invalid webhook signature.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
                example: { status: "error", code: "INVALID_WEBHOOK_SIGNATURE", message: "Webhook signature verification failed." }
        '500':
          description: Internal server error during webhook processing.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

```