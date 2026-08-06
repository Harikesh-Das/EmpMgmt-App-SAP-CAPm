sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], (Controller, MessageToast, JSONModel) => {
    "use strict";

    return Controller.extend("empmgmt.controller.MainView", {
        onInit() {
            const oModel = new JSONModel({
                name: ""
            });

            this.getView().setModel(oModel);

        },
        onSave(oEvent) {

            const sName = this.byId("inpName").getValue();

            if (!sName) {
                MessageToast.show("Please enter an employee name.");
                return;
            }

            MessageToast.show(sName);

            this.byId("inpName").setValue("");

        }
    });
});