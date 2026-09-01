class ProductCatalog {
    constructor() {
        this.products = [];
    }

    addProduct(product) {
        this.products.push(product);
    }

    removeProduct(productId) {
        this.products = this.products.filter(
            product => product.productId !== Number(productId)
        );
    }

    searchByName(name) {
        return this.products.filter(product =>
            product.name.toLowerCase().includes(name.toLowerCase())
        );
    }

    searchByCategory(category) {
        return this.products.filter(
            product =>
                product.category &&
                product.category.toLowerCase() === category.toLowerCase()
        );
    }

    displayProducts() {
        this.products.forEach(product => product.displayProduct());
    }
}

module.exports = ProductCatalog;