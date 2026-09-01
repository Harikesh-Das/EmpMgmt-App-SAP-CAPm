sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], (Controller, MessageToast) => {
    "use strict";

    return Controller.extend("empmgmt.controller.Login", {

        onInit() {
        },

        async onLoginButtonClick() {

            const email = this.byId("emailInput").getValue();
            const password = this.byId("passwordInput").getValue();

            if (!email || !password) {
                MessageToast.show("Please enter Email and Password");
                return;
            }

            try {

                const response = await fetch("/odata/v4/login/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        credentials: {
                            email: email,
                            password: password
                        }
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    MessageToast.show(
                        data.error?.message || "Login failed"
                    );
                    return;
                }

                const role = data.role;
                

                if (role === "Employee") {
                    this.getOwnerComponent()
                        .getRouter()
                        .navTo("EmployeeHome");

                } else if (role === "Manager" || role === "HR") {
                    this.getOwnerComponent()
                        .getRouter()
                        .navTo("ManagerHRHome");

                } else {
                    MessageToast.show("Invalid role");
                }

            } catch (error) {
                console.error(error);
                MessageToast.show("Unable to connect to server");
            }
        }
    });
});