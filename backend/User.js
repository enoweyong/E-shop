class User {
    constructor(userId, name, email) {
        this.userId = userId;
        this.name = name;
        this.email = email;
    }

    login() {
        console.log(`${this.name} has logged in.`);
    }

    logout() {
        console.log(`${this.name} has logged out.`);
    }

    displayInfo() {
        console.log(`ID: ${this.userId}`);
        console.log(`Name: ${this.name}`);
        console.log(`Email: ${this.email}`);
    }
}

module.exports = User;