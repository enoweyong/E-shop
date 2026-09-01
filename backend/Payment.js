class Payment {
    constructor(paymentId, order, method) {
        this.paymentId = paymentId;
        this.order = order;
        this.method = method;
        this.amount = order.calculateTotal();
        this.status = "pending";
    }

    processPayment() {
        this.status = "paid";
        console.log(`payment of $${this.amount} completed using ${this.method}`);
    }

    refund() {
        this.status = "refunded";
        console.log("payment refunded");
    }
}

module.exports = Payment;