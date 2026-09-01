const OrderItem = require("./OrderItem");

class Order {
    constructor(orderId, customer) {
        this.orderId = orderId;
        this.customer = customer;
        this.Items = [];
        this.status = 'pending';
    }

    addItem(product, quantity) {
        this.Items.push(new OrderItem(product, quantity));
    }

    calculateTotal() {
        return this.Items.reduce((total, item) => total + item.getTotal(), 0);
    }

    completeOrder() {
        this.status = "completed";
    }

    cancelOrder() {
        this.status = "cancelled";
    }

    displayOrder() {
        console.log(`Order ID: ${this.orderId}`);
        console.log(`Customer: ${this.customer?.name ?? 'unknown customer'}`);
        console.log(`Status: ${this.status}`);
        this.Items.forEach(item => {
            console.log(`${item.product?.name ?? 'unknown product'} x ${item.quantity} = $${item.getTotal()}`);
        });
        console.log(`Total: $${this.calculateTotal()}`);
    }
}

module.exports = Order;