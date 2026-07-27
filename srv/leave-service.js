import cds from '@sap/cds';

export default cds.service.impl(function () {
    // define Leave entity from current service
    const { Leave } = this.entities;

    // define Employee, LeaveBalance entities from empmgmt service
    const { Employee, Leave, LeaveBalance } = cds.entities('empmgmt');

    // validate if the provided value is a date
    function isValidDate(value) {
        return !Number.isNaN(new Date(value).getTime());
    }

    // normalize the date to YYYY-MM-DD format
    function normalizeDate(value) {
        return new Date(value).toISOString().slice(0, 10);
    }


    function getInclusiveDayCount(sDate, eDate) {
        const start = new Date(sDate);
        const end = new Date(eDate);
        const milliseconds = end.getTime() - start.getTime();
        return Math.floor(milliseconds / (1000 * 60 * 60 * 24)) + 1;
    }

    this.before('CREATE', Leave, async (req) => {

        // start a transaction for the request
        const tx = cds.transaction(req);

        // get employee record for the current user
        const employee = await tx.run(
            SELECT.one.from(Employee).where({ email: req.user.id })
        );

        // reject if employee does not exist
        if (!employee) {
            return req.reject(404, "User not found.");
        }

        // reject if employee is not active
        if (employee.status !== 'active') {
            return req.reject(400, "Employee not active.");
        }

        // read start and end dates from request data
        const startDate = req.data.startDate;
        const endDate = req.data.endDate;

        // reject if start or end date is missing
        if (!startDate || !endDate) {
            return req.reject(400, "Either start or end date is missing");
        }

        // reject if either date is invalid
        if (!isValidDate(startDate) || !isValidDate(endDate)) {
            return req.reject(400, "Incorrect start or end date")
        }

        // normalize dates for comparison
        const normalizedStartDate = normalizeDate(startDate);
        const normalizedEndDate = normalizeDate(endDate);

        // reject if end date is before start date
        if (normalizedEndDate < normalizedStartDate) {
            return req.reject(400, "End date can't be before start date.")
        }



        const balance = await tx.run(
            SELECT.one.from(LeaveBalance).where({ employee: employee.ID })
        );


        if (!balance) {
            return req.reject(404, "No balance record found");
        }
        else {
            console.log(balance)

        }

        const requestedDays = getInclusiveDayCount(normalizedStartDate, normalizedEndDate);


        if (req.data.leaveType === 'casual') {
            if ((balance.casualBalanceRemaining < requestedDays)) {
                return req.reject(400, "Insufficient leave balance")
            }
        };


        if (req.data.leaveType === 'sick') {
            if ((balance.sickBalanceRemaining < requestedDays)) {
                return req.reject(400, "Insufficient leave balance")
            }
        };


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

        // assign the current employee to the leave record
        req.data.employee = {
            ID: employee.ID
        };

        // handle Employee user role logic
        if (req.user.is('Employee')) {

            // confirm manager exists for employee
            const managerExists = await tx.run(
                SELECT.one.from(Employee).where({ ID: employee.manager_ID })
            );

            // reject if manager not found
            if (!managerExists) {
                return req.reject(404, "Manager not found");
            }

            // set approver to manager
            req.data.approver = {
                ID: employee.manager_ID
            };
        }

        // handle Manager user role logic
        if (req.user.is('Manager')) {
            // reject if manager has no manager reference
            if (!employee.manager_ID) {
                return req.reject(404, "Manager not found");
            }

            // confirm the manager's manager is HR
            const hrExists = await tx.run(
                SELECT.one.from(Employee).where({ ID: employee.manager_ID })
            );

            // reject if HR not found
            if (!hrExists) {
                return req.reject(404, "Manager not found");
            }
            // assign approver if HR exists
            if (hrExists.role === 'HR') {

                req.data.approver = {
                    ID: employee.manager_ID
                }
            } else {
                return req.reject(404, "Aprrover is not HR")
            }

        }

        // handle HR user role logic
        if (req.user.is('HR')) {

            // find another HR employee for approval
            const anotherHr = await tx.run(
                SELECT.one.from(Employee).where({ role: 'HR' }).where('email !=', req.user.id)
            );

            // reject if no other HR exists
            if (!anotherHr) {
                return req.reject(404, "No other HR found.");
            }

            // set approver to other HR
            req.data.approver = {
                ID: anotherHr.ID
            }
        }

        // reject if no approver was assigned
        if (!req.data.approver) {
            return req.reject(404, "Approver not found")
        }

        // set leave status and applied date
        req.data.status = 'pending';
        req.data.appliedOn = new Date().toISOString();


    });
});