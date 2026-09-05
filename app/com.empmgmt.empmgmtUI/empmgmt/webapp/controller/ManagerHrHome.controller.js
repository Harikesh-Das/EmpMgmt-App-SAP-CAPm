sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], (Controller, MessageToast, JSONModel, MessageBox) => {
    "use strict";

    return Controller.extend("empmgmt.controller.ManagerHrHome", {

        /* Event Handlers */

        // PAGE LOAD
        onInit() {
            const user = JSON.parse(
                sessionStorage.getItem("user")
            );

            if (!user || !user.email) {
                MessageBox.error("User session not found");
                return;
            }

            this.loadEmployeeProfile(user.email);
            this.loadDashboard(user.role);
            this.loadLeaves();
        },

        //----------------------------------------------------------------------------------------------

        // LOAD PROFILE

        async loadEmployeeProfile(email) {

            const basicAuth = sessionStorage.getItem("basicAuth");

            const response = await fetch(
                `/odata/v4/employee/Employee?$filter=email eq '${email}'`,
                {
                    headers: {
                        "Authorization": `Basic ${basicAuth}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error?.message || "Failed to load profile"
                );
            }

            if (!data.value || data.value.length === 0) {
                throw new Error("Employee not found");
            }

            const employee = data.value[0];

            this.getView().setModel(
                new JSONModel(employee),
                "profile"
            );
        },
        //----------------------------------------------------------------------------------------------------

        // LOAD DASHBOARD
        async loadDashboard(role) {

            const basicAuth = sessionStorage.getItem("basicAuth");

            const response = await fetch(
                "/odata/v4/leave/getDashboard",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Basic ${basicAuth}`
                    },
                    body: JSON.stringify({})
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error?.message || "Failed to load dashboard"
                );
            }

            const dashboard = data;

            // Hide both first
            this.byId("managerDashboard").setVisible(false);
            this.byId("hrDashboard").setVisible(false);

            // Manager Dashboard
            if (role === "Manager") {

                this.byId("managerDashboard").setVisible(true);

                this.byId("teamSizeValue")
                    .setText(dashboard.teamSize ?? 0);

                this.byId("pendingApprovalsValue")
                    .setText(dashboard.pendingApprovals ?? 0);

                this.byId("upcomingHolidaysValue")
                    .setText(dashboard.upcomingHolidays ?? 0);
            }

            // HR Dashboard
            else if (role === "HR") {

                this.byId("hrDashboard").setVisible(true);

                this.byId("totalEmployeesValue")
                    .setText(dashboard.totalEmployees ?? 0);

                this.byId("activeEmployeesValue")
                    .setText(dashboard.activeEmployees ?? 0);

                this.byId("inactiveEmployeesValue")
                    .setText(dashboard.inactiveEmployees ?? 0);

                this.byId("pendingLeavesValue")
                    .setText(dashboard.pendingLeaves ?? 0);

                this.byId("approvedLeavesValue")
                    .setText(dashboard.approvedLeaves ?? 0);

                this.byId("rejectedLeavesValue")
                    .setText(dashboard.rejectedLeaves ?? 0);

                this.byId("cancelledLeavesValue")
                    .setText(dashboard.cancelledLeaves ?? 0);

                this.byId("upcomingHolidaysVal")
                    .setText(dashboard.upcomingHolidays ?? 0);
            }
        },
        //-----------------------------------------------------------------------------------------------------------

        // LOAD LEAVES

        async loadLeaves() {

            const user = JSON.parse(
                sessionStorage.getItem("user")
            );

            const basicAuth = sessionStorage.getItem("basicAuth");

            // First find current employee
            const employeeResponse = await fetch(
                `/odata/v4/employee/Employee?$filter=email eq '${user.email}'`,
                {
                    headers: {
                        "Authorization": `Basic ${basicAuth}`
                    }
                }
            );

            const employeeData = await employeeResponse.json();

            if (!employeeResponse.ok) {
                throw new Error(
                    employeeData.error?.message ||
                    "Failed to load employee"
                );
            }

            const employee = employeeData.value[0];

            if (!employee) {
                throw new Error("Employee not found");
            }

            // Get leaves
            const leaveResponse = await fetch(
                `/odata/v4/leave/Leave?$filter=employee_ID eq ${employee.ID}`,
                {
                    headers: {
                        "Authorization": `Basic ${basicAuth}`
                    }
                }
            );

            const leaveData = await leaveResponse.json();

            if (!leaveResponse.ok) {
                throw new Error(
                    leaveData.error?.message ||
                    "Failed to load leaves"
                );
            }

            const leaves = leaveData.value || [];

            // Get approver names
            for (const leave of leaves) {

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

                        const approver =
                            await approverResponse.json();

                        leave.approverName =
                            approver.name;
                    }
                }
            }

            this.getView().setModel(
                new JSONModel({
                    value: leaves
                }),
                "leaves"
            );
        },
        //-----------------------------------------------------------------------------------------------------------

        onSelectionChange(oEvent) {

            const selectedItem =
                oEvent.getParameter("listItem");

            this.byId("managerHrCancelButton")
                .setEnabled(!!selectedItem);
        },
        //---------------------------------------------------------------------------------------------------------

        // APPLY LEAVE BUTTON

        onClickApply() {

            this.byId("managerHrApplyLeaveDialog")
                .open();
        },
        //-------------------------------------------------------------------------------------------------

        // SUBMIT APPLY LEAVE

        async onApplyLeave() {

            const leaveType =
                this.byId("managerHrSelectLeaveType")
                    .getSelectedKey();

            const startDate =
                this.byId("LeaveStartDate")
                    .getValue();

            const endDate =
                this.byId("LeaveEndDate")
                    .getValue();

            const reason =
                this.byId("LeaveReason")
                    .getValue();

            if (!leaveType || !startDate ||
                !endDate || !reason) {

                MessageBox.error(
                    "Please fill all fields"
                );

                return;
            }

            try {

                const basicAuth =
                    sessionStorage.getItem("basicAuth");

                const response = await fetch(
                    "/odata/v4/leave/Leave",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Basic ${basicAuth}`
                        },

                        body: JSON.stringify({
                            leaveType: leaveType,
                            startDate: startDate,
                            endDate: endDate,
                            reason: reason
                        })
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error?.message ||
                        "Failed to apply leave"
                    );
                }

                MessageToast.show(
                    "Leave applied successfully"
                );

                this.byId(
                    "managerHrApplyLeaveDialog"
                ).close();

                this.resetApplyLeaveDialog();

                await this.loadLeaves();

            } catch (error) {

                console.error(error);

                MessageBox.error(
                    error.message
                );
            }
        },
        //--------------------------------------------------------------------------------------------------------------

        // Cancel Leave

        onCancelButton() {

            this.byId(
                "managerHrApplyLeaveDialog"
            ).close();

            this.resetApplyLeaveDialog();
        },


        // =========================
        // RESET FORM
        // =========================
        resetApplyLeaveDialog() {

            this.byId(
                "managerHrSelectLeaveType"
            ).setSelectedKey("");

            this.byId(
                "LeaveStartDate"
            ).setValue("");

            this.byId(
                "LeaveEndDate"
            ).setValue("");

            this.byId(
                "LeaveReason"
            ).setValue("");
        },


        // =========================
        // CANCEL LEAVE
        // =========================
        async onClickCancel() {

            const table =
                this.byId("managerHrLeaveTable");

            const selectedItem =
                table.getSelectedItem();

            if (!selectedItem) {
                return;
            }

            const leave =
                selectedItem
                    .getBindingContext("leaves")
                    .getObject();

            // Frontend validation
            if (leave.status !== "pending") {

                MessageBox.error(
                    `Only pending leaves can be cancelled. Current status: ${leave.status}`
                );

                return;
            }

            try {

                const basicAuth =
                    sessionStorage.getItem("basicAuth");

                const response = await fetch(
                    "/odata/v4/leave/cancelLeave",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Basic ${basicAuth}`
                        },

                        body: JSON.stringify({
                            ID: leave.ID
                        })
                    }
                );


                if (!response.ok) {

                    const data =
                        await response.json();

                    throw new Error(
                        data.error?.message ||
                        "Failed to cancel leave"
                    );
                }

                MessageToast.show(
                    "Leave cancelled successfully"
                );

                await this.loadLeaves();

                table.removeSelections(true);

                this.byId(
                    "managerHrCancelButton"
                ).setEnabled(false);

            } catch (error) {

                console.error(error);

                MessageBox.error(
                    error.message
                );
            }
        }

    });
});