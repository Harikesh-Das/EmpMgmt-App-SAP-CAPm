import cds from "@sap/cds";

export default cds.service.impl(function () {

    const { Employee } = this.entities;

    this.on("READ", Employee, async (req) => {

        if (req.user.is("HR")) {
            return SELECT.from(Employee);
        }

        if (req.user.is("Manager")) {

            const manager = await SELECT.one
                .from(Employee)
                .where({
                    email: req.user.id
                });

            if (!manager) {
                req.reject(403, "Manager record not found.");
            }

            return SELECT
                .from(Employee)
                .where({
                    ID: manager.ID
                })
                .or({
                    manager_ID: manager.ID
                });
        }

        if (req.user.is("Employee")) {

            return SELECT.one
                .from(Employee)
                .where({
                    email: req.user.id
                });
        }

        req.reject(403, "Forbidden");

    });

});