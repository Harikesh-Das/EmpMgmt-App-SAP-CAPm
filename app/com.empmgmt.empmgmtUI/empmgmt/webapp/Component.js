sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "empmgmt/model/models"
], (UIComponent, JSONModel, models) => {
    "use strict";

    return UIComponent.extend("empmgmt.Component", {

        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {

            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(
                models.createDeviceModel(),
                "device"
            );

            const userModel = new JSONModel();

            const storedUser = sessionStorage.getItem("user");

            if (storedUser) {
                userModel.setData(JSON.parse(storedUser));
            }

            this.setModel(userModel, "user");

            this.getRouter().initialize();
        }
    });
});