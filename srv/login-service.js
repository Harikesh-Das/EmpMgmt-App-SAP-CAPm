import cds from "@sap/cds";

export default cds.service.impl(function () {

    /* Login Validation */
    this.before("login", (req) => {
        const { email, password } = req.data.credentials;

        if (!email || !password) {
            req.reject(400, "Email and password are required.");
        }
    });
    //------------------------------------------------------------------------------------------------------------

    /* Login Handler */
    this.on("login", async (req) => {

        const { email, password } = req.data.credentials;

        const users = cds.env.requires.auth.users;
        const user = users[email];

        if (!user) {
            req.reject(401, "Invalid email or password.");
        }

        if (user.password !== password) {
            req.reject(401, "Invalid email or password.");
        }



        const role = Object.keys(user.roles).find(role => ["Employee", "Manager", "HR"].includes(role));

        if (!role) {
            req.reject(403, "No valid role assigned.");
        }


        return {
            email: email,
            role: role
        };
    });

});