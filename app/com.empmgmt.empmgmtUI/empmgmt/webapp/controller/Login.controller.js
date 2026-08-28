sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], (Controller, MessageToast) => {
    "use strict"

    return Controller.extend("empmgmt.controller.Login", {
        onInit() {

        },
        onLoginButtonClick() {
            const email= this.byId("emailInput").getValue();
            const password= this.byId("passwordInput").getValue();
            
            if(!email || !password){
                MessageToast.show('Please enter Email and Password');
                return;
            }

        }
    })
})