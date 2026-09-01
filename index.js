const readline = require("readline");
const Product = require("./Product");
const Customer = require("./Customer");
const Admin = require("./Admin")
const Payment = require("./Payment");
const ECommerceSystem = require("./EcommerceSystem");
const Checkout = require("./Checkout");
// readLine Configuration
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

//Creating and Eccommerce Sytem object
const system = new ECommerceSystem();

const products = [
    new Product(1, "Laptop", "Dell Core i7", 800, 10, "Electronics"),
    new Product(2, "Smartphone", "Samsung Galaxy S24", 700, 20, "Electronics"),
    new Product(3, "Tablet", "Apple iPad Air", 650, 15, "Electronics"),
    new Product(4, "Smart Watch", "Apple Watch Series 10", 500, 12, "Electronics"),
    new Product(5, "Headphones", "Sony WH-1000XM5", 250, 30, "Electronics"),
    new Product(6, "Bluetooth Speaker", "JBL Charge 5", 180, 18, "Electronics"),
    new Product(7, "Gaming Mouse", "Logitech G502", 80, 25, "Accessories"),
    new Product(8, "Mechanical Keyboard", "Redragon K552", 90, 20, "Accessories"),
    new Product(9, "Monitor", "24-inch HP Full HD", 220, 10, "Electronics"),
    new Product(10, "Printer", "HP LaserJet", 350, 8, "Office"),

    new Product(11, "Backpack", "Laptop Backpack", 45, 40, "Fashion"),
    new Product(12, "Running Shoes", "Nike Air Zoom", 120, 25, "Fashion"),
    new Product(13, "T-Shirt", "Polo T-Shirt", 25, 60, "Fashion"),
    new Product(14, "Jeans", "Blue Denim", 50, 35, "Fashion"),
    new Product(15, "Jacket", "Leather Jacket", 150, 10, "Fashion"),

    new Product(16, "Coffee Maker", "Philips Coffee Machine", 130, 15, "Home"),
    new Product(17, "Microwave", "LG Microwave Oven", 200, 10, "Home"),
    new Product(18, "Electric Kettle", "Silver Crest Kettle", 40, 30, "Home"),
    new Product(19, "Vacuum Cleaner", "Panasonic Vacuum", 180, 12, "Home"),
    new Product(20, "Air Fryer", "Ninja Air Fryer", 170, 15, "Home")
];

// Adding the 20 Product to the catalog
products.forEach(product => system.catalog.addProduct(product));

//Creating a customer
const customer = new Customer(101, "Besong", "john@gmail.com", "Buea, Cameroon");

//Register Customer in the System
system.registerCustomer(customer);
// Creating and Addmin
const admin = new Admin(1, "Administrator", "admin@gmail.com")
   
    function menu() {
    console.log("======================================================")
    console.log("\n           Welcome to E-COMMERCE SYSTEM \n          ");
    console.log("======================================================")
    console.log("1. Customer");
    console.log("2. Admin Login");
    console.log("3. Exit");
    rl.question("\nEnter your choice: ", choice =>
    {
        switch(choice){
            case "1":
                customer.login();
                customerMenu();
                break;
            case "2":
                adminLogin();
                break;
            case "3":
                console.log("\n Thank you for using our E-commerce System.")
                rl.close();
                break;
            default:
                console.log("\n Invalid choice. Please select 1, 2, or 3.")
                menu();
        }
    }
    );
}
//Customer Menu

function customerMenu(){
    console.log("\n")
    console.log("======================================================")
    console.log("                   Customer Menu                       ")
    console.log("======================================================")
    console.log("1.  View Products")
    console.log("2.  Add Products to Cart")
    console.log("3.  View Shopping Cart")
    console.log("4.  Remove Products from Cart")
    console.log("5.  View Order")
    console.log("6.  Checkout")
    console.log("7.  Logout");
    rl.question("\n Enter your choice: ", choice =>{
        switch(choice){
            case "1":
                ViewProducts();
                customerMenu();
                break;
            case "2":
                addProductToCart();
                break;
            case "3":
                console.log("\n==========Shopping Cart==========");
                if(customer.shoppingCart.items.length === 0){
                    console.log("Your shopping cart is empty");
                }
                else{
                    customer.shoppingCart.displayCart();
                }
                customerMenu();
                break;
            case "4":
                removeProductFromCart();
                break;
            case "5":
                viewOrderHistory();
                customerMenu();
                break;
            case "6":
                checkout();
                break;
            case "7":
                customer.logout();
                menu();
                break;
            default:
                console.log("\n Invalid choice. Please try again.")
                customerMenu();
        }
    })
    
}
// View product function

function ViewProducts(){
    console.log("\n")
    console.log("======================================================");
    if(system.catalog.products.length === 0){
        console.log("There are no products available.")
        return;
    }
    system.catalog.products.forEach(product =>{
        console.log(`${product.productId}.` + `${product.name} | ` + `${product.category} | ` + `$${product.price} | ` + `Stock: ${product.stock}`);
    });
    console.log("======================================================");
}
function addProductToCart() {
    ViewProducts();

    
    rl.question("\nEnter Product ID: ", id => {

        const product = system.catalog.products.find(
            p => p.productId === Number(id)
        );

        if (!product) {

            console.log("Product not found.");

            return customerMenu();

        }

        if(product.stock <=0){
            console.log("\n Sorry, this product is out of stock");
            return customerMenu();
        }

        rl.question("Enter Quantity: ", qty => {

            qty = Number(qty);

            if (! Number.isInteger(qty) || qty <= 0) {

                console.log("Invalid Quantity.");

                return customerMenu();

            }

            const cartItem = customer.shoppingCart.items.find(item => item.product.productId === product.productId);
            const currentInCart = cartItem ? cartItem.quantity : 0;

            if (qty + currentInCart > product.stock) {

                console.log(`\n Only ${product.stock - currentInCart} additional item(s) available.`);

                return customerMenu();

            }

            customer.shoppingCart.addProduct(product, qty);

            console.log(`\n ${qty} ${product.name}(s)` + ` added successfully to your cart.`);

            customerMenu();

        });

    });
}
// A function to rmove product from cart

function removeProductFromCart(){

    if(customer.shoppingCart.items.length === 0){
        console.log("\n Your shopping cart is empty.")
        return customerMenu();
    }
    customer.shoppingCart.displayCart();
    rl.question("\n Enter Product Id to remove: ", id =>{
        const productId = Number(id);
        const exists = customer.shoppingCart.items.some(
            item => item.product.productId === productId
        );
        if(!exists){
            console.log("\n This product is not in your cart.");
            return customerMenu();
        }
        customer.shoppingCart.removeProduct(productId);
        console.log("\n Product removed from your cart successfully ");
        customerMenu();
    })

}

// View Order History

function viewOrderHistory(){
    console.log("\n");
    console.log("========== Order History ==========");
    const orders = customer.viewOrders();
    if(orders.length === 0){
        console.log("You have not placed any orders yet");
        return;
    }
    orders.forEach((order, index) => {
        console.log("\n-------------------------------------");
        console.log(`Order Id: ${order.orderId}`);
        console.log(`Status: ${order.status}`);
        console.log(`Total: $${order.calculateTotal()}`);
        console.log("\n-------------------------------------");

    })
}

//Checkout Function


function checkout() {

    if (customer.shoppingCart.items.length === 0) {
        console.log("\nYour cart is empty.");

        return customerMenu();

    }
    console.log("\n ==========Checkout==========")
    customer.shoppingCart.displayCart();

    rl.question("\nEnter Customer Name: ", (name) => {
        if(name.trim() ===""){
            console.log("\n Customer name cannot be empty");
            return customerMenu();
        }
        const total = customer.shoppingCart.getTotal();
        console.log(`\n Amount to pay: $${total}`);

        rl.question("Enter Payment Amount: $", (amount) => {

            amount = Number(amount);
             if(isNaN(amount)){
                console.log("\n Invalid payment amount");
                return customerMenu();
             }

             if(amount !== total){
                console.log("=================================");
                console.log("Payment Failed");
                console.log("=================================");
                console.log(`Customer Name: ${name}`)
                console.log(`Required: $${total}`)
                console.log(`Amount Entered: $${amount}`);
                console.log("Error:  Incorrect payment amount")
                console.log("Please try again.")
                console.log("=================================");
                return customerMenu();
             }

             // Perform checkout using Checkout class
             const order = Checkout.checkout(customer);
             order.completeOrder();

             // Create Payment
             const payment = new Payment(Date.now(), order, "Cash");
             payment.processPayment();

             // Add Order to System
             system.addOrder(order);

             // Display receipt
             console.log("\n");
             console.log("=================================");
             console.log("Payment Receipt")
             console.log("=================================");
             console.log(`Customer Name: ${name}`);
             console.log(`Order Id: ${order.orderId}`);
             console.log(`Amount Paid: $${amount}`);
             console.log(`Payment Method: Cash`)
             console.log(`Payment Status: ${payment.status}`);
             console.log(`Order Status: ${order.status}`);
             console.log("=================================");
             console.log("Thank you for your purchase!");
             console.log("=================================");
             customerMenu();


        });

    });

}

// Admin Login
function adminLogin(){
    console.log("\n=========== Admin Login ===============")
    rl.question("Username: ", (username) =>{
        rl.question("Password: ", (password)=> {
            if(username === "admin" && password =="1234"){
                console.log("\n Admin Login Successful");
                console.log(`Welcome ${admin.name}!`)
                adminMenu();

            }
            else{
                console.log("\n Invalid username or Password");
                menu();
            }
        })
    })
}

// Admin Menu
function adminMenu(){
    console.log("\n");
    console.log("=================================");
    console.log("\n=== Admin Panel ====");
    console.log("=================================");
    console.log("1. View Product");
    console.log("2. Add Product");
    console.log("3. Update Product");
    console.log("4. Delete Product");
    console.log("5. View All Orders");
    console.log("6. Logout");
    rl.question("\n Enter your choice: ", choice=>{
        switch(choice){
            //view products
            case "1":
                ViewProducts();
                adminMenu();
                break;
            //Add product as and admin
            case "2":
                adminAddProduct();
                break;
             //Update product as admin
            case "3":
                adminUpdateProduct();
                break;
            case "4":
            //All admin can delete Product from the system
                adminDeleteProduct();
                break;
            //View Orders
            case "5":
                viewAllOrders();
                adminMenu();
                break;
            //Logout as admin
            case "6":
                console.log("\n Admin logout successfully")
                menu();
                break;
            default:
                console.log("Invalid Choice");
                adminMenu();
        }
    })
}

// Admin Add product

function adminAddProduct(){
    console.log("\n ========= Add new Product=========")
    rl.question("Product ID: ", id=>{
        id = Number(id);
        //Checking of any duplicate
        const existingProduct = system.catalog.products.find(
            product => product.productId === id
        );
        if(existingProduct){
            console.log("\nError: Product Id already exists.");
            return adminMenu();
        }
        rl.question("Product Name: ", name =>{
            if(name.trim() === ""){
                console.log("\n Product name cannot be empty.")
                return adminMenu();
            }
            rl.question("Description: ", description =>{
                rl.question("Price: $", price =>{
                    price = Number(price);
                    if(isNaN(price) || price <= 0){
                        console.log("\n Invalid price. ")
                        return adminMenu();
                    }
                    rl.question("Stock: ", stock =>{
                        stock = Number(stock);
                        if(!Number.isInteger(stock) || stock < 0){
                            console.log("\n Invalid stock quantity.");
                            return adminMenu();
                        }
                        rl.question("Category: ", category =>{
                            if(category.trim() ===""){
                                console.log("\n Category cannot be empty");
                                return adminMenu();
                            }
                            admin.addProduct(
                                system.catalog.products, id, name, description, price, stock, category
                            );
                            console.log("\n========== New Product ==========");
                            console.log(`Id: ${id}`);
                            console.log(`Name: ${name}`);
                            console.log(`Price: $${price}`);
                            console.log(`Stock: ${stock}`);
                            console.log(`Category: ${category}`);
                            console.log("=================================");
                            adminMenu();
                        })
                    })
                })
            })
        })
    })
}

//Admin Update Product

function adminUpdateProduct(){
    console.log("\n ========= Update Product=========")
    ViewProducts();
    rl.question("Enter product id to update: ", id=>{
        id = Number(id);
        const product = system.catalog.products.find(
            p => p.productId === id
        );
        if(!product){
            console.log("\n Product not found");
            return adminMenu();
        }
        console.log(`\n Updating: ${product.name}`)
        rl.question("New Name: ", name =>{
            if(name.trim() ===""){
                name = product.name
            }
            rl.question(`New Price ($${product.price}): `, price =>{
                price = price.trim() ==="" ? product.price : Number(price);
                if(isNaN(price) || price <= 0){
                    console.log("\n Invalid Price.");
                    return adminMenu();
                }
                rl.question(`New Stock (${product.stock}): `, stock =>{
                    stock = stock.trim() === "" ? product.stock : Number(stock);
                    if(!Number.isInteger(stock) || stock < 0){
                        console.log(`\n Invalid Stock.`);
                        return adminMenu();
                    }
                    rl.question(`New Category (${product.category}): `, category =>{
                        if(category.trim() ===""){
                            category = product.category;
                        }
                        admin.updateProduct(
                            system.catalog.products, id, name, price, stock, category);
                            console.log("\n Product Updated successfully")
                            console.log(`\n product Id: ${id}`);
                            console.log(`Name: ${name}`)
                            console.log(`Price: $${price}`);
                            console.log(` Category: ${category}`)
                            adminMenu();
                        }
                        )
                    })
                })
            })
        })
    }


//Function to delete Product

function adminDeleteProduct(){
    console.log("\n=========Delete Product=======")
    ViewProducts();
    rl.question("Enter product id to delete product: ", id =>{
        id = Number(id);
        const product = system.catalog.products.find(
            p => p.productId === id
        );
        if(!product){
            console.log("\n Product not found");
            return adminMenu();
        }
        rl.question(`Are you sure you want to delete ${product.name} ? (yes/no):`, answer =>{
            if(
                answer.toLowerCase() === "yes") {
                    admin.deleteProduct(
                        system.catalog.products, id
                    );
                }
                else{
                    console.log("\n Product deletion cancelled");
                }
                adminMenu();
        })
    })
}
// View All Orders - Admin
function viewAllOrders(){
    console.log("\n")
    console.log("========== All Orders =========")
    if(system.orders.length === 0){
        console.log("No orders have been placed yet");
        return;
    }
    system.orders.forEach((order, index) =>{
        console.log("\n----------------------------")
        console.log(`Order Number: ${index + 1}`);
        console.log(`Order Id: ${order.orderId}`)
        console.log(`Customer: ${order.customer?.name || 'Unknown'}`);
        console.log(`Status: ${order.status}`);
        console.log(`Total: $${order.calculateTotal()}`);
        console.log("\n----------------------------")
    })
}

console.log("\n")
console.log("*********************************")
console.log("*       E-commerce Platform     *")
console.log("*       OOP Javascript System   *")
console.log("*********************************")
menu()