import cds from '@sap/cds';
import bcrypt from 'bcrypt';

export default cds.service.impl(function () {
    /* Access  Entities*/
    const { Employee } = cds.entities("empmgmt");

    /* Login Validation */
    this.before("login", (req) => {
        const { email, password } = req.data.credentials;

        if (!email || !password) {
            req.reject(400, "Email and password are required.");
        }
    });
    //------------------------------------------------------------------

    /* Login Handler */
    this.on("login", async (req) => {
        const { email, password } = req.data.credentials;
        const employee = await SELECT.one
            .from(Employee)
            .where({ email });

        if (!employee) {
            req.reject(401, "Invalid email or password.");
        }

        const passwordMatches = await bcrypt.compare(
            password,
            employee.passwordHash
        );

        if (!passwordMatches) {
            req.reject(401, "Invalid email or password.");
        }

        if (employee.status === "inactive") {
            req.reject(403, "Employee account is inactive.");
        }

        return{
            employee:{
                ID: employee.ID,
                empId: employee.empId,
                name: employee.name,
                email: employee.email,
                role: employee.role
            }
        }

    })
})