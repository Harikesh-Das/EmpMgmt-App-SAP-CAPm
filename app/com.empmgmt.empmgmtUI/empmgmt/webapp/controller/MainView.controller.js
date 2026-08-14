sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], (Controller, MessageToast, JSONModel) => {
    "use strict";

    return Controller.extend("empmgmt.controller.MainView", {
        onInit() {
            const oModel = new JSONModel({
                name: "",
                department: "",

                employees: [
                    { name: "Alice", department: "HR" },
                    { name: "Bob", department: "IT" }
                ],
                employees: [
                    {
                        name: "Alice",
                        department: "HR",
                        role: "HR"
                    },
                    {
                        name: "Bob",
                        department: "IT",
                        role: "Employee"
                    }
                ]


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