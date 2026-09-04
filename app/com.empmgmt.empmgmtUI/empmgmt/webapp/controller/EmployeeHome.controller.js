sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], (Controller, MessageToast, JSONModel, MessageBox) => {
    "use strict";

    return Controller.extend("empmgmt.controller.EmployeeHome", {

        onInit() {
            this.loadEmployeeProfile();
            this.loadLeaves();

        },

        //-------------------------------------------------------------------------------------------------------------------
        /* Event Handlers */

        // Load Employee profile handler
        async loadEmployeeProfile() {


            const userModel = this.getOwnerComponent().getModel("user");
            const email = userModel.getProperty("/email");

            if (!email) {
                MessageToast.show("User information not found");
                return;
            }

            try {

                const basicAuth = sessionStorage.getItem("basicAuth");
                const response = await fetch(
                    `/odata/v4/employee/Employee?$filter=email eq '${email}'`,
                    {
                        headers: {
                            "Authorization": `Basic ${basicAuth}`
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error("Failed to load employee");
                }

                const data = await response.json();

                if (!data.value || data.value.length === 0) {
                    MessageToast.show("Employee not found");
                    return;
                }

                const employee = data.value[0];

                let imageSrc = "";

                if (employee.profileImage && employee.mimeType) {
                    imageSrc = `data:${employee.mimeType};base64,${employee.profileImage}`;
                }

                employee.imageSrc = imageSrc;

                const profileModel = new JSONModel(employee);

                this.getView().setModel(profileModel, "profile");

            } catch (error) {
                console.error(error);
                MessageToast.show("Unable to load employee profile");
            }
        },
        //---------------------------------------------------------------------------------------------------------------

        // Load Leaves Handler
        async loadLeaves() {

            const userModel = this.getOwnerComponent().getModel("user");
            const email = userModel.getProperty("/email");

            if (!email) {
                MessageToast.show("User information not found");
                return;
            }

            try {

                const basicAuth = sessionStorage.getItem("basicAuth");

                // Get current employee
                const employeeResponse = await fetch(
                    `/odata/v4/employee/Employee?$filter=email eq '${email}'`,
                    {
                        headers: {
                            "Authorization": `Basic ${basicAuth}`
                        }
                    }
                );

                if (!employeeResponse.ok) {
                    throw new Error("Failed to load employee");
                }

                const employeeData = await employeeResponse.json();
                const employee = employeeData.value[0];

                if (!employee) {
                    MessageToast.show("Employee not found");
                    return;
                }

                // Get employee's leaves
                const leaveResponse = await fetch(
                    `/odata/v4/leave/Leave?$filter=employee_ID eq ${employee.ID}`,
                    {
                        headers: {
                            "Authorization": `Basic ${basicAuth}`
                        }
                    }
                );

                if (!leaveResponse.ok) {
                    throw new Error("Failed to load leaves");
                }

                const leaveData = await leaveResponse.json();

                // Add employee/approver information
                const leaves = await Promise.all(
                    leaveData.value.map(async (leave) => {

                        let approverName = "";

                        if (leave.approver_ID) {

                            const approverResponse = await fetch(
                                `/odata/v4/employee/Employee(${leave.approver_ID})`,
                                {
                                    headers: {
                                        "Authorization": `Basic ${basicAuth}`
                                    }
                                }
                            );

                            if (approverResponse.ok) {
                                const approver = await approverResponse.json();
                                approverName = approver.name;
                            }
                        }

                        return {
                            ID: leave.ID,
                            employeeId: employee.empId,
                            approverName: approverName,
                            leaveType: leave.leaveType,
                            startDate: leave.startDate,
                            endDate: leave.endDate,
                            status: leave.status,
                            appliedOn: leave.appliedOn,
                            approvedOn: leave.approvedOn
                        };
                    })


                );
                this.getView().setModel(
                    new JSONModel({ value: leaves }),
                    "leaves"
                );

            } catch (error) {
                console.error(error);
                MessageToast.show("Unable to load leaves");
            }
        },
        //--------------------------------------------------------------------------------------------------------
        // Apply leave handler
        async onClickApply() {

            this.byId("applyLeaveDialog").open();

        },

        async onCancelButton() {
            this.byId("applyLeaveDialog").close();
        },

        async onApplyLeave() {
            const oLeaveType = this.byId("selectLeaveType").getSelectedKey();
            const oStartDate = this.byId("startDate").getValue();
            const oEndDate = this.byId("endDate").getValue();
            const oReason = this.byId("reason").getValue();

            if (!oLeaveType || !oStartDate || !oEndDate || !oReason) {
                MessageBox.error("Please enter all the leave details");
                return;
            }
            try {

                const basicAuth = sessionStorage.getItem("basicAuth");
                const response = await fetch("/odata/v4/leave/Leave",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Basic ${basicAuth}`
                        },
                        body: JSON.stringify({

                            leaveType: oLeaveType,
                            startDate: oStartDate,
                            endDate: oEndDate,
                            reason: oReason
                        })
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error?.message || "Failed to apply leave"
                    );
                }

                MessageToast.show("Leave applied successfully");

                this.byId("applyLeaveDialog").close();
                this.byId("selectLeaveType").setSelectedKey("");
                this.byId("startDate").setValue("");
                this.byId("endDate").setValue("");
                this.byId("reason").setValue("");

                this.loadLeaves();




            } catch (error) {
                console.error(error)
                MessageBox.error(
                    error.message || "Failed to create new leave"
                )
            }


        },
        //------------------------------------------------------------------------------------------------------------
        onSelectionChange(oEvent) {
            const selectedItem = oEvent.getParameter("listItem");

            this.byId("cancelButton").setEnabled(!!selectedItem);
        },

        //-----------------------------------------------------------------------------------------------------------
        async onClickCancel() {
            const table = this.byId("leaveTable");
            const selectedItem = table.getSelectedItem();

            if (!selectedItem) {
                return;
            }

            const leave = selectedItem.getBindingContext("leaves").getObject();

            // Check status before calling backend
            if (leave.status !== "pending") {
                MessageBox.error(
                    `Only pending leaves can be cancelled. Current status: ${leave.status}`
                );
                return;
            }

            const leaveId = leave.ID;

            try {
                const basicAuth = sessionStorage.getItem("basicAuth");

                const response = await fetch(
                    "/odata/v4/leave/cancelLeave",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Basic ${basicAuth}`
                        },
                        body: JSON.stringify({
                            ID: leaveId
                        })
                    }
                );

                if (!response.ok) {
                    const data = await response.json();

                    throw new Error(
                        data.error?.message || "Failed to cancel leave"
                    );
                }

                MessageToast.show("Leave cancelled successfully");

                await this.loadLeaves();

                this.byId("cancelButton").setEnabled(false);

            } catch (error) {
                console.error(error);

                MessageBox.error(
                    error.message || "Failed to cancel leave"
                );
            }
        }

    });
});