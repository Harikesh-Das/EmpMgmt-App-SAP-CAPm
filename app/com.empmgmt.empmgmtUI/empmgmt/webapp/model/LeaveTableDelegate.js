
sap.ui.define([
    "sap/ui/mdc/odata/v4/TableDelegate"
], function (TableDelegate) {
    "use strict";

    const LeaveTableDelegate = Object.assign({}, TableDelegate);

    LeaveTableDelegate.fetchProperties = function (oTable) {
        return Promise.resolve([
            {
                key: "employee",
                path: "employee/empId",
                label: "Employee ID",
                dataType: "sap.ui.model.odata.type.String"
            },
            {
                key: "approver",
                path: "approver/name",
                label: "Approver",
                dataType: "sap.ui.model.odata.type.String"
            },
            {
                key: "leaveType",
                path: "leaveType",
                label: "Leave Type",
                dataType: "sap.ui.model.odata.type.String"
            },
            {
                key: "startDate",
                path: "startDate",
                label: "Start Date",
                dataType: "sap.ui.model.odata.type.Date"
            },
            {
                key: "endDate",
                path: "endDate",
                label: "End Date",
                dataType: "sap.ui.model.odata.type.Date"
            },
            {
                key: "status",
                path: "status",
                label: "Status",
                dataType: "sap.ui.model.odata.type.String"
            },
            {
                key: "appliedOn",
                path: "appliedOn",
                label: "Applied On",
                dataType: "sap.ui.model.odata.type.DateTimeOffset"
            },
            {
                key: "approvedOn",
                path: "approvedOn",
                label: "Approved On",
                dataType: "sap.ui.model.odata.type.DateTimeOffset"
            },
        ]);
    };
    return LeaveTableDelegate;
})