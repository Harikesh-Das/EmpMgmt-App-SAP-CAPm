import cds from "@sap/cds";

import bcrypt from 'bcrypt';

export default cds.service.impl(function () {

    /* Access Entities */
    const { Employee, Leave, LeaveBalance } = this.entities;
    //-----------------------------------------------------------------------------------------

    /* Helper Funtions */
    async function getCurrentEmployee(tx, req) {
        return await tx.run(
            SELECT.one.from(Employee).where({ email: req.user.id })
        )
    }
    //---------------------------------------------------------------------------

    /* View Employee Handler */
    this.on("READ", Employee, async (req) => {

        const tx = cds.transaction(req);

        if (req.user.is("HR")) {
            return tx.run(
                req.query
            );
        }

        if (req.user.is("Manager")) {

            const manager = await tx.run(
                SELECT.one
                    .from(Employee)
                    .where({
                        email: req.user.id
                    })
            );

            if (!manager) {
                return req.reject(403, "Manager record not found.");
            }

            return tx.run(
                req.query
                    .where({
                        ID: manager.ID
                    })
                    .or({
                        manager_ID: manager.ID
                    })
            );
        }

        if (req.user.is("Employee")) {

            const employee = await tx.run(
                SELECT.one.from(Employee).where({ email: req.user.id })
            )
            if (!employee) {
                return req.reject(404, "Not found");
            }
            return tx.run(
                req.query
                    .where({
                        ID: employee.ID
                    })

            );
        }

        return req.reject(403, "Forbidden");

    });
    //-------------------------------------------------------------------------------------------------

    /* Create Employee Handler */
    this.on("CREATE", Employee, async (req) => {

        if (!req.user.is("HR")) {
            return req.reject(403, "Forbidden");
        }

        const tx = cds.transaction(req);

        const data = { ...req.data };

        const empIdExists = await tx.run(
            SELECT.one.from(Employee).where({ empId: data.empId })
        );

        if (empIdExists) {
            return req.reject(400, "Employee ID already exists.");
        }

        const emailExists = await tx.run(
            SELECT.one.from(Employee).where({ email: data.email })
        );

        if (emailExists) {
            return req.reject(400, "Email already exists.");
        }

        if (data.manager_ID) {

            const manager = await tx.run(
                SELECT.one
                    .from(Employee)
                    .where({ ID: data.manager_ID })
            );

            if (!manager) {
                return req.reject(400, "Manager not found.");
            }

            if (manager.role !== "manager" && manager.role !== "hr") {
                return req.reject(400, "Manager must have Manager or HR role.");
            }
        }

        data.passwordHash = await bcrypt.hash("Password@123", 12);

        const createdEmployee = await tx.run(
            INSERT.into(Employee).entries(data)
        );

        await tx.run(
            INSERT.into(LeaveBalance).entries({
                employee_ID: createdEmployee.ID
            })
        );

        return createdEmployee;

    });
    //--------------------------------------------------------------------------------------------

    /* Update Employee Handler */
    this.on("UPDATE", Employee, async (req) => {

        if (!req.user.is("HR")) {
            return req.reject(403, "Forbidden");
        }

        const tx = cds.transaction(req);

        const ID = req.params[0].ID;

        const employee = await tx.run(
            SELECT.one
                .from(Employee)
                .where({ ID })
        );

        if (!employee) {
            return req.reject(404, "Employee not found.");
        }

        const data = { ...req.data };

        if (data.email && data.email !== employee.email) {

            const emailExists = await tx.run(
                SELECT.one
                    .from(Employee)
                    .where({ email: data.email })
            );

            if (emailExists) {
                return req.reject(400, "Email already exists.");
            }
        }

        if (data.empId && data.empId !== employee.empId) {

            const empIdExists = await tx.run(
                SELECT.one
                    .from(Employee)
                    .where({ empId: data.empId })
            );

            if (empIdExists) {
                return req.reject(400, "Employee ID already exists.");
            }
        }

        if (data.manager_ID) {

            if (data.manager_ID === ID) {
                return req.reject(400, "Employee cannot be their own manager.");
            }

            const manager = await tx.run(
                SELECT.one
                    .from(Employee)
                    .where({ ID: data.manager_ID })
            );

            if (!manager) {
                return req.reject(400, "Manager not found.");
            }

            if (manager.role !== "manager" && manager.role !== "hr") {
                return req.reject(400, "Manager must have Manager or HR role.");
            }
        }

        delete data.passwordHash;

        await tx.run(
            UPDATE(Employee)
                .set(data)
                .where({ ID })
        );

        return tx.run(
            SELECT.one
                .from(Employee)
                .where({ ID })
        );

    });
    //------------------------------------------------------------------------------------------

    /* Delete Employee Handler */
    this.on("DELETE", Employee, async (req) => {

        if (!req.user.is("HR")) {
            return req.reject(403, "Forbidden");
        }

        const tx = cds.transaction(req);

        const ID = req.params[0].ID;

        const employee = await tx.run(
            SELECT.one
                .from(Employee)
                .where({ ID })
        );

        if (!employee) {
            return req.reject(404, "Employee not found.");
        }

        await tx.run(
            UPDATE(Employee)
                .set({ manager_ID: null })
                .where({ manager_ID: ID })
        );

        await tx.run(
            DELETE.from(LeaveBalance)
                .where({ employee_ID: ID })
        );

        await tx.run(
            DELETE.from(Leave)
                .where({ employee_ID: ID })
        );

        await tx.run(
            DELETE.from(Employee)
                .where({ ID })
        );

        return {
            message: "Employee deleted successfully."
        };

    });
    //---------------------------------------------------------------------------------

    /* Image upload handler */
        this.on("uploadProfileImage", async (req) => {

        const tx = cds.transaction(req);

        const { ID, image, fileName, mimeType } = req.data;

        const imageBuffer = Buffer.from(image, "base64");

        // Input Validation
        if (!ID || !image || !fileName || !mimeType) {
            return req.reject(400, "All fields are required");
        }

        // Employee Validation
        const employee = await tx.run(
            SELECT.one.from(Employee).where({ ID })
        );

        if (!employee) {
            return req.reject(404, "Employee not found");
        }

        // Authorization
        const currentEmployee = await getCurrentEmployee(tx, req);

        if (!req.user.is("HR") && currentEmployee.ID !== ID) {
            return req.reject(403, "Unauthorized");
        }

        // Update Image
        await tx.run(
            UPDATE(Employee)
                .set({
                    profileImage: image,
                    fileName: fileName,
                    mimeType: mimeType
                })
                .where({ ID })
        );

        return {
            message: "Profile image uploaded successfully"
        };

    });


});