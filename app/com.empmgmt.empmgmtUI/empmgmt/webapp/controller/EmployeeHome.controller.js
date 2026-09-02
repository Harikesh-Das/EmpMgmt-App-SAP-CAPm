sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], (Controller, MessageToast, JSONModel) => {
    "use strict";

    return Controller.extend("empmgmt.controller.EmployeeHome", {

        onInit() {
            this.loadEmployeeProfile();
            this.loadLeaves();
        },

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
}


    });
});