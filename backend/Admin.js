const User = require("./User");
const Product = require("./Product");

class Admin extends User {

    constructor(userId, name, email) {
        super(userId, name, email);
    }

    addProduct(products, id, name, description, price, stock, category) {

        const product = new Product(
            id,
            name,
            description,
            Number(price),
            Number(stock),
            category
        );

        products.push(product);

        console.log("\nProduct added successfully.");
    }

    deleteProduct(products, id) {

        const index = products.findIndex(
            product => product.productId === Number(id)
        );

        if (index === -1) {

            console.log("\nProduct not found.");
            return;
        }

        products.splice(index, 1);

        console.log("\nProduct deleted successfully.");
    }

    updateProduct(products, id, newName, newPrice, newStock, newCategory) {

        const product = products.find(
            p => p.productId === Number(id)
        );

        if (!product) {

            console.log("\nProduct not found.");
            return;
        }

        product.name = newName;
        product.price = Number(newPrice);
        product.stock = Number(newStock);
        product.category = newCategory;

        console.log("\nProduct updated successfully.");
    }

}

module.exports = Admin;