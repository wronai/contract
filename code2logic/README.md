# 📦 test_project

```yaml
# Project Metadata
generated: 2026-01-02T21:50:14.111969
root: /home/claude/code2logic/test_project
files: 3
lines: 310
languages: {"python": 3}
entrypoints: ["main.py"]
```

## 📁 Module Map

```
├── main.py: [python] create_app, main, load_config +1
└── services/
    ├── auth.py: [python] User, Session, AuthService +2
    └── cart.py: [python] Product, CartItem, CartService +2
```

## 🔗 Dependencies

```yaml
main.py: [services/auth.py, services/cart.py]
```

## 📄 Modules

### 📂 (root)

#### `main.py`

```yaml
path: main.py
language: python
lines: 39/56
imports: [services.auth.AuthService, services.auth.require_auth, services.cart.CartService, services.cart.CheckoutService]
```

> Main application entry point.

**Functions:**

- `create_app(config:dict)` — Initialize and configure the application.

- `main()` — Start the server.

- `load_config() -> dict` — Load configuration from environment.

- `run_server(app, port:int)` — Run HTTP server.

---

### 📂 services

#### `auth.py`

```yaml
path: services/auth.py
language: python
lines: 88/118
imports: [hashlib, secrets, datetime.datetime... +3]
```

> User authentication and authorization.

**class `User`**


**class `Session`**


**class `AuthService`**

> Handles user authentication.

```yaml
methods:
  __init__(self, user_repo, session_store, hasher)  # init
  authenticate(self, email:str, password:str) -> Optional[Session]  # Authenticate user and create session.
  validate_token(self, token:str) -> Optional[User]  # Validate session token and return user.
  logout(self, token:str) -> bool  # Invalidate session.
  refresh_session(self, token:str) -> Optional[Session]  # Extend session expiry.
  _verify_password(self, password:str, hash:str) -> bool  # waliduje password
  _create_session(self, user:User) -> Session  # tworzy session
  _log_failed_attempt(self, email:str) -> None  # log failed attempt
  _default_hasher(password:str) -> str  # default hasher
```

**class `UnauthorizedError`(Exception)**

> Authentication required.


**Functions:**

- `require_auth(func)` — Decorator to require authentication.

---

#### `cart.py`

```yaml
path: services/cart.py
language: python
lines: 96/136
imports: [dataclasses.dataclass, typing.Optional, typing.List, datetime.datetime]
constants: [MAX_CART_ITEMS, DEFAULT_CURRENCY]
```

> Example e-commerce service for demonstration.

**class `Product`**

> Product in the catalog.


**class `CartItem`**

> Item in shopping cart.


**class `CartService`**

> Manages shopping cart operations.

```yaml
methods:
  __init__(self, product_repo, cache)  # init
  add_item(self, user_id:str, product_id:str, quantity:int) -> bool  # Add item to user's cart.
  remove_item(self, user_id:str, product_id:str) -> bool  # Remove item from cart.
  get_total(self, user_id:str) -> float  # Calculate cart total.
  clear_cart(self, user_id:str) -> None  # Clear all items from cart.
  _get_or_create_cart(self, user_id:str) -> List[CartItem]  # pobiera or create cart
  _invalidate_cache(self, user_id:str) -> None  # invalidate cache
```

**class `CheckoutService`**

> Handles checkout process.

```yaml
methods:
  __init__(self, cart_service, payment_gateway, inventory_service)  # init
  async process_checkout(self, user_id:str, payment_method:str) -> dict  # Process complete checkout flow.
  async _create_order(self, user_id:str, payment) -> Order  # tworzy order
```

**class `PaymentError`(Exception)**

> Payment processing error.


---