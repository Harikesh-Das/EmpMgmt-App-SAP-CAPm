import cds from '@sap/cds';
import { message } from '@sap/cds/lib/log/cds-error';



export default cds.service.impl(function () {
    /* Access Entites */
    const { Leave } = this.entities;
    const { Employee, LeaveBalance, Holiday } = cds.entities('empmgmt');
    //-------------------------------------------------------------------------------

    /* Helper Fucntions */
    function isValidDate(value) {
        return !Number.isNaN(new Date(value).getTime());
    }

    function normalizeDate(value) {
        return new Date(value).toISOString().slice(0, 10);
    }

    function getInclusiveDayCount(sDate, eDate) {
        const start = new Date(sDate);
        const end = new Date(eDate);
        const milliseconds = end.getTime() - start.getTime();
        return Math.floor(milliseconds / (1000 * 60 * 60 * 24)) + 1;
    }

    async function getCurrentEmployee(tx, req) {
        return await tx.run(
            SELECT.one.from(Employee).where({ email: req.user.id })
        )
    }

    async function getCurrentLeave(tx, req) {
        return await tx.run(
            SELECT.one.from(Leave).where({ ID: req.data.ID })
        )
    }

    async function leaveValidations(req, leave, employee) {

        if (!leave) return req.reject(404, "Leave not found")

        if (!leave.approver_ID) return req.reject(400, 'There is no approver to the leave')

        if (leave.approver_ID !== employee.ID && !req.user.is('HR')) return req.reject(403, 'You cannot act on this leave');

        if (employee.status !== 'active') return req.reject(400, 'Approver Inactive')

        if (leave.status !== 'pending') {
            return req.reject(
                400,
                `Only pending leaves can be processed. Current status: ${leave.status}`
            );
        }
    }
    //--------------------------------------------------------------------

    /* Create Leave request Handler */
    this.before('CREATE', Leave, async (req) => {
        const tx = cds.transaction(req);

        //Employee Validation
        const employee = await getCurrentEmployee(tx, req);
        if (!employee) return req.reject(404, "User not found.");
        if (employee.status !== 'active') return req.reject(400, "Employee not active.");

        //Dates Validation
        const startDate = req.data.startDate;
        const endDate = req.data.endDate;
        if (!startDate || !endDate) return req.reject(400, "Either start or end date is missing");
        if (!isValidDate(startDate) || !isValidDate(endDate)) return req.reject(400, "Incorrect start or end date");

        const normalizedStartDate = normalizeDate(startDate);
        const normalizedEndDate = normalizeDate(endDate);
        if (normalizedEndDate < normalizedStartDate) return req.reject(400, "End date can't be before start date.");

        // Check Leave Balance
        const balance = await tx.run(
            SELECT.one.from(LeaveBalance).where({ employee: employee.ID })
        );
        if (!balance) return req.reject(404, "No balance record found");

        const requestedDays = getInclusiveDayCount(normalizedStartDate, normalizedEndDate);


        if (req.data.leaveType === 'casual') {
            if ((balance.casualBalanceRemaining < requestedDays)) {
                return req.reject(400, "Insufficient leave balance")
            }
        };


        if (req.data.leaveType === 'sick' && balance.sickBalanceRemaining < requestedDays) {
            return req.reject(400, "Insufficient leave balance")
        }

        //Check Overlapping Leaves
        const overlappingLeave = await tx.run(
            SELECT.one
                .from(Leave)
                .where({ employee: employee.ID })
                .where('status !=', 'cancelled')
                .where('status !=', 'rejected')
                .where('startDate <=', normalizedEndDate)
                .where('endDate >=', normalizedStartDate)
        );

        if (overlappingLeave) {
            return req.reject(
                400,
                "Leave dates overlap with an existing pending or approved leave."
            );
        }
        //Replaces the employee field in Leave with employee ID
        req.data.employee = { ID: employee.ID };

        // Employee Leave Application
        if (req.user.is('Employee')) {
            const managerExists = await tx.run(
                SELECT.one.from(Employee).where({ ID: employee.manager_ID })
            );
            if (!managerExists) return req.reject(404, "Manager not found");
            req.data.approver = { ID: employee.manager_ID };
        }

        // Manager Leave Application
        if (req.user.is('Manager')) {
            if (!employee.manager_ID) return req.reject(404, "Manager not found");
            const hrExists = await tx.run(
                SELECT.one.from(Employee).where({ ID: employee.manager_ID })
            );
            if (!hrExists) return req.reject(404, "Manager not found");
            if (hrExists.role === 'HR') {
                req.data.approver = { ID: employee.manager_ID };
            } else {
                return req.reject(404, "Approver is not HR")
            }
        }

        //HR Leave Application
        if (req.user.is('HR')) {
            const anotherHr = await tx.run(
                SELECT.one.from(Employee).where({ role: 'HR' }).where('email !=', req.user.id)
            );
            if (!anotherHr) return req.reject(404, "No other HR found.");
            req.data.approver = { ID: anotherHr.ID };
        }

        if (!req.data.approver) return req.reject(404, "Approver not found")
        req.data.status = 'pending';
        req.data.appliedOn = new Date().toISOString();
    });
    //----------------------------------------------------------------------------------------

    /* View Leave Handler */
    this.before('READ', Leave, async (req) => {
        const tx = cds.transaction(req);

        const employee = await getCurrentEmployee(tx, req);

        if (!employee) {
            return req.reject(404, "User not found.");
        }


        if (req.user.is('HR')) {
            return;
        }

        if (req.user.is('Manager')) {
            const managerEmployees = await tx.run(
                SELECT.from(Employee)
                    .columns('ID')
                    .where({ manager_ID: employee.ID })
            )

            const employeeIDs = managerEmployees.map(emp => emp.ID);
            employeeIDs.push(employee.ID);
            req.query.where('employee_ID in', employeeIDs);
            return;

        }

        if (req.user.is('Employee')) {
            req.query.where({
                employee_ID: employee.ID
            });
            return;
        }
    });
    //--------------------------------------------------------------------------------------

    /* Approve Leave Handler */
    this.on('approveLeave', async (req) => {
        const tx = cds.transaction(req);

        const employee = await getCurrentEmployee(tx, req);

        const leave = await getCurrentLeave(tx, req);

        //Leave Validations
        await leaveValidations(req, leave, employee);

        //Leave Balance Validation
        const balance = await tx.run(
            SELECT.one
                .from(LeaveBalance)
                .where({ employee: leave.employee_ID })
        );
        if (!balance) return req.reject(404, "Leave balance not found.");

        const leaveDays = getInclusiveDayCount(
            leave.startDate,
            leave.endDate
        );

        // Updating Casual Leaves in LeaveBalance
        if (leave.leaveType === 'casual') {

            if (balance.casualBalanceRemaining < leaveDays) return req.reject(400, "Insufficient leave balance.");

            await tx.run(
                UPDATE(LeaveBalance)
                    .set({
                        casualBalanceRemaining:
                            balance.casualBalanceRemaining - leaveDays
                    })
                    .where({ employee: leave.employee_ID })
            );
        }

        // Updating Sick Leaves in LeaveBalance
        if (leave.leaveType === 'sick') {

            if (balance.sickBalanceRemaining < leaveDays) return req.reject(400, "Insufficient leave balance");

            await tx.run(
                UPDATE(LeaveBalance)
                    .set({
                        sickBalanceRemaining:
                            balance.sickBalanceRemaining - leaveDays
                    })
                    .where({ employee: leave.employee_ID })
            );
        }

        //Updating Approval Status in Leave
        await tx.run(
            UPDATE(Leave)
                .set({
                    status: 'approved',
                    approvedOn: new Date().toISOString()
                })
                .where({ ID: leave.ID })
        );

        return {
            message: "Leave Approved Successfully"
        }
    });

    /* Reject Leave Handler */
    this.on('rejectLeave', async (req) => {
        const tx = cds.transaction(req);

        const employee = await getCurrentEmployee(tx, req);

        const leave = await getCurrentLeave(tx, req);

        //Leave Validatdion
        await leaveValidations(req, leave, employee);

        // Updating Rejection in Leave
        await tx.run(
            UPDATE(Leave).
                set({
                    status: 'rejected',
                    approvedOn: new Date().toISOString(),

                })
                .where({ ID: leave.ID })
        )

        return {
            message: "Leave Rejected Successfully"
        }

    });

    /* Cancel Leave Handler */
    this.on('cancelLeave', async (req) => {

        const tx = cds.transaction(req);

        // Employee Validation
        const employee = await getCurrentEmployee(tx, req);

        if (!employee) return req.reject(404, "User not found");

        if (employee.status !== 'active') return req.reject(400, 'User Inactive');

        //Leave Validatdion
        const leave = await getCurrentLeave(tx, req);

        if (!leave) return req.reject(404, "Leave not found");

        if (leave.employee_ID !== employee.ID) return req.reject(403, "You can only cancel your own leave")

        if (leave.status !== 'pending') {
            return req.reject(
                400,
                `Only pending leaves can be cancelled. Current status: ${leave.status}`
            );
        }


        // Updating Cancellation in Leave
        await tx.run(
            UPDATE(Leave)
                .set({
                    status: 'cancelled'
                })
                .where({ ID: leave.ID })

        );

        return {
            message: "Cancelled Leave"
        }
    });
    //----------------------------------------------------------------------------

    /* Create holiday Handler */
    this.before('CREATE', Holiday, async (req) => {

        const tx = cds.transaction(req);

        if (req.user.is('HR')) {

            const { holidayName, holidayDate } = req.data;

            if (!holidayName || !holidayDate) return req.reject(400, "Holiday either has no name or no date");

            if (isValidDate(holidayDate) === false) {
                return req.reject(400, 'Either date does not exist or is invalid')
            }

            const holidayExists = await tx.run(
                SELECT.one.from(Holiday).where({ holidayDate: holidayDate })
            );

            if (holidayExists) return req.reject(400, " A holiday already exists");





        } else {
            return req.reject(403, "Unauthorized")
        }
    });

});