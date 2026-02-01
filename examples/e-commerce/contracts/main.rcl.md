# E-Commerce Platform

> Full e-commerce solution with products, orders, and payments

| Właściwość | Wartość |
|------------|---------|
| Wersja | 2.4.1 |
| Autor | Reclapp Team |
| Licencja | MIT |

---

## 📦 Encje

### Product

```yaml
# entity: Product
id              : uuid                 # @unique @auto
sku             : text                 # @unique @required
name            : text                 # @required
description     : text?
price           : money(PLN)           # @required
comparePrice    : money(PLN)?
cost            : money(PLN)?
category        : -> Category          # @required
brand           : text?
images          : text[]?
stock           : int                  # = 0
lowStockAlert   : int                  # = 10
status          : ProductStatus        # = draft
weight          : float?
dimensions      : json?
tags            : text[]?
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
```

---

### Category

```yaml
# entity: Category
id              : uuid                 # @unique @auto
name            : text                 # @required
slug            : text                 # @unique @required
description     : text?
parent          : -> Category?
image           : url?
sortOrder       : int                  # = 0
active          : bool                 # = true
```

---

### Customer

```yaml
# entity: Customer
id              : uuid                 # @unique @auto
email           : email                # @unique @required
firstName       : text                 # @required
lastName        : text                 # @required
phone           : phone?
addresses       : json[]?
defaultAddress  : json?
tags            : text[]?
notes           : text?
totalOrders     : int                  # = 0
totalSpent      : money(PLN)           # = 0
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
```

---

### Order

```yaml
# entity: Order
id              : uuid                 # @unique @auto
orderNumber     : text                 # @unique @auto
customer        : -> Customer          # @required
items           : json[]               # @required
subtotal        : money(PLN)           # @required
shipping        : money(PLN)           # = 0
tax             : money(PLN)           # = 0
discount        : money(PLN)           # = 0
total           : money(PLN)           # @required
status          : OrderStatus          # = pending
paymentStatus   : PaymentStatus        # = pending
shippingAddress : json                 # @required
billingAddress  : json?
shippingMethod  : text?
trackingNumber  : text?
notes           : text?
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
completedAt     : datetime?
```

---

### Payment

```yaml
# entity: Payment
id              : uuid                 # @unique @auto
order           : -> Order             # @required
amount          : money(PLN)           # @required
method          : PaymentMethod        # @required
status          : PaymentStatus        # = pending
transactionId   : text?
gatewayResponse : json?
createdAt       : datetime             # @auto
processedAt     : datetime?
```

---

### Cart

```yaml
# entity: Cart
id              : uuid                 # @unique @auto
sessionId       : text                 # @unique
customer        : -> Customer?
items           : json[]               # = []
subtotal        : money(PLN)           # = 0
createdAt       : datetime             # @auto
updatedAt       : datetime             # @auto
expiresAt       : datetime
```

---

### Review

```yaml
# entity: Review
id              : uuid                 # @unique @auto
product         : -> Product           # @required
customer        : -> Customer          # @required
rating          : int(1..5)            # @required
title           : text?
content         : text?
verified        : bool                 # = false
approved        : bool                 # = false
createdAt       : datetime             # @auto
```

---

### Coupon

```yaml
# entity: Coupon
id              : uuid                 # @unique @auto
code            : text                 # @unique @required
type            : CouponType           # @required
value           : float                # @required
minOrder        : money(PLN)?
maxDiscount     : money(PLN)?
usageLimit      : int?
usedCount       : int                  # = 0
validFrom       : datetime             # @required
validTo         : datetime             # @required
active          : bool                 # = true
```

---

## 🏷️ Typy wyliczeniowe

```yaml
# enum: ProductStatus
- draft          # Szkic
- active         # Aktywny
- archived       # Zarchiwizowany
- outOfStock     # Brak w magazynie
```

```yaml
# enum: OrderStatus
- pending        # Oczekujące
- confirmed      # Potwierdzone
- processing     # W realizacji
- shipped        # Wysłane
- delivered      # Dostarczone
- cancelled      # Anulowane
- refunded       # Zwrócone
```

```yaml
# enum: PaymentStatus
- pending        # Oczekująca
- processing     # W trakcie
- completed      # Zakończona
- failed         # Nieudana
- refunded       # Zwrócona
```

```yaml
# enum: PaymentMethod
- card           # Karta
- blik           # BLIK
- transfer       # Przelew
- cash           # Gotówka przy odbiorze
- paypal         # PayPal
```

```yaml
# enum: CouponType
- percentage     # Procent
- fixed          # Stała kwota
- freeShipping   # Darmowa dostawa
```

---

## 📡 Zdarzenia

### OrderCreated

```yaml
# event: OrderCreated
orderId         : uuid
customerId      : uuid
total           : float
itemCount       : int
```

### OrderStatusChanged

```yaml
# event: OrderStatusChanged
orderId         : uuid
previousStatus  : text
newStatus       : text
changedBy       : uuid?
```

### PaymentReceived

```yaml
# event: PaymentReceived
paymentId       : uuid
orderId         : uuid
amount          : float
method          : text
```

### ProductStockLow

```yaml
# event: ProductStockLow
productId       : uuid
sku             : text
currentStock    : int
threshold       : int
```

### CartAbandoned

```yaml
# event: CartAbandoned
cartId          : uuid
customerId      : uuid?
itemCount       : int
value           : float
```

---

## 🚨 Alerty

### Low Stock Alert

```yaml
# alert: LowStockAlert
entity: Product
when: stock <= lowStockAlert AND status = 'active'
notify: [email, slack]
severity: high
message: "Niski stan magazynowy: {{name}} ({{stock}} szt.)"
```

### High Value Order

```yaml
# alert: HighValueOrder
entity: Order
when: total > 5000
notify: [email]
severity: medium
message: "Zamówienie o wysokiej wartości: {{orderNumber}} - {{total}} PLN"
```

### Failed Payment

```yaml
# alert: FailedPayment
entity: Payment
when: status = 'failed'
notify: [email, slack]
severity: high
message: "Nieudana płatność dla zamówienia"
```

---

## 📊 Panele

### Sales Dashboard

```yaml
# dashboard: SalesDashboard
entity: Order
metrics: [count, sum.total, avg.total]
layout: grid
```

### Inventory Dashboard

```yaml
# dashboard: InventoryDashboard
entity: Product
metrics: [count, sum.stock, avg.price]
layout: grid
```

---

## 🌐 Konfiguracja API

```yaml
# api:
prefix: /api/v1
auth: jwt
rateLimit: 500
cors: *
```

---

## 🚀 Deployment

```yaml
# deployment:
type: docker
database: postgresql
cache: redis
```

---

## 🔐 Zmienne środowiskowe

```yaml
# env:
DATABASE_URL    : string               # @required
JWT_SECRET      : secret               # @required
STRIPE_KEY      : secret               # @required
SMTP_HOST       : string               # = localhost
REDIS_URL       : string?
```

---

*Wygenerowano przez Reclapp Studio*
