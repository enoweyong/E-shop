const assert = require("assert");
const Product = require("./backend/Product");
const Customer = require("./backend/Customer");
const Admin = require("./backend/Admin");
const Payment = require("./backend/Payment");
const ECommerceSystem = require("./backend/EcommerceSystem");
const Checkout = require("./backend/Checkout");
const Category = require("./backend/Category");
const ProductCatalog = require("./backend/ProductCatalog");
const ShoppingCart = require("./backend/ShoppingCart");
const CartItem = require("./backend/CartItem");
const Order = require("./backend/Order");
const OrderItem = require("./backend/OrderItem");
const User = require("./backend/User");

console.log("Running unit and integration tests...");

// 1. Test Product
const p1 = new Product(1, "Laptop", "High end laptop", 1000, 10, "Electronics");
assert.strictEqual(p1.productId, 1);
p1.updateStock(2);
assert.strictEqual(p1.stock, 8);
p1.restock(5);
assert.strictEqual(p1.stock, 13);
console.log("✓ Product test passed");

// 2. Test Customer & User
const cust = new Customer(101, "Alice", "alice@example.com", "123 Main St");
assert.strictEqual(cust.userId, 101);
assert.strictEqual(cust.address, "123 Main St");
cust.updateAddress("456 New St");
assert.strictEqual(cust.address, "456 New St");
console.log("✓ Customer & User test passed");

// 3. Test ShoppingCart & CartItem
cust.shoppingCart.addProduct(p1, 2);
assert.strictEqual(cust.shoppingCart.items.length, 1);
assert.strictEqual(cust.shoppingCart.getTotal(), 2000);

cust.shoppingCart.addProduct(p1, 1);
assert.strictEqual(cust.shoppingCart.items[0].quantity, 3);
assert.strictEqual(cust.shoppingCart.getTotal(), 3000);

cust.shoppingCart.removeProduct(1);
assert.strictEqual(cust.shoppingCart.items.length, 0);
console.log("✓ ShoppingCart & CartItem test passed");

// 4. Test Checkout & Order & Payment & System
const sys = new ECommerceSystem();
sys.catalog.addProduct(p1);
sys.registerCustomer(cust);

cust.shoppingCart.addProduct(p1, 2);
const order = Checkout.checkout(cust);
assert.strictEqual(order.customer, cust);
assert.strictEqual(order.items.length, 1);
assert.strictEqual(order.calculateTotal(), 2000);
assert.strictEqual(p1.stock, 11); // 13 - 2 = 11
assert.strictEqual(cust.shoppingCart.items.length, 0);
assert.strictEqual(cust.orders.length, 1);

order.completeOrder();
assert.strictEqual(order.status, "completed");

const payment = new Payment(1001, order, "Cash");
payment.processPayment();
assert.strictEqual(payment.status, "paid");

sys.addOrder(order);
assert.strictEqual(sys.orders.length, 1);
console.log("✓ Checkout & Order & Payment & System test passed");

// 5. Test Admin & ProductCatalog
const admin = new Admin(1, "AdminUser", "admin@example.com");
admin.addProduct(sys.catalog.products, 2, "Phone", "Smartphone", 500, 20, "Electronics");
assert.strictEqual(sys.catalog.products.length, 2);

const foundCategory = sys.catalog.searchByCategory("electronics");
assert.strictEqual(foundCategory.length, 2);

const foundName = sys.catalog.searchByName("phone");
assert.strictEqual(foundName.length, 1);

admin.updateProduct(sys.catalog.products, 2, "Smart Phone", 550, 15, "Electronics");
assert.strictEqual(sys.catalog.products.find(p => p.productId === 2).name, "Smart Phone");

sys.catalog.removeProduct(2);
assert.strictEqual(sys.catalog.products.length, 1);
console.log("✓ Admin & ProductCatalog test passed");

// 6. Test Category
const category = new Category(1, "Electronics");
category.addProduct(p1);
assert.strictEqual(category.products.length, 1);
category.listProducts();
console.log("✓ Category test passed");

console.log("\nALL TESTS PASSED SUCCESSFULLY!");
