const CartItem = require("./CartItem");

class ShoppingCart{
    constructor(){
        this.items = [];
    }
    addProduct(product, quantity){
        // To check if product already exist in the cart
        const existingItem = this.items.find(
            item => item.product.productId === product.productId
        );
        if(existingItem){
            existingItem.quantity += quantity;
        } else {
            //create a new cart item
            const cartItem = new CartItem(product, quantity);
            this.items.push(cartItem);
        }
    }

    //To remove an entire product from the cart
    removeProduct(productId){
        const index = this.items.findIndex(
            item => item.product.productId === Number(productId)
        );
        if(index !== -1){
            this.items.splice(index, 1);
        }
    }
    getTotal(){
        return this.items.reduce(
        (total, item ) => total + item.getSubtotal(), 0)
    }
    clearCart(){
        this.items = [];
    }
    displayCart(){
        console.log(
            "==== shoping Cart ===="
        )
        if(this.items.length === 0){
            console.log("Your shopping cart is empty.");
            return;
        }
        this.items.forEach(item =>{
            console.log(`Product Id: ${item.product.productId} | Name: ${item.product.name} | Quantity: ${item.quantity} | Subtotal: $${item.getSubtotal()}`)
        });
        console.log(`Total: $${this.getTotal()}`)
    }
}
module.exports = ShoppingCart;