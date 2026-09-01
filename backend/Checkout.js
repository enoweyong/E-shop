const Order = require("./Order");
const Payment = require("./Payment");

class Checkout {
    static checkout(customer, method = "Card") {

// Validate stock for every item before creating the order
const outOfStock = customer.shoppingCart.items.find(
    item => item.quantity > item.product.stock
);
if (outOfStock) {
    throw new Error(`Not enough stock for ${outOfStock.product.name}`);
}
        const order = new Order(Date.now(), customer);

        customer.shoppingCart.items.forEach(item => {
            order.addItem(item.product, item.quantity);
            item.product.updateStock(item.quantity);
        });

        const payment = new Payment(Date.now(), order, method);
        payment.processPayment();

        customer.shoppingCart.clearCart();
        customer.placeOrder(order);

        return order;
    }
}

module.exports = Checkout;