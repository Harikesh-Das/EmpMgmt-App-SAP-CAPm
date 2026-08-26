sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/odata/v4/ODataModel"
], (Controller, MessageToast, ODataModel) => {
    "use strict";

    return Controller.extend("empmgmt.controller.MainView", {
        onInit() {
            const oODataModel = new ODataModel({
                serviceUrl: "/odata/v4/employee/"
            })

            this.getView().setModel(oODataModel)

        },
        onSave(oEvent) {

            const sName = this.byId("inpName").getValue();

            if (!sName) {
                MessageToast.show("Please enter an employee name.");
                return;
            }

            MessageToast.show(sName);

            this.byId("inpName").setValue("");

        },
        onSelectionChange(oEvent) {
            const aItems = oEvent.getParameter("listItems");

            aItems.forEach((oItem) => {
                const oEmployee = oItem.getBindingContext().getObject();
                console.log(oEmployee);
            });
        }
    });
});