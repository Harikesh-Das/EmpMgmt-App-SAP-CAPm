using {empmgmt as db} from '../db/schema';

/* Custom Types */
type LoginRequest {
    email    : String(255);
    password : String;
}

type LoginResponse {
    
    
    email: String(255);
    role  : db.EmployeeRole;
}
//----------------------------------------------------

/* Service Declaration */
service LoginService {
    action login(credentials: LoginRequest)   returns LoginResponse;
}
