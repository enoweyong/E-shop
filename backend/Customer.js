const User = require("./User");
const ShoppingCart = require("./ShoppingCart");

class Customer extends User {
    constructor(userId, name, email, address) {
        super(userId, name, email);
        this.address = address;
        this.shoppingCart = new ShoppingCart();
        this.orders = [];
    }

    placeOrder(order) {
        this.orders.push(order);
    }

    viewOrders() {
        return this.orders;
    }

    updateAddress(address) {
        this.address = address;
    }
}

module.exports = Customer;