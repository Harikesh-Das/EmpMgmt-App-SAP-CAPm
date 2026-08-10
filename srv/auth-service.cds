using {empmgmt as db} from '../db/schema';

//Custom Types
type LoginRequest {
    email    : String(255);
    password : String;
}

type LoginResponse {
    token : String;
    empId : String(10);
    name  : String(100);
    role  : db.EmployeeRole;
}
//-----------------------------------------------------

service AuthService {

    // Auth Actions
    action login(credentials: LoginRequest)   returns LoginResponse;

    action refreshToken(refreshToken: String) returns LoginResponse;

    action logout(refreshToken: String)       returns String;


}
