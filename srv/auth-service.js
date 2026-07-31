import cds from "@sap/cds";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";

export default cds.service.impl(async function () { 

    /* Access Entities */
    const { Employee, Session } = cds.entities("empmgmt");

    /* Login Validation */
    this.before("login", (req) => {
        const { email, password } = req.data.credentials;

        if (!email || !password) {
            req.reject(400, "Email and password are required.");
        }
    });
//----------------------------------------------------------------------------------------------------

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

        const sessionID = cds.utils.uuid();

        const accessToken = jwt.sign(
            {
                ID: employee.ID,
                empId: employee.empId,
                email: employee.email,
                role: employee.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN
            }
        );

        const refreshToken = jwt.sign(
            {
                sessionID,
                employeeID: employee.ID
            },
            process.env.JWT_REFRESH_SECRET,
            {
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
            }
        );

        const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

        const expiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        );

        await INSERT.into(Session).entries({
            ID: sessionID,
            employee_ID: employee.ID,
            refreshToken: refreshTokenHash,
            expiresAt
        });

        return {
            message: "Login successful.",
            accessToken,
            refreshToken,
            employee: {
                ID: employee.ID,
                empId: employee.empId,
                name: employee.name,
                email: employee.email,
                role: employee.role
            }
        };

    });
//--------------------------------------------------------------------------------------

    /* Refresh Token Handler */
    this.on("refreshToken", async (req) => {

        const { refreshToken } = req.data;

        if (!refreshToken) {
            req.reject(400, "Refresh token is required.");
        }

        let decoded;

        try {
            decoded = jwt.verify(
                refreshToken,
                process.env.JWT_REFRESH_SECRET
            );
        } catch {
            req.reject(401, "Invalid refresh token.");
        }

        const session = await SELECT.one
            .from(Session)
            .where({
                ID: decoded.sessionID
            });

        if (!session) {
            req.reject(401, "Session not found.");
        }

        const valid = await bcrypt.compare(
            refreshToken,
            session.refreshToken
        );

        if (!valid) {
            req.reject(401, "Invalid refresh token.");
        }

        if (new Date() > new Date(session.expiresAt)) {

            await DELETE.from(Session)
                .where({
                    ID: session.ID
                });

            req.reject(401, "Refresh token expired.");
        }

        const employee = await SELECT.one
            .from(Employee)
            .where({
                ID: decoded.employeeID
            });

        if (!employee) {
            req.reject(401, "Employee not found.");
        }

        const accessToken = jwt.sign(
            {
                ID: employee.ID,
                empId: employee.empId,
                email: employee.email,
                role: employee.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN
            }
        );

        const newRefreshToken = jwt.sign(
            {
                sessionID: session.ID,
                employeeID: employee.ID
            },
            process.env.JWT_REFRESH_SECRET,
            {
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
            }
        );

        const newHash = await bcrypt.hash(newRefreshToken, 12);

        const newExpiry = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        );

        await UPDATE(Session)
            .set({
                refreshToken: newHash,
                expiresAt: newExpiry
            })
            .where({
                ID: session.ID
            });

        return {
            accessToken,
            refreshToken: newRefreshToken
        };

    });
//--------------------------------------------------------------------------------------------

    /* Logout Handler */
    this.on("logout", async (req) => {

        const { refreshToken } = req.data;

        if (!refreshToken) {
            req.reject(400, "Refresh token is required.");
        }

        let decoded;

        try {
            decoded = jwt.verify(
                refreshToken,
                process.env.JWT_REFRESH_SECRET
            );
        } catch {
            req.reject(401, "Invalid refresh token.");
        }

        await DELETE.from(Session)
            .where({
                ID: decoded.sessionID
            });

        return {
            message: "Logout successful."
        };

    });

});