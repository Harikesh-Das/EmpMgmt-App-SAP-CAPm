import cds from '@sap/cds';
import verifyToken from './lib/auth.js';

export default cds.service.impl(async function () {
    const { Employee } = this.entities;

    this.before('READ', Employee, async (req) => {
        
        console.log(req.user);
        

    })
})