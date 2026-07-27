import cds from '@sap/cds';

export default cds.service.impl(function () {
    const { Leave } = this.entities;
    const { Employee } = cds.entities('empmgmt');
    function isValidDate(value) {
        return !Number.isNaN(new Date(value).getTime());
    }
    function normalizeDate(value) {
        return new Date(value).toISOString().slice(0, 10);
    }

    this.before('CREATE', Leave, async (req) => {

        const tx = cds.transaction(req);

        const employee = await tx.run(
            SELECT.one.from(Employee).where({ email: req.user.id })
        );

        if (!employee) {
            return req.reject(404, "User not found.");
        }
        
        if (employee.status !== 'active') {
            return req.reject(400, "Employee not active.");
        }
        
        const startDate = req.data.startDate;
        const endDate = req.data.endDate;
        
        if (!startDate || !endDate) {
            return req.reject(400, "Either start or end date is missing");
        }
        
        if (!isValidDate(startDate) || !isValidDate(endDate)) {
            return req.reject(400, "Incorrect start or end date")
        }
        
        const normalizedStartDate = normalizeDate(startDate);
        const normalizedEndDate = normalizeDate(endDate);
        
        if (normalizedEndDate < normalizedStartDate) {
            return req.reject(400, "End date can't be before start date.")
        }
        
        req.data.employee = {
            ID: employee.ID
        };
        
        if (req.user.is('Employee')) {

            const managerExists = await tx.run(
                SELECT.one.from(Employee).where({ ID: employee.manager_ID })
            );

            if (!managerExists ) {
                return req.reject(404, "Manager not found");
            }

            req.data.approver = {
                ID: employee.manager_ID
            };
        }

        if (req.user.is('Manager')) {
            if (!employee.manager_ID) {
                return req.reject(404, "Manager not found");
            }

            const hrExists = await tx.run(
                SELECT.one.from(Employee).where({ ID: employee.manager_ID })
            );

            if (!hrExists) {
                return req.reject(404, "Manager not found");
            }
            if (hrExists.role === 'HR' ) {

                req.data.approver = {
                    ID: employee.manager_ID
                }
            } else{
                req.reject(404,"Aprrover is not HR")
            }

        }

        if (req.user.is('HR')) {

            const anotherHr = await tx.run(
                SELECT.one.from(Employee).where({ role: 'HR'}).where('email !=', req.user.id)
            );

            if (!anotherHr) {
                return req.reject(404, "No other HR found.");
            }

            req.data.approver = {

                ID: anotherHr.ID
            }
        }

        if (!req.data.approver) {
            return req.reject(404, "Approver not found")
        }

        req.data.status = 'pending';
        req.data.appliedOn = new Date().toISOString();


    });
});