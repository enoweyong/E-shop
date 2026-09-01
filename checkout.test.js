/**
 * Unit tests for Checkout.js
 * Framework: node:test (Node.js built-in test runner)
 *
 * Run with:  node --test checkout.test.js
 *
 * Strategy:
 *  - Checkout.checkout() collaborates with Order, Product, ShoppingCart
 *    and Customer. Real instances are used for integration-style tests.
 *  - t.mock.module() is used where an isolated unit test of the
 *    collaboration is required (positive, negative and edge cases).
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const Checkout = require("./Checkout");
// Product, Customer and ShoppingCart live in the backend folder.
const Product = require("./backend/Product");
const Customer = require("./backend/Customer");

/** Helper: build a customer with an optional cart already filled */
function makeCustomer(cartItems = []) {
    const customer = new Customer(101, "Alice", "alice@example.com", "123 Main St");
    cartItems.forEach(({ product, quantity }) =>
        customer.shoppingCart.addProduct(product, quantity)
    );
    return customer;
}

function makeProduct(overrides = {}) {
    return new Product(
        overrides.productId ?? 1,
        overrides.name ?? "Laptop",
        overrides.description ?? "High end laptop",
        overrides.price ?? 1000,
        overrides.stock ?? 10,
        overrides.category ?? "Electronics"
    );
}

// ---------------------------------------------------------------------------
// Positive cases (real collaborators)
// ---------------------------------------------------------------------------
test("Checkout.checkout - happy path: builds order, updates stock, clears cart, records order", () => {
    const laptop = makeProduct({ stock: 10 });
    const mouse = makeProduct({ productId: 2, name: "Mouse", price: 80, stock: 5 });
    const customer = makeCustomer([
        { product: laptop, quantity: 2 },
        { product: mouse, quantity: 1 },
    ]);

    const order = Checkout.checkout(customer);

    // Order contents
    assert.equal(order.items.length, 2);
    assert.equal(order.items[0].product, laptop);
    assert.equal(order.items[0].quantity, 2);
    assert.equal(order.items[1].product, mouse);
    assert.equal(order.calculateTotal(), 2 * 1000 + 1 * 80);

    // Stock decremented per purchased quantity
    assert.equal(laptop.stock, 8);
    assert.equal(mouse.stock, 4);

    // Cart cleared, order attached to customer
    assert.equal(customer.shoppingCart.items.length, 0);
    assert.equal(customer.orders.length, 1);
    assert.equal(customer.orders[0], order);
    assert.equal(order.customer, customer);

    // New order status starts as pending
    assert.equal(order.status, "pending");
});

test("Checkout.checkout - returns the same Order instance it placed", () => {
    const product = makeProduct();
    const customer = makeCustomer([{ product, quantity: 1 }]);
    const returned = Checkout.checkout(customer);
    assert.equal(returned, customer.orders[0]);
});

test("Checkout.checkout - cart is cleared and can be reused for a second order", () => {
    const product = makeProduct({ stock: 5 });
    const customer = makeCustomer([{ product, quantity: 1 }]);

    const first = Checkout.checkout(customer);
    assert.equal(customer.shoppingCart.items.length, 0);

    customer.shoppingCart.addProduct(product, 2);

    const second = Checkout.checkout(customer);
    assert.notEqual(second, first);
    assert.equal(second.items[0].quantity, 2);
    assert.equal(customer.orders.length, 2);
    assert.equal(product.stock, 2);
});

// ---------------------------------------------------------------------------
// Negative cases (real collaborators)
// ---------------------------------------------------------------------------
test("Checkout.checkout - empty cart: produces an empty pending order, no crash", () => {
    const customer = makeCustomer();

    const order = Checkout.checkout(customer);

    assert.equal(order.items.length, 0);
    assert.equal(order.calculateTotal(), 0);
    assert.equal(order.status, "pending");
    assert.equal(customer.shoppingCart.items.length, 0);
    assert.equal(customer.orders.length, 1);
    assert.equal(customer.orders[0], order);
});

test("Checkout.checkout - cart with a zero-priced product yields a zero total", () => {
    const freebie = makeProduct({ productId: 9, name: "Freebie", price: 0, stock: 3 });
    const customer = makeCustomer([{ product: freebie, quantity: 2 }]);

    const order = Checkout.checkout(customer);

    assert.equal(order.calculateTotal(), 0);
    assert.equal(freebie.stock, 1);
});

// ---------------------------------------------------------------------------
// Edge cases (real collaborators)
// ---------------------------------------------------------------------------
test("Checkout.checkout - buying the entire stock brings stock to exactly zero", () => {
    const product = makeProduct({ stock: 3 });
    const customer = makeCustomer([{ product, quantity: 3 }]);

    Checkout.checkout(customer);

    assert.equal(product.stock, 0);
});

test("Checkout.checkout - stock goes negative if cart quantity exceeds stock (documents current behavior)", () => {
    // NOTE: Checkout.checkout() does not validate stock. This test documents
    // the existing behavior so a future fix makes this test the spec.
    const product = makeProduct({ stock: 2 });
    const customer = makeCustomer([{ product, quantity: 5 }]);

    const order = Checkout.checkout(customer);

    assert.equal(order.items[0].quantity, 5);
    assert.equal(product.stock, -3);
});

test("Checkout.checkout - large quantities and floating point prices", () => {
    const product = makeProduct({ price: 19.99, stock: 1000000 });
    const customer = makeCustomer([{ product, quantity: 3 }]);

    const order = Checkout.checkout(customer);

    assert.ok(Math.abs(order.calculateTotal() - 59.97) < Number.EPSILON * 100);
    assert.equal(product.stock, 999997);
});

test("Checkout.checkout - multiple line items of the same product merge correctly in stock math", () => {
    const product = makeProduct({ stock: 10 });
    const customer = new Customer(101, "Bob", "bob@example.com", "1 Road");
    customer.shoppingCart.addProduct(product, 2);
    customer.shoppingCart.addProduct(product, 3); // merged into one cart line of 5

    const order = Checkout.checkout(customer);

    assert.equal(customer.shoppingCart.items.length, 0); // cart merged then cleared
    assert.equal(order.items.length, 1);
    assert.equal(order.items[0].quantity, 5);
    assert.equal(product.stock, 5);
});

test("Checkout.checkout - order id is the timestamp passed to Order", () => {
    const product = makeProduct();
    const customer = makeCustomer([{ product, quantity: 1 }]);

    const before = Date.now();
    const order = Checkout.checkout(customer);
    const after = Date.now();

    assert.ok(order.orderId >= before && order.orderId <= after);
});

// ---------------------------------------------------------------------------
// Unit tests with mocked Order module (isolated collaboration checks)
// ---------------------------------------------------------------------------
test("Checkout.checkout - collaborates with Order: addItem called per cart line, then clearCart and placeOrder", () => {
    const orderPath = require.resolve("./Order");
    const realOrder = require.cache[orderPath];

    const orderInstances = [];
    class OrderMock {
        constructor(orderId, customer) {
            this.orderId = orderId;
            this.customer = customer;
            this.items = [];
            this.addItemCalls = [];
            orderInstances.push(this);
        }
        addItem(product, quantity) {
            this.addItemCalls.push({ product, quantity });
        }
    }

    // Stub the Order module in the require cache, then reload Checkout so
    // it binds to the stub instead of the real Order.
    require.cache[orderPath] = { id: orderPath, filename: orderPath, loaded: true, exports: OrderMock };
    delete require.cache[require.resolve("./Checkout")];
    const CheckoutWithMock = require("./Checkout");

    try {
        const laptop = makeProduct();
        const customer = makeCustomer([{ product: laptop, quantity: 2 }]);
        const initialStock = laptop.stock;

        const order = CheckoutWithMock.checkout(customer);

        assert.equal(orderInstances.length, 1);
        assert.equal(order, orderInstances[0]);
        assert.deepEqual(order.addItemCalls, [{ product: laptop, quantity: 2 }]);
        assert.equal(laptop.stock, initialStock - 2);        // stock still updated
        assert.equal(customer.shoppingCart.items.length, 0); // cart still cleared
        assert.equal(customer.orders[0], order);             // order still placed
    } finally {
        // Restore the real module and Checkout binding.
        if (realOrder) { require.cache[orderPath] = realOrder; } else { delete require.cache[orderPath]; }
        delete require.cache[require.resolve("./Checkout")];
    }
});

test("Checkout.checkout - throws a useful error when customer is null", () => {
    assert.throws(() => Checkout.checkout(null), TypeError);
    assert.throws(() => Checkout.checkout(undefined), TypeError);
});

test("Checkout.checkout - throws when shoppingCart is missing items array", () => {
    const customer = { placeOrder: () => {} }; // no shoppingCart
    assert.throws(() => Checkout.checkout(customer), TypeError);
});
