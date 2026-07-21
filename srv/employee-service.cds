using {empmgmt as db} from '../db/schema';


service EmployeeService{
    entity Employee as projection on db.Employee;
}