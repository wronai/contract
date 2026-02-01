# e-commerce

> Generated from 32 files

| Właściwość | Wartość |
|------------|---------|
| Wersja | 1.0.0 |
| Utworzono | 2026-02-01 |

---

## 📦 Encje

### Order

```yaml
# entity: Order
id              : text                 # @required
orderNumber     : text                 # @required
customerId      : text                 # @required
email           : text                 # @required
status          : text                 # @required
fulfillmentStatus: text                 # @required
paymentStatus   : text                 # @required
subtotal        : int                  # @required
shippingTotal   : int                  # @required
taxTotal        : int                  # @required
discountTotal   : int                  # @required
total           : int                  # @required
currency        : text                 # @required
shippingAddressId: text                 # @required
billingAddressId: text                 # @required
notes           : text?
metadata        : record<string, any>?
placedAt        : text                 # @required
createdAt       : text                 # @required
updatedAt       : text?
```

### Product

```yaml
# entity: Product
id              : text                 # @required
sku             : text                 # @required
name            : text                 # @required
description     : text?
price           : int                  # @required
compareAtPrice  : int?
cost            : int?
categoryId      : text                 # @required
brandId         : text?
images          : record<string, any>  # @required
attributes      : record<string, any>?
status          : text                 # @required
publishedAt     : text?
createdAt       : text                 # @required
updatedAt       : text?
```

### Customer

```yaml
# entity: Customer
id              : text                 # @required
email           : text                 # @required
firstName       : text                 # @required
lastName        : text                 # @required
phone           : text?
defaultAddressId: text?
tags            : text?
totalOrders     : int                  # @required
totalSpent      : int                  # @required
lastOrderAt     : text?
createdAt       : text                 # @required
updatedAt       : text?
```

### OrderItem

```yaml
# entity: OrderItem
id              : text                 # @required
orderId         : text                 # @required
productId       : text                 # @required
sku             : text                 # @required
name            : text                 # @required
quantity        : int                  # @required
unitPrice       : int                  # @required
total           : int                  # @required
fulfillmentStatus: text                 # @required
createdAt       : text                 # @required
updatedAt       : text?
```

### Shipment

```yaml
# entity: Shipment
id              : text                 # @required
orderId         : text                 # @required
carrier         : text                 # @required
trackingNumber  : text?
status          : text                 # @required
shippedAt       : text?
deliveredAt     : text?
items           : record<string, any>  # @required
createdAt       : text                 # @required
updatedAt       : text?
```

### Cart

```yaml
# entity: Cart
id              : text                 # @required
sessionId       : text                 # @required
customerId      : text?
items           : record<string, any>  # @required
subtotal        : int                  # @required
currency        : text                 # @required
expiresAt       : text                 # @required
createdAt       : text                 # @required
updatedAt       : text?
```

### Category

```yaml
# entity: Category
id              : text                 # @required
name            : text                 # @required
slug            : text                 # @required
parentId        : text?
description     : text?
imageUrl        : text?
sortOrder       : int                  # @required
createdAt       : text                 # @required
updatedAt       : text?
```

### Inventory

```yaml
# entity: Inventory
id              : text                 # @required
productId       : text                 # @required
warehouseId     : text                 # @required
quantity        : int                  # @required
reservedQuantity: int                  # @required
lowStockThreshold: int                  # @required
createdAt       : text                 # @required
updatedAt       : text?
```

---

*Wygenerowano przez Reclapp Studio*